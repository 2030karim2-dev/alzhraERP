
import { createClient } from '@supabase/supabase-js';
import { Database } from '../core/database.types';
import { logger } from '../core/utils/logger';
import { useConnectionStore } from '../core/store/connectionStore';
import { STORAGE_KEYS } from '../core/constants';

// تكوين الاتصال من متغيرات البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Feature flags
export const AI_FEATURES_ENABLED = import.meta.env.VITE_ENABLE_AI_FEATURES === 'true';

// Validate URL format (should end with .supabase.co)
const isValidSupabaseUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

// ── Configuration guard ────────────────────────────────────────────────────────
// The app MUST fail loudly when Supabase is not configured instead of silently
// running on a mock client (which returned empty data / fake success and hid
// real integration failures). The mock client is kept ONLY for unit tests.
export const SUPABASE_CONFIG_ERROR: string | null = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'لم يتم إعداد الاتصال بقاعدة البيانات.\nانسخ ملف .env.example إلى .env واملأ قيمتي VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.';
  }
  if (!isValidSupabaseUrl(supabaseUrl)) {
    return 'عنوان Supabase غير صالح. يجب أن يكون بصيغة https://your-project.supabase.co';
  }
  return null;
})();

export const isSupabaseConfigured = SUPABASE_CONFIG_ERROR === null;

// Vitest runs with MODE='test' — the mock client is a unit-test-only fallback.
const isUnitTest = import.meta.env.MODE === 'test';

// ── Network circuit breaker ────────────────────────────────────────────────────
// When the Supabase host is unreachable (ISP outage, region issue, firewall),
// retrying EVERY in-flight request 3× turns a short hiccup into a self-sustaining
// request storm (thundering herd) that saturates the browser connection pool and
// delays recovery. After N consecutive network failures the circuit opens: every
// request fails fast (single attempt, no retry) until a request succeeds again.
const CIRCUIT_THRESHOLD = 3;      // consecutive network failures before opening
const CIRCUIT_RESET_MS = 30_000;  // cooldown before retries are allowed again
let consecutiveNetworkFailures = 0;
let circuitOpenedAt = 0;

const isCircuitOpen = (): boolean =>
  consecutiveNetworkFailures >= CIRCUIT_THRESHOLD &&
  Date.now() - circuitOpenedAt < CIRCUIT_RESET_MS;

const reportNetworkFailure = (): void => {
  consecutiveNetworkFailures += 1;
  if (consecutiveNetworkFailures === CIRCUIT_THRESHOLD) {
    circuitOpenedAt = Date.now();
    logger.warn('Supabase', `⚠️ Circuit open — ${CIRCUIT_THRESHOLD} consecutive network failures; failing fast for ${CIRCUIT_RESET_MS / 1000}s`);
  }
};

const reportNetworkSuccess = (): void => {
  if (consecutiveNetworkFailures >= CIRCUIT_THRESHOLD) {
    logger.info('Supabase', '✅ Network recovered — circuit closed');
  }
  consecutiveNetworkFailures = 0;
  circuitOpenedAt = 0;
};

