-- Migration: 20260915000004_security_and_privilege_hardening.sql
-- Description:
--   1. تحصين سياسات RLS لجدول messaging_config لمنع تسريب الرموز السرية (Telegram Bot Token, WhatsApp API Key)
--      وقصر القراءة والتعديل على (owner, admin, super_admin) فقط.
--   2. تحصين سياسات RLS لجدول invitations لمنع إنشاء أو إلغاء الدعوات إلا من قبل (owner, admin, manager, super_admin).

-- ============================================================================
-- 1. Hardening messaging_config RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS messaging_config_select ON public.messaging_config;
DROP POLICY IF EXISTS messaging_config_insert ON public.messaging_config;
DROP POLICY IF EXISTS messaging_config_update ON public.messaging_config;
DROP POLICY IF EXISTS messaging_config_delete ON public.messaging_config;

CREATE POLICY messaging_config_select ON public.messaging_config
  FOR SELECT TO authenticated
  USING (
    is_super_admin() OR 
    public.get_user_role(company_id) IN ('owner', 'admin')
  );

CREATE POLICY messaging_config_insert ON public.messaging_config
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin() OR 
    public.get_user_role(company_id) IN ('owner', 'admin')
  );

CREATE POLICY messaging_config_update ON public.messaging_config
  FOR UPDATE TO authenticated
  USING (
    is_super_admin() OR 
    public.get_user_role(company_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    is_super_admin() OR 
    public.get_user_role(company_id) IN ('owner', 'admin')
  );

CREATE POLICY messaging_config_delete ON public.messaging_config
  FOR DELETE TO authenticated
  USING (
    is_super_admin() OR 
    public.get_user_role(company_id) IN ('owner', 'admin')
  );

-- ============================================================================
-- 2. Hardening invitations RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS invitations_insert ON public.invitations;
DROP POLICY IF EXISTS invitations_delete ON public.invitations;

CREATE POLICY invitations_insert ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin() OR 
    public.get_user_role(company_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY invitations_delete ON public.invitations
  FOR DELETE TO authenticated
  USING (
    is_super_admin() OR 
    public.get_user_role(company_id) IN ('owner', 'admin', 'manager')
  );
