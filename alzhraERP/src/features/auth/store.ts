import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from './types';
import { supabase } from '../../lib/supabaseClient';
import { authApi } from './api';
import { queryClient } from '../../lib/queryClient';
import { persister } from '../../lib/persister';
import { logger } from '../../core/utils/logger';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReady: boolean;
  login: (user: AuthUser) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

//_TIMEOUT for session check
const SESSION_CHECK_TIMEOUT = 45000;
const PROFILE_FETCH_TIMEOUT = 45000;

// Module-level state (not persisted — runtime-only)
let isInitializingGlobal = false;
let _authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isReady: false,

      login: (user) => set({ user, isAuthenticated: true, isLoading: false, isReady: true }),

      loginWithGoogle: async () => {
        try {
          set({ isLoading: true });
          const { error } = await authApi.signInWithGoogle();
          if (error) throw error;
          // The page will redirect to Google, so we don't need to do anything else here.
        } catch (err) {
          logger.error('Auth', 'Google login error', err as Error);
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          logger.error('Auth', 'Sign out error', err as Error);
        } finally {
          // Clear all React Query cache + IndexedDB persisted data on logout
          queryClient.clear();
          Promise.resolve(persister.removeClient()).catch(() => { });
          set({ user: null, isAuthenticated: false, isLoading: false, isReady: true });
        }
      },

      initialize: async () => {
        // Prevent concurrent initialization
        if (isInitializingGlobal) return;
        isInitializingGlobal = true;

        // ⚡ Trust Persisted Data First (Optimistic UI)
        const persistedUser = get().user;
        const wasAuthenticated = get().isAuthenticated;

        if (persistedUser && wasAuthenticated) {
          set({ isLoading: false, isReady: true });
        }

        try {
          if (!persistedUser) {
            set({ isLoading: true });
          }

          // 1. Create a timeout promise
          const timeoutPromise = new Promise<{ timeout: boolean }>(resolve =>
            setTimeout(() => resolve({ timeout: true }), SESSION_CHECK_TIMEOUT)
          );

          // 2. Try to get session with timeout
          let session = null;
          let sessionError = null;

          const sessionPromise = supabase.auth.getSession().catch(() => ({ data: { session: null }, error: null }));
          const result = await Promise.race([sessionPromise, timeoutPromise]);

          if (result && 'timeout' in result) {
            // Only log warning if we DON'T have a persisted session to fall back on
            if (!persistedUser) {
              logger.warn('Auth', 'Session check timed out on fresh load');
            } else {
              logger.debug('Auth', 'Session check timed out, using persisted session');
              isInitializingGlobal = false;
              return;
            }
          } else if ('data' in result) {
            session = result.data.session;
            sessionError = result.error;
          }

          // ⚡ If Refresh Token fails, clear session immediately
          if (sessionError) {
            logger.warn('Auth', 'Stale session detected, clearing token', { message: sessionError.message });
            await supabase.auth.signOut({ scope: 'local' });
            queryClient.clear();
            Promise.resolve(persister.removeClient()).catch(() => { });
            set({ user: null, isAuthenticated: false, isLoading: false, isReady: true });
          } else if (session?.user) {
            // 2. Fetch full profile with timeout
            let profile: Record<string, unknown> | null = null;

            const profilePromise = authApi.getProfile(session.user.id).catch(() => ({ data: null, error: null, isAborted: false }));
            const profileTimeout = new Promise<{ timeout: boolean }>(resolve =>
              setTimeout(() => resolve({ timeout: true }), PROFILE_FETCH_TIMEOUT)
            );

            const profileResult = await Promise.race([profilePromise, profileTimeout]);

            if (profileResult && 'timeout' in profileResult) {
              logger.warn('Auth', 'Profile fetch timed out');
              if (persistedUser && persistedUser.id === session.user.id) {
                profile = persistedUser as unknown as Record<string, unknown>;
                set({ isLoading: false, isReady: true });
              }
            } else {
              const resolved = profileResult as { data?: Record<string, unknown>, isAborted?: boolean } | Record<string, unknown>;
              profile = ('data' in resolved && resolved.data ? resolved.data : resolved) as Record<string, unknown>;
            }

            if (profile && typeof profile === 'object' && profile.id) {
              set({
                user: profile as unknown as AuthUser,
                isAuthenticated: true,
                isLoading: false,
                isReady: true,
              });
              // ⚡ Targeted invalidation instead of a blanket invalidateQueries():
              // a global invalidation refires EVERY mounted query (products×10000,
              // dashboard 6×RPC, quotations, parties, ...) at once — a request
              // storm on a flaky connection.
              queryClient.invalidateQueries({ type: 'active' });
            } else if (!persistedUser) {
              // ⚡ Profile RPC failed — try direct query to get company_id before giving up
              let recoveredCompanyId: string | undefined;
              let recoveredRole = 'viewer';
              let recoveredBranchId: string | null = null;
              try {
                const { data: roleRow } = await supabase
                  .from('user_company_roles')
                  .select('role, company_id, branch_id, companies(name_ar)')
                  .eq('user_id', session.user.id)
                  .limit(1)
                  .single();
                if (roleRow) {
                  recoveredCompanyId = (roleRow as any).company_id;
                  recoveredRole = (roleRow as any).role || 'viewer';
                  recoveredBranchId = (roleRow as any).branch_id ?? null;
                }
              } catch (_) { /* ignore — best effort */ }

              set({
                user: {
                  id: session.user.id,
                  email: session.user.email || '',
                  full_name: session.user.user_metadata?.full_name || '',
                  role: recoveredRole,
                  ...(recoveredCompanyId ? { company_id: recoveredCompanyId } : {}),
                  branch_id: recoveredBranchId,
                },
                isAuthenticated: true,
                isLoading: false,
                isReady: true,
              });
              queryClient.invalidateQueries({ type: 'active' });
            }

          } else if (!persistedUser) {
            set({ user: null, isAuthenticated: false, isLoading: false, isReady: true });
          } else {
            queryClient.clear();
            Promise.resolve(persister.removeClient()).catch(() => { });
            set({ user: null, isAuthenticated: false, isLoading: false, isReady: true });
          }

          // 3. Unsubscribe from previous listener if exists
          if (_authSubscription) _authSubscription.unsubscribe();

          // 4. Listen for auth state changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
            try {
              logger.debug('Auth', 'State change event', { event });

              if (event === 'SIGNED_OUT' || !session) {
                queryClient.clear();
                Promise.resolve(persister.removeClient()).catch(() => { });
                set({ user: null, isAuthenticated: false, isLoading: false, isReady: true });
                return;
              }

              const currentUser = get().user;
              if (currentUser && currentUser.id === session.user.id && (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
                return;
              }

              if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
                if (!session.user?.id) return;

                try {
                  const profileResult = await authApi.getProfile(session.user.id);
                  const resolved = profileResult as unknown as { data?: Record<string, unknown> } | Record<string, unknown>;
                  const profile = ('data' in resolved && resolved.data ? resolved.data : resolved) as Record<string, unknown>;

                  if (profile && typeof profile === 'object' && profile.id) {
                    set({
                      user: profile as unknown as AuthUser,
                      isAuthenticated: true,
                      isLoading: false,
                      isReady: true
                    });
                    // ⚡ Targeted invalidation (active-only) — see initialize().
                    queryClient.invalidateQueries({ type: 'active' });
                  }
                } catch (e) {
                  logger.warn('Auth', `Profile fetch after ${event} failed`);
                }
              }
            } catch (err) {
              logger.error('Auth', 'onAuthStateChange handler failed', err);
            }
          });

          _authSubscription = subscription;

        } catch (err) {
          logger.error('Auth', 'Initialization error', err as Error);
          try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) { }
          queryClient.clear();
          Promise.resolve(persister.removeClient()).catch(() => { });
          set({ user: null, isAuthenticated: false, isLoading: false, isReady: true });
        } finally {
          isInitializingGlobal = false;
        }
      }
    }),
    {
      name: 'alzhra-auth',
      partialize: (state) => ({
        user: state.user,
        // isAuthenticated intentionally NOT persisted — must be derived from Supabase session
        // to prevent localStorage tampering (security fix: QA-2026-003)
      }),
    }
  )
);