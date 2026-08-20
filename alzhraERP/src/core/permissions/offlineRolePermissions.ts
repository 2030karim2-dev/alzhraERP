// ============================================================
// Offline Role → Permission Map (ADR-003 Phase 3)
// ------------------------------------------------------------
// The full legacy permission module (components + hooks + guards)
// was deleted in Phase C1. This is the ONLY remaining slice: a
// minimal, dependency-free role→permission map used as a last-resort
// fallback when the `has_permission()` RPC is unreachable (offline or
// migration lag). Real security is ALWAYS enforced by RLS on the
// underlying tables — this map only decides UI visibility, never
// authorizes writes.
// ============================================================

import { Permission, Role } from '../types/common';

export const OFFLINE_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    admin: [
        'sales:create', 'sales:read', 'sales:update', 'sales:delete',
        'purchases:create', 'purchases:read', 'purchases:update', 'purchases:delete',
        'accounting:create', 'accounting:read', 'accounting:update', 'accounting:delete',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete',
        'customers:create', 'customers:read', 'customers:update', 'customers:delete',
        'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete',
        'reports:read', 'reports:export',
        'ai:use', 'admin:access', 'settings:manage',
        'debts:read', 'debts:manage', 'debts:remind',
        'incentive:manage_plans', 'incentive:calculate_period',
        'incentive:period_calculating', 'incentive:period_calculated',
        'incentive:period_under_review', 'incentive:period_approved',
        'incentive:period_locked', 'incentive:period_paid'
    ],
    manager: [
        'sales:create', 'sales:read', 'sales:update',
        'purchases:create', 'purchases:read', 'purchases:update',
        'accounting:create', 'accounting:read', 'accounting:update',
        'inventory:read', 'inventory:update',
        'customers:create', 'customers:read', 'customers:update',
        'expenses:create', 'expenses:read', 'expenses:update',
        'reports:read', 'reports:export',
        'ai:use',
        'debts:read', 'debts:manage', 'debts:remind',
        'incentive:manage_plans', 'incentive:calculate_period',
        'incentive:period_calculating', 'incentive:period_calculated',
        'incentive:period_under_review', 'incentive:period_approved',
        'incentive:period_locked', 'incentive:period_paid'
    ],
    accountant: [
        'sales:read', 'sales:update',
        'purchases:read',
        'accounting:create', 'accounting:read', 'accounting:update',
        'expenses:create', 'expenses:read', 'expenses:update',
        'reports:read', 'reports:export',
        'debts:read', 'debts:manage'
    ],
    sales: [
        'sales:create', 'sales:read',
        'customers:create', 'customers:read',
        'inventory:read',
        'debts:read', 'debts:remind'
    ],
    viewer: [
        'sales:read',
        'purchases:read',
        'accounting:read',
        'inventory:read',
        'customers:read',
        'reports:read',
        'debts:read'
    ]
};

/**
 * Offline fallback check — mirrors the legacy `hasPermission(role, permission)`.
 * `owner` is not seeded in `role_permissions`, so it is normalized to `admin`
 * (the same normalization the removed legacy map performed).
 */
export const offlineHasPermission = (role: string | undefined, permission: string): boolean => {
    if (!role) return false;
    const normalized = (role.toLowerCase() === 'owner' ? 'admin' : role) as Role;
    const list = OFFLINE_ROLE_PERMISSIONS[normalized];
    if (!list) return false;
    return list.includes(permission as Permission);
};
