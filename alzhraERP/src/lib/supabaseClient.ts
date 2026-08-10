
import { createClient } from '@supabase/supabase-js';
import { Database } from '../core/database.types';
import { logger } from '../core/utils/logger';
import { useConnectionStore } from '../core/store/connectionStore';

// تكوين الاتصال من متغيرات البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Feature flags
export const AI_FEATURES_ENABLED = import.meta.env.VITE_ENABLE_AI_FEATURES === 'true';
const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

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

// Allow app to work without Supabase for development
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables. App will run in offline/demo mode.');
} else if (!isValidSupabaseUrl(supabaseUrl)) {
  console.error('[Supabase] Invalid URL format. Expected: https://your-project.supabase.co');
}

const isSupabasePlaceholder = !supabaseUrl || !supabaseAnonKey || !isValidSupabaseUrl(supabaseUrl);

// Custom fetch with timeout and retry logic
const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const MAX_RETRIES = 3;
  let lastError: Error | unknown;

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

      if (i < MAX_RETRIES && isNetworkError) {
        const reason = isOffline ? 'offline' : 'network instability';
        logger.warn('Supabase', `Request failed (${reason}), retrying ${i + 1}/${MAX_RETRIES}...`, { attempt: i + 1 });

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

// Export typed supabase client - uses real client when configured, otherwise mock for dev
export const supabase = isSupabasePlaceholder
  ? createMockClient() as unknown as ReturnType<typeof createClient<Database>>
  : createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'alz_auth_session',
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
      // Add retry configuration
      realtime: {
        timeout: 45000,
      },
    }
  );

