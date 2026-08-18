-- ============================================================
-- Migration: Server-Side Permissions System
-- Date: 2026-08-10
-- Phase: C-2 — Replace client-side permissions with RLS-backed
--        role_permissions table + has_permission() RPC
-- ============================================================

-- 1. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('admin','manager','accountant','sales','viewer')),
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role, permission)
);

-- RLS: only admins can view/modify permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select" ON public.role_permissions
    FOR SELECT TO authenticated USING (public.get_user_role() = 'admin');

-- 2. Seed default permissions
INSERT INTO public.role_permissions (role, permission) VALUES
    -- Admin: full access
    ('admin', 'sales:create'), ('admin', 'sales:read'), ('admin', 'sales:update'), ('admin', 'sales:delete'),
    ('admin', 'purchases:create'), ('admin', 'purchases:read'), ('admin', 'purchases:update'), ('admin', 'purchases:delete'),
    ('admin', 'accounting:create'), ('admin', 'accounting:read'), ('admin', 'accounting:update'), ('admin', 'accounting:delete'),
    ('admin', 'inventory:create'), ('admin', 'inventory:read'), ('admin', 'inventory:update'), ('admin', 'inventory:delete'),
    ('admin', 'customers:create'), ('admin', 'customers:read'), ('admin', 'customers:update'), ('admin', 'customers:delete'),
    ('admin', 'expenses:create'), ('admin', 'expenses:read'), ('admin', 'expenses:update'), ('admin', 'expenses:delete'),
    ('admin', 'reports:read'), ('admin', 'reports:export'),
    ('admin', 'ai:use'), ('admin', 'admin:access'), ('admin', 'settings:manage'),

    -- Manager: can do most things except delete + admin
    ('manager', 'sales:create'), ('manager', 'sales:read'), ('manager', 'sales:update'),
    ('manager', 'purchases:create'), ('manager', 'purchases:read'), ('manager', 'purchases:update'),
    ('manager', 'accounting:create'), ('manager', 'accounting:read'), ('manager', 'accounting:update'),
    ('manager', 'inventory:read'), ('manager', 'inventory:update'),
    ('manager', 'customers:create'), ('manager', 'customers:read'), ('manager', 'customers:update'),
    ('manager', 'expenses:create'), ('manager', 'expenses:read'), ('manager', 'expenses:update'),
    ('manager', 'reports:read'), ('manager', 'reports:export'),
    ('manager', 'ai:use'),

    -- Accountant: financial operations only
    ('accountant', 'sales:read'), ('accountant', 'sales:update'),
    ('accountant', 'purchases:read'),
    ('accountant', 'accounting:create'), ('accountant', 'accounting:read'), ('accountant', 'accounting:update'),
    ('accountant', 'expenses:create'), ('accountant', 'expenses:read'), ('accountant', 'expenses:update'),
    ('accountant', 'reports:read'), ('accountant', 'reports:export'),

    -- Sales: sales + customer operations
    ('sales', 'sales:create'), ('sales', 'sales:read'),
    ('sales', 'customers:create'), ('sales', 'customers:read'),
    ('sales', 'inventory:read'),

    -- Viewer: read-only access
    ('viewer', 'sales:read'), ('viewer', 'purchases:read'),
    ('viewer', 'accounting:read'), ('viewer', 'inventory:read'),
    ('viewer', 'customers:read'), ('viewer', 'reports:read')
ON CONFLICT (role, permission) DO NOTHING;

-- 3. RPC: has_permission — check if current user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.user_profiles up ON up.role = rp.role
        WHERE up.id = auth.uid()
        AND rp.permission = p_permission
    );
$$;

-- 4. RPC: get_user_permissions — return all permissions for current user
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TABLE(permission TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT rp.permission
    FROM public.role_permissions rp
    JOIN public.user_profiles up ON up.role = rp.role
    WHERE up.id = auth.uid()
    ORDER BY rp.permission;
$$;

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON public.role_permissions(permission);

COMMENT ON TABLE public.role_permissions IS 'Server-side permission definitions per role. Replaced client-side hardcoded permissions (C-2 fix).';
COMMENT ON FUNCTION public.has_permission(TEXT) IS 'Check if the current authenticated user has a specific permission. Used by frontend and RLS policies.';
COMMENT ON FUNCTION public.get_user_permissions() IS 'Return all permissions for the current authenticated user. Used for permission caching.';
