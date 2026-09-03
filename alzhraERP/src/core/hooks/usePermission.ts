/**
 * usePermission — Server-Side Permission Check
 *
 * Replaces the deleted client-side `hasPermission()` module
 * (`src/core/permissions/index.tsx`, removed in ADR-003 Phase 3). Only the
 * plain offline fallback map remains at `src/core/permissions/offlineRolePermissions.ts`.
 * Queries the `has_permission()` RPC to verify permissions against the database.
 *
 * @example
 * const { canDelete, isLoading } = usePermission('sales:delete');
 * if (canDelete) { ... }
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../features/auth/store';
import { logger } from '../utils/logger';
import {
  offlineHasPermission,
  OFFLINE_ROLE_PERMISSIONS,
} from '../permissions/offlineRolePermissions';
import type { Role } from '../types/common';

const PERMISSION_STALE_TIME = 5 * 60 * 1000; // 5 دقائق

// ---------------------------------------------------------------
// Mutation-time permission enforcement (replaces AuthorizeActionUsecase)
// ---------------------------------------------------------------

const DENIED_PREFIX = 'عذراً، لا تمتلك صلاحية';

const deniedMessage = (label: string) =>
  `${DENIED_PREFIX} كافية لتنفيذ: [${label}] - يرجى مراجعة الصلاحيات في النظام`;

/**
 * assertPermission — server-side permission check to be awaited INSIDE
 * mutationFn / handlers (unlike the usePermission hook which runs at render time).
 *
 * - Owner bypass: the `owner` role is not seeded in `role_permissions`, so owners
 *   always pass (mirrors the legacy AuthorizeActionUsecase behavior).
 * - Primary check: `has_permission()` RPC — server-authoritative.
 * - Fallback: if the RPC is unreachable (offline / migration not yet applied),
 *   degrades to the legacy client-side role map so features keep working.
 *   Real security remains enforced by RLS on the underlying tables.
 */
export async function assertPermission(permission: string, arabicLabel?: string): Promise<void> {
  const { user } = useAuthStore.getState();
  if (!user?.id) throw new Error('جلسة العمل منتهية');

  const label = arabicLabel || permission;

  // Owner bypass — not seeded in role_permissions.
  if (user.role === 'owner') return;

  try {
    // ⚡ Company-scoped overload (migration 20260821000005): without
    // p_company_id the 1-arg has_permission checks membership in ANY of the
    // user's companies (LIMIT 1), so an admin in Company A could pass the
    // gate while operating on Company B.
    const { data, error } = await supabase.rpc('has_permission', {
      p_permission: permission,
      ...(user.company_id != null ? { p_company_id: user.company_id } : {}),
    });
    if (error) throw error;
    if (!data) throw new Error(deniedMessage(label));
    return;
  } catch (err) {
    // A genuine denial from the server must NOT be swallowed by the fallback.
    if (err instanceof Error && err.message.startsWith(DENIED_PREFIX)) {
      throw err;
    }

    logger.warn(
      'Permission',
      `has_permission RPC failed for "${permission}" — using client-side fallback`,
      err
    );

    const ok = legacyRoleHasPermission(user.role, permission);
    if (!ok) throw new Error(deniedMessage(label));
  }
}

/**
 * assertOwner — strict owner-only gate (preserves the old requireAdmin semantics
 * for irreversibile operations like closing a fiscal year).
 */
export function assertOwner(user: { role?: string } | null): void {
  if (!user || user.role !== 'owner') {
    throw new Error('هذه العملية تتطلب صلاحيات مدير النظام (Owner)');
  }
}

// Minimal safe offline fallback over the legacy role map. The full legacy
// module was deleted (ADR-003 Phase 3); only the plain role→permission map
// remains in `offlineRolePermissions.ts` for the offline/degraded case.
function legacyRoleHasPermission(role: string | undefined, permission: string): boolean {
  return offlineHasPermission(role, permission);
}

export function usePermission(permission: string) {
  const { user } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['permission', permission, user?.id, user?.company_id, user?.role],
    queryFn: async () => {
      if (!user?.id) return false;
      // Owner bypass — mirrors assertPermission and legacy permission logic
      if (user.role === 'owner') return true;

      try {
        // Company-scoped check — see assertPermission for why.
        const { data, error: rpcError } = await supabase.rpc('has_permission', {
          p_permission: permission,
          ...(user.company_id != null ? { p_company_id: user.company_id } : {}),
        });
        if (rpcError) {
          logger.warn(
            'usePermission',
            `RPC error for "${permission}" — using client-side fallback`,
            rpcError.message
          );
          return offlineHasPermission(user.role, permission);
        }
        return data ?? false;
      } catch (err) {
        logger.warn(
          'usePermission',
          `Error checking permission "${permission}" — using client-side fallback`,
          err
        );
        return offlineHasPermission(user.role, permission);
      }
    },
    enabled: !!user?.id,
    staleTime: PERMISSION_STALE_TIME,
  });

  return {
    /** Whether the current user has the requested permission */
    hasPermission: !!data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch ALL permissions for the current user at once.
 * Useful for permission-heavy views (e.g., dashboard, admin panel).
 */
export function useAllPermissions() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['permissions', 'all', user?.id, user?.company_id, user?.role],
    queryFn: async () => {
      if (!user?.id) return [];
      if (user.role === 'owner') {
        return OFFLINE_ROLE_PERMISSIONS.admin;
      }
      try {
        // ⚡ Company-scoped overload (migration 20260822000001): the
        // no-arg get_user_permissions() returns permissions from the
        // single `user_profiles` role snapshot across ALL companies.
        const { data: perms, error } =
          user.company_id != null
            ? await supabase.rpc('get_user_permissions', { p_company_id: user.company_id })
            : await supabase.rpc('get_user_permissions');
        if (error) {
          logger.warn('useAllPermissions', 'RPC error — using fallback', error.message);
          const normalized = (user.role?.toLowerCase() === 'owner' ? 'admin' : user.role) as Role;
          return OFFLINE_ROLE_PERMISSIONS[normalized] || [];
        }
        return (perms as Array<{ permission: string }>)?.map(p => p.permission) ?? [];
      } catch (err) {
        logger.warn('useAllPermissions', 'Error — using fallback', err);
        const normalized = (user.role?.toLowerCase() === 'owner' ? 'admin' : user.role) as Role;
        return OFFLINE_ROLE_PERMISSIONS[normalized] || [];
      }
    },
    enabled: !!user?.id,
    staleTime: PERMISSION_STALE_TIME,
  });

  return {
    permissions: (data as string[]) ?? [],
    hasPermission: (perm: string) => (data as string[])?.includes(perm) ?? false,
    isLoading,
  };
}
