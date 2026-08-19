-- ============================================================
-- Fix companies_update RLS policy
-- ------------------------------------------------------------
-- The baseline policy allowed ONLY `is_super_admin()` to update
-- `companies`. `super_admins` is empty in production, so NO ONE
-- could edit the company profile through the API (the Settings →
-- بيانات المنشأة form always failed with an RLS denial).
--
-- New policy: tenant owners/admins (via get_auth_companies() +
-- get_user_role()) may update their own company.
--
-- NOTE: an owner_id-immutability guard via a self-referential
-- subquery (`owner_id = (SELECT ... FROM companies ...)`) is NOT
-- used in the policy: PostgreSQL rejects it as infinite recursion
-- (42P17). Instead, ownership is protected by the
-- `trg_guard_company_owner_transfer` BEFORE UPDATE trigger below:
-- only the current owner, a super admin, or a service/system
-- context (no user JWT) may change `owner_id`.
-- ============================================================

DROP POLICY IF EXISTS "companies_update" ON public.companies;

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO public
  USING (
    is_super_admin()
    OR (
      id IN (SELECT get_auth_companies())
      AND get_user_role() IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      id IN (SELECT get_auth_companies())
      AND get_user_role() IN ('owner', 'admin')
    )
  );

-- ── Ownership transfer guard ────────────────────────────────────────────
-- Prevents a non-owner member (e.g. an `admin`) from silently taking over
-- the company by changing `owner_id`. `auth.uid() IS NULL` covers
-- service_role / postgres / maintenance contexts, which may still perform
-- legitimate ownership transfers.
CREATE OR REPLACE FUNCTION public.guard_company_owner_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> OLD.owner_id
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'لا يمكن تغيير مالك المنشأة إلا من المالك الحالي أو مسؤول النظام';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_company_owner_transfer ON public.companies;
CREATE TRIGGER trg_guard_company_owner_transfer
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_company_owner_transfer();

