/**
 * usePermission — Server-Side Permission Check
 * 
 * Replaces the client-side `hasPermission()` from `src/core/permissions/index.tsx`.
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
import { Role, Permission } from '../types/common';

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
    const { data, error } = await supabase.rpc('has_permission', { p_permission: permission });
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

// Minimal safe wrapper over the legacy role map for the offline fallback.
async function legacyRoleHasPermission(role: string | undefined, permission: string): Promise<boolean> {
  try {
    const { hasPermission } = await import('../permissions/index');
    if (!role) return false;
    const normalized = (role.toLowerCase() === 'owner' ? 'admin' : role) as Role;
    return hasPermission(normalized, permission as Permission);
  } catch {
    return false;
  }
}

export function usePermission(permission: string) {
    const { user } = useAuthStore();

    const { data, isLoading, error } = useQuery({
        queryKey: ['permission', permission, user?.id],
        queryFn: async () => {
            if (!user?.id) return false;
            const { data, error: rpcError } = await supabase
                .rpc('has_permission', { p_permission: permission });
            if (rpcError) {
                logger.warn('usePermission', `RPC error for "${permission}"`, rpcError.message);
                return false;
            }
            return (data as boolean) ?? false;
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
        queryKey: ['permissions', 'all', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data: perms, error } = await supabase
                .rpc('get_user_permissions');
            if (error) {
                logger.warn('useAllPermissions', 'RPC error', error.message);
                return [];
            }
            return (perms as { permission: string }[])?.map(p => p.permission) ?? [];
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
