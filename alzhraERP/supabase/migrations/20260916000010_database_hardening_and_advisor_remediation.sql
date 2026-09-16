-- ====================================================================
-- Migration: 20260916000010_database_hardening_and_advisor_remediation.sql
-- Description: Supabase Security and Performance Advisors Remediation
-- 
-- 1. Performance Advisor:
--    - Indexes missing covering composite foreign keys on:
--      * invoice_items(company_id, tax_rate_id)
--      * invoices(company_id, payment_account_id)
--      * invoices(company_id, reference_invoice_id)
--    - Fixes auth_rls_initplan on user_company_roles by wrapping auth.uid() in (SELECT auth.uid())
--
-- 2. Security Advisor:
--    - Sets search_path = public on fn_guard_payment_allocations_tenant_isolation
--    - Revokes execute from public/anon on internal trigger functions
--      (fn_guard_posted_invoice_immutability, fn_guard_posted_invoice_items_immutability,
--       fn_guard_payment_allocations_tenant_isolation)
-- ====================================================================

-- 1. Unindexed Foreign Keys from Performance Advisor
CREATE INDEX IF NOT EXISTS idx_invoice_items_company_tax_rate ON public.invoice_items(company_id, tax_rate_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_account ON public.invoices(company_id, payment_account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_reference ON public.invoices(company_id, reference_invoice_id);

-- 2. Performance Advisor: user_company_roles RLS initplan fix
DROP POLICY IF EXISTS "user_company_roles_select" ON public.user_company_roles;
CREATE POLICY "user_company_roles_select" ON public.user_company_roles 
FOR SELECT TO public 
USING (
  is_super_admin() 
  OR (user_id = (SELECT auth.uid())) 
  OR (company_id IN (
    SELECT * FROM get_auth_companies()
  ))
);

-- 3. Security Advisor: Set search_path on fn_guard_payment_allocations_tenant_isolation
CREATE OR REPLACE FUNCTION public.fn_guard_payment_allocations_tenant_isolation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.invoices inv WHERE inv.id = NEW.invoice_id AND inv.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'Multi-tenant violation: invoice % does not belong to company %', NEW.invoice_id, NEW.company_id;
    END IF;
  END IF;
  IF NEW.payment_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.id = NEW.payment_id AND p.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'Multi-tenant violation: payment % does not belong to company %', NEW.payment_id, NEW.company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Security Advisor: Revoke public execution of trigger functions
REVOKE ALL ON FUNCTION public.fn_guard_payment_allocations_tenant_isolation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_guard_posted_invoice_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_guard_posted_invoice_items_immutability() FROM PUBLIC, anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
