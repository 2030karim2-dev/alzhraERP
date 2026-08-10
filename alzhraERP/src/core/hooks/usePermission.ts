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
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';

const PERMISSION_STALE_TIME = 5 * 60 * 1000; // 5 دقائق

export function usePermission(permission: string) {
    const { user } = useAuthStore();

    const { data, isLoading, error } = useQuery({
        queryKey: ['permission', permission, user?.id],
        queryFn: async () => {
            if (!user?.id) return false;
            const { data, error: rpcError } = await supabase
                .rpc('has_permission', { p_permission: permission });
            if (rpcError) {
                console.warn(`[usePermission] RPC error for "${permission}":`, rpcError.message);
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
                console.warn('[useAllPermissions] RPC error:', error.message);
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