// Custom fetch with timeout, bounded retry and circuit breaker
const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const MAX_RETRIES = 2;
  let lastError: Error | unknown;

  const skipRetry =
    (() => {
      const headers = options.headers;
      if (headers && typeof (headers as Record<string, string>).has === 'function') {
        // `Headers` instance
        return (headers as Headers).get('x-skip-network-retry') === '1';
      }
      return (headers as Record<string, string> | undefined)?.['x-skip-network-retry'] === '1';
    })();

  for (let i = 0; i <= MAX_RETRIES; i++) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      try {
        timeoutController.abort('timeout');
      } catch (_) { /* ignore */ }
    }, 45000);

    // Merge signals if options.signal exists
    let signal = timeoutController.signal;
    if (options.signal) {
      // If signal is already aborted, silently bail out
      if (options.signal.aborted) {
        clearTimeout(timeoutId);
        // Return a dummy response instead of throwing to prevent unhandled rejections
        // This happens during HMR and auth token refresh
        throw new DOMException('Request aborted', 'AbortError');
      }
      options.signal.addEventListener('abort', () => {
        try {
          timeoutController.abort(options.signal?.reason || 'signal-merge');
        } catch (_) { /* ignore */ }
      }, { once: true });
    }

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('network_offline');
      }

      const response = await fetch(url, {
        ...options,
        signal,
      });
      clearTimeout(timeoutId);

      // Notify store of success
      useConnectionStore.getState().reportSuccess();
      reportNetworkSuccess();

      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const err = error as Error & { name: string; message: string; reason?: string };
      const isTimeout = err.name === 'AbortError' && (err.message?.includes('timeout') || signal.reason === 'timeout');
      if (isTimeout) {
        useConnectionStore.getState().reportTimeout();
      } else if (err.name !== 'AbortError') {
        useConnectionStore.getState().reportFailure();
      }

      // Gracefully handle AbortErrors - these happen during:
      // 1. Supabase auth token refresh (internal signal abort)
      // 2. Vite HMR module reloads (component unmount mid-request)
      // 3. Navigation away during pending requests
      if (err.name === 'AbortError') {
        if (options.signal?.aborted) {
          throw err;
        }
        if (!err.message?.includes('timeout')) {
          throw err;
        }
      }

      const errorMessage = err.message?.toLowerCase() || '';
      const isOffline = errorMessage === 'network_offline';
      const isNetworkError =
        isOffline ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('failed to fetch') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('etimedout') ||
        error instanceof TypeError;

      // Offline → fail fast; retrying an unreachable network is pure waste.
      if (isOffline) {
        reportNetworkFailure();
        lastError = err;
        break;
      }

      if (isNetworkError) {
        reportNetworkFailure();
      }

      // Retry only while the circuit is closed and the request opted in.
      if (i < MAX_RETRIES && isNetworkError && !skipRetry && !isCircuitOpen()) {
        logger.warn('Supabase', `Request failed (network instability), retrying ${i + 1}/${MAX_RETRIES}...`, { attempt: i + 1 });

        const backoff = (Math.pow(2, i) * 1000) + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      lastError = err;
      break;
    }
  }

  throw lastError;
};

// Create a mock client for development without Supabase
const createMockClient = () => {
  return {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    },
    channel: () => ({
      on: () => ({
        subscribe: (cb?: (status: string) => void) => {
          cb?.('SUBSCRIBED');
          return { unsubscribe: () => { } };
        },
      }),
    }),
  };
};

// Export typed supabase client.
//  - Configured: real client.
//  - Unit tests (MODE='test'): mock client (declared, not silent).
//  - Missing/invalid config OUTSIDE tests: a placeholder client that is NEVER
//    used at runtime — index.tsx renders a setup-error screen instead, so the
//    app cannot silently run on fake/empty data.
export const supabase: ReturnType<typeof createClient<Database>> = (() => {
  if (isSupabaseConfigured) {
    return createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          storageKey: STORAGE_KEYS.AUTH_TOKEN,
        },
        global: {
          fetch: customFetch,
          headers: {
            'x-application-name': 'alzahra-smart-erp-v5-prod',
          },
        },
        db: {
          schema: 'public',
        },
        // Realtime channel subscribe timeout. A shorter timeout lets a dead socket
        // surface as CHANNEL_ERROR faster, so fallback polling starts sooner
        // instead of leaving users staring at stale data for 45s.
        realtime: {
          timeout: 15000,
        },
      }
    );
  }

  if (isUnitTest) {
    return createMockClient() as unknown as ReturnType<typeof createClient<Database>>;
  }

  // Unconfigured outside tests — placeholder client so the module graph stays
  // type-stable. It is never invoked because index.tsx blocks the app and
  // renders a clear setup-error screen instead.
  console.error('[Supabase] ' + (SUPABASE_CONFIG_ERROR ?? 'Configuration error'));
  return createClient<Database>(
    'https://placeholder.supabase.co',
    'placeholder-anon-key',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
})();

