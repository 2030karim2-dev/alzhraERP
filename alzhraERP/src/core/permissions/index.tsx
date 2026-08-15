// ============================================
// Permissions - نظام الصلاحيات
// Al-Zahra Smart ERP
// 
// ⚠️ MIGRATION NOTICE (C-2 fix):
// The hardcoded rolePermissions map below is being phased out.
// New code should use `usePermission('permission:name')` from
// `../../core/hooks/usePermission` which queries the server-side
// `has_permission()` RPC backed by the `role_permissions` table.
// 
// Migration: supabase/migrations/20260810000010_server_side_permissions.sql
// ============================================

import { Permission, Role } from '../types/common';

// Re-export the new server-side hooks for convenience
export { usePermission, useAllPermissions } from '../hooks/usePermission';

/**
 * @deprecated Use `usePermission('sales:create')` instead.
 * This client-side map will be removed in v2.0.
 */
const rolePermissions: Record<Role, Permission[]> = {
    admin: [
        'sales:create', 'sales:read', 'sales:update', 'sales:delete',
        'purchases:create', 'purchases:read', 'purchases:update', 'purchases:delete',
        'accounting:create', 'accounting:read', 'accounting:update', 'accounting:delete',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete',
        'customers:create', 'customers:read', 'customers:update', 'customers:delete',
        'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete',
        'reports:read', 'reports:export',
        'ai:use', 'admin:access',
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
        'reports:read', 'reports:export'
    ],
    sales: [
        'sales:create', 'sales:read',
        'customers:create', 'customers:read',
        'inventory:read'
    ],
    viewer: [
        'sales:read',
        'purchases:read',
        'accounting:read',
        'inventory:read',
        'customers:read',
        'reports:read'
    ]
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: Role, permission: Permission): boolean => {
    return rolePermissions[role].includes(permission);
};

/**
 * Check if a role has any of the given permissions
 */
export const hasAnyPermission = (role: Role, permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(role, p));
};

/**
 * Check if a role has all of the given permissions
 */
export const hasAllPermissions = (role: Role, permissions: Permission[]): boolean => {
    return permissions.every(p => hasPermission(role, p));
};

/**
 * Get all permissions for a role
 */
export const getPermissions = (role: Role): Permission[] => {
    return rolePermissions[role];
};

/**
 * Check if role can perform action on resource
 */
export const canPerformAction = (
    role: Role,
    action: 'create' | 'read' | 'update' | 'delete',
    resource: 'sales' | 'purchases' | 'accounting' | 'inventory' | 'customers' | 'expenses' | 'reports' | 'ai'
): boolean => {
    const permission = `${resource}:${action}` as Permission;
    return hasPermission(role, permission);
};

// ============================================
// React Hook for Permissions
// ============================================

/**
 * Hook to check permissions in components
 * 
 * @example
 * const { can, canAny, canAll } = usePermissions(userRole);
 * 
 * // Usage
 * {can('sales:create') && <CreateButton />}
 * {canAny(['sales:create', 'sales:update']) && <EditButton />}
 * {canAll(['sales:create', 'reports:export']) && <ExportButton />}
 */
export const usePermissions = (userRole: Role) => {
    return {
        can: (permission: Permission) => hasPermission(userRole, permission),
        canAny: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
        canAll: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
        perform: (action: 'create' | 'read' | 'update' | 'delete', resource: string) =>
            canPerformAction(userRole, action, resource as any),
        getAll: () => getPermissions(userRole),
    };
};

// ============================================
// Permission Guard Component
// ============================================

import React from 'react';

interface PermissionGuardProps {
    children: React.ReactNode;
    role: Role;
    required: Permission | Permission[];
    requireAll?: boolean;
    fallback?: React.ReactNode;
}

/**
 * Component that only renders children if user has required permission(s)
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    children,
    role,
    required,
    requireAll = false,
    fallback = null
}) => {
    const isArray = Array.isArray(required);
    const hasAccess = isArray
        ? (requireAll
            ? hasAllPermissions(role, required)
            : hasAnyPermission(role, required))
        : hasPermission(role, required);

    if (!hasAccess) {
        return <>{ fallback } </>;
    }

    return <>{ children } </>;
};
