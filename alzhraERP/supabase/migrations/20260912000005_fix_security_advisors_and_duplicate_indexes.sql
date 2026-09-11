-- =========================================================================
-- Migration: 20260912000005_fix_security_advisors_and_duplicate_indexes.sql
-- Description:
--   Permanently resolves all Supabase Security & Performance Advisors findings:
--   1. Security Definer View: Convert vw_inventory_valuation to security_invoker = true.
--   2. Drop Duplicate Indexes on inventory_session_drafts and products.
--   3. Revoke execution of sensitive financial/fiscal functions from anon and PUBLIC.
-- =========================================================================

-- 1. Convert vw_inventory_valuation from SECURITY DEFINER to SECURITY INVOKER
ALTER VIEW public.vw_inventory_valuation SET (security_invoker = true);

-- 2. Drop Duplicate Performance-Degrading Indexes
DROP INDEX IF EXISTS public.inventory_session_drafts_session_id_idx;
DROP INDEX IF EXISTS public.idx_products_deleted_active;

-- 3. Revoke anon/PUBLIC execute permissions on sensitive financial, fiscal and audit RPCs
DO $$
DECLARE
  r RECORD;
  v_sensitive_procs TEXT[] := ARRAY[
    'fn_close_fiscal_year',
    'fn_get_vat_return_report',
    'fn_post_asset_depreciation',
    'fn_run_all_assets_depreciation',
    'fn_revalue_foreign_currency',
    'fn_accounting_health_check',
    'post_monthly_rent_and_payroll',
    'commit_purchase_invoice',
    'commit_sales_invoice_v2',
    'save_audit_progress',
    'add_audit_session_item',
    'delete_audit_session_item',
    'search_invoices_advanced',
    'check_record_not_on_locked_day',
    'trg_fn_set_supplier_portal_token',
    'regenerate_supplier_portal_token'
  ];
BEGIN
  FOR r IN
    SELECT p.proname, oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(v_sensitive_procs)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon;', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC;', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated;', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role;', r.proname, r.args);
  END LOOP;
END;
$$;
