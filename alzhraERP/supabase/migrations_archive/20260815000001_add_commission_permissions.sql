-- ============================================================
-- Migration: Commission (Incentive) Module Permissions
-- Date: 2026-08-15
-- ============================================================
-- Seeds the role_permissions table with the incentive:* permissions used by
-- the commissions module (Phase 3). The frontend gates UI actions with the
-- same names via src/features/commissions/authorization.ts, and the RPCs in
-- alzhra100 (incentive_calculate_period, incentive_period_transition, ...)
-- enforce them server-side through has_permission().
--
-- Mapping notes:
--   * Roles seeded here: admin + manager (the roles accepted by
--     user_is_admin_or_manager()). manager mirrors the commissions-domain
--     finance_manager role which is not a system role yet.
--   * owner is intentionally omitted: owner bypasses checks in
--     assertPermission() and user_is_admin_or_manager() covers admin/manager.
--   * Idempotent: ON CONFLICT (role, permission) DO NOTHING.
-- ============================================================

INSERT INTO public.role_permissions (role, permission) VALUES
    -- admin: full commission control
    ('admin', 'incentive:manage_plans'),
    ('admin', 'incentive:calculate_period'),
    ('admin', 'incentive:period_calculating'),
    ('admin', 'incentive:period_calculated'),
    ('admin', 'incentive:period_under_review'),
    ('admin', 'incentive:period_approved'),
    ('admin', 'incentive:period_locked'),
    ('admin', 'incentive:period_paid'),
    -- manager: mirrors finance_manager capability
    ('manager', 'incentive:manage_plans'),
    ('manager', 'incentive:calculate_period'),
    ('manager', 'incentive:period_calculating'),
    ('manager', 'incentive:period_calculated'),
    ('manager', 'incentive:period_under_review'),
    ('manager', 'incentive:period_approved'),
    ('manager', 'incentive:period_locked'),
    ('manager', 'incentive:period_paid')
ON CONFLICT (role, permission) DO NOTHING;
