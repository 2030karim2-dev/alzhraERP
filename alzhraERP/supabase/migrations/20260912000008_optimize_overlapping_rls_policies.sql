-- ============================================================
-- Migration: 20260912000008_optimize_overlapping_rls_policies.sql
-- Optimizes overlapping and duplicate permissive RLS policies flagged by Supabase Linter
-- ============================================================

BEGIN;

-- 1) fixed_assets: Drop redundant fixed_assets_tenant_select because fixed_assets_tenant_modify is already ALL
DROP POLICY IF EXISTS "fixed_assets_tenant_select" ON public.fixed_assets;

-- 2) user_permissions: Split write policy to INSERT, UPDATE, DELETE so SELECT has only single policy
DROP POLICY IF EXISTS "user_permissions_write" ON public.user_permissions;

CREATE POLICY "user_permissions_insert" ON public.user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin() OR (
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid())
          AND ucr.company_id = user_permissions.company_id
          AND ucr.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])
      )
    )
  );

CREATE POLICY "user_permissions_update" ON public.user_permissions
  FOR UPDATE TO authenticated
  USING (
    is_super_admin() OR (
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid())
          AND ucr.company_id = user_permissions.company_id
          AND ucr.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])
      )
    )
  )
  WITH CHECK (
    is_super_admin() OR (
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid())
          AND ucr.company_id = user_permissions.company_id
          AND ucr.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])
      )
    )
  );

CREATE POLICY "user_permissions_delete" ON public.user_permissions
  FOR DELETE TO authenticated
  USING (
    is_super_admin() OR (
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid())
          AND ucr.company_id = user_permissions.company_id
          AND ucr.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])
      )
    )
  );

-- 3) system_platform_configs: Change write policy from ALL to INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "system_configs_write_super_admin" ON public.system_platform_configs;

CREATE POLICY "system_configs_insert_super_admin" ON public.system_platform_configs
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "system_configs_update_super_admin" ON public.system_platform_configs
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "system_configs_delete_super_admin" ON public.system_platform_configs
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- 4) prc_rfqs: Drop redundant duplicate prc_rfqs_isolation_policy (already covered by specific granular policies)
DROP POLICY IF EXISTS "prc_rfqs_isolation_policy" ON public.prc_rfqs;

COMMIT;
