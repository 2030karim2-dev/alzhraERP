
import { QueryClient } from '@tanstack/react-query';
import { persister } from './persister';

// Re-export so both the provider and auth/store share ONE persister instance.
export { persister };

// ── Persistence limits (single source of truth for provider + auth) ──────────
// Max age for the persisted (IndexedDB) cache. 24h prevents stale financial
// data from looking "fresh" forever after a long inactivity.
export const QUERY_PERSIST_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours
// Bump this string to force-discard all persisted caches on deploy.
export const QUERY_PERSIST_BUSTER = 'alz-erp-v2';

/**
 * Whether a failed query should be retried.
 *
 * Deterministic failures must fail fast instead of multiplying requests:
 *  - 401 / 403 / PGRST301 / jwt / refresh token — auth errors route to the
 *    login flow; retrying them is pointless.
 *  - 406 / PGRST116 — `.single()` with ZERO visible rows: the row either does
 *    not exist or is filtered out by RLS. The outcome is deterministic, so
 *    retrying 3× per mount across many consumers (e.g. `useCompany` used by
 *    9 components) produces the exact self-sustaining request storm that
 *    previously flooded the console with repeated
 *    `companies?id=eq.<stale-id>&select=*` 406 requests.
 */
const NO_RETRY_CODES = [401, 403, 'PGRST301', 'PGRST116', 406] as const;
const NO_RETRY_FRAGMENTS = ['jwt expired', 'refresh token', 'not authenticated'] as const;

export const shouldRetryQuery = (
  failureCount: number,
  error: { code?: number | string; status?: number; message?: string } | null | undefined = {}
): boolean => {
  const err = error ?? {};
  const code = err.code ?? err.status;
  const msg = (err.message ?? '').toLowerCase();

  const noRetryCode = NO_RETRY_CODES.some((c) => c === code);
  const noRetryMessage = NO_RETRY_FRAGMENTS.some((fragment) => msg.includes(fragment));

  if (noRetryCode || noRetryMessage) return false;
  return failureCount < 3;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ 5 minutes stale time — realtime sync + fallback polling handle live updates
      staleTime: 1000 * 60 * 5,
      // Keep in cache for 24 hours (persister handles longer storage)
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error) => shouldRetryQuery(failureCount, error),
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // ⚡ DISABLED — useRealtimeSync handles live updates via Supabase WebSocket.
      // Enabling these causes ALL queries to fire on every page navigation = slow.
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      // Always attempt offline mutations so the offline queue (syncStore) can
      // enqueue them on failure — networkMode 'online' would pause them forever.
      networkMode: 'always',
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// NOTE: persistence itself is managed declaratively by <PersistQueryClientProvider>
// in src/core/lib/react-query.tsx (the single provider). This module ONLY owns the
// client + persister singletons, so logout (src/features/auth/store.ts) clears the
// SAME cache the app actually uses — no more stale cross-user data in IndexedDB.
