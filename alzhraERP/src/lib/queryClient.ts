
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ 5 minutes stale time — realtime sync + fallback polling handle live updates
      staleTime: 1000 * 60 * 5,
      // Keep in cache for 24 hours (persister handles longer storage)
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error: Error & { code?: number | string; status?: number }) => {
        // ⚡ No retry for auth errors — fail fast and route to the login flow
        const code = error?.code || error?.status || '';
        const msg = (error?.message || '').toLowerCase();
        if (
          code === 401 || code === 403 ||
          code === 'PGRST301' ||
          msg.includes('jwt expired') ||
          msg.includes('refresh token') ||
          msg.includes('not authenticated')
        ) {
          return false;
        }
        return failureCount < 3;
      },
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
