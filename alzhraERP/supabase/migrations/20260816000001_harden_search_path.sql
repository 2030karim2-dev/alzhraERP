-- ============================================================
-- Migration: Harden search_path on SECURITY DEFINER functions
-- Date: 2026-08-16
-- Phase: D / Task 15
--
-- WHY 'public' and NOT '' :
--   A remote audit showed 55 SECURITY DEFINER functions had NO
--   explicit search_path. Their bodies use UNQUALIFIED references
--   (e.g. `FROM products`, `UPDATE product_stock`), so setting
--   `search_path = ''` would break them at runtime.
--
--   This migration sets an EXPLICIT `search_path = 'public'` which:
--     * removes the implicit `$user` lookup (a real hijack vector if a
--       schema named like the definer role were ever created), and
--     * documents the config in pg_proc.proconfig.
--
--   FULL hardening (`search_path = ''` + fully-qualified references)
--   requires per-function body refactoring and must be a follow-up
--   project done one function at a time with tests.
-- ============================================================

ALTER FUNCTION public.add_vin_parts_to_inventory(p_company_id uuid, p_vehicle jsonb, p_parts jsonb) SET search_path = 'public';
ALTER FUNCTION public.assemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.commit_expense_v2(p_company_id uuid, p_user_id uuid, p_data jsonb) SET search_path = 'public';
ALTER FUNCTION public.commit_payment(p_company_id uuid, p_user_id uuid, p_type text, p_amount numeric, p_date date, p_cash_account_id uuid, p_counterparty_type text, p_counterparty_id uuid, p_description text, p_payment_method text, p_reference_number text, p_currency_code text, p_exchange_rate numeric, p_foreign_amount numeric, p_branch_id uuid) SET search_path = 'public';
ALTER FUNCTION public.commit_sales_invoice(p_company_id uuid, p_user_id uuid, p_data jsonb) SET search_path = 'public';
ALTER FUNCTION public.commit_sales_invoice(p_company_id uuid, p_user_id uuid, p_party_id uuid, p_items jsonb, p_payment_method text, p_notes text, p_treasury_account_id uuid, p_currency text, p_exchange_rate numeric, p_branch_id uuid, p_discount_amount numeric) SET search_path = 'public';
ALTER FUNCTION public.create_stock_transfer(p_from_warehouse uuid, p_to_warehouse uuid, p_items jsonb, p_company_id uuid, p_user_id uuid, p_notes text) SET search_path = 'public';
ALTER FUNCTION public.disassemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.ensure_vehicle(p_make text, p_model text, p_year integer, p_engine text, p_body_type text, p_drive_type text, p_fuel_type text, p_transmission text, p_region text) SET search_path = 'public';
ALTER FUNCTION public.finalize_audit_session(p_session_id uuid, p_user_id uuid, p_items jsonb) SET search_path = 'public';
ALTER FUNCTION public.finalize_audit_session(p_session_id uuid, p_user_id uuid, p_items jsonb, p_company_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid, p_date_from date, p_date_to date) SET search_path = 'public';
ALTER FUNCTION public.get_expense_categories_summary(p_company_id uuid, p_date_from date, p_date_to date, p_branch_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_expense_stats(p_company_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_expense_stats(p_company_id uuid, p_start_date date, p_end_date date, p_branch_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_low_stock_products(p_company_id uuid, p_branch_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_matching_inventory_products(p_company_id uuid, p_vehicle_make text, p_vehicle_model text, p_year integer) SET search_path = 'public';
ALTER FUNCTION public.get_monthly_performance(p_company_id uuid, p_year integer, p_branch_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_monthly_performance(p_company_id uuid, p_year integer, p_month integer) SET search_path = 'public';
ALTER FUNCTION public.get_next_invoice_number(p_company_id uuid, p_type text) SET search_path = 'public';
ALTER FUNCTION public.get_next_sequence(p_company_id uuid, p_sequence_name text) SET search_path = 'public';
ALTER FUNCTION public.get_party_balance_by_currency(p_company_id uuid, p_party_id uuid, p_currency_code character varying) SET search_path = 'public';
ALTER FUNCTION public.get_popular_products(p_company_id uuid, p_limit integer) SET search_path = 'public';
ALTER FUNCTION public.get_purchase_stats(p_company_id uuid, p_branch_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_sales_analytics(p_company_id uuid, p_start_date date, p_end_date date) SET search_path = 'public';
ALTER FUNCTION public.get_sales_chart_data(p_company_id uuid, p_branch_id uuid, p_date_from date, p_date_to date) SET search_path = 'public';
ALTER FUNCTION public.get_sales_stats(p_company_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_sales_stats(p_company_id uuid, p_start_date date, p_end_date date) SET search_path = 'public';
ALTER FUNCTION public.get_top_products_and_customers(p_company_id uuid, p_branch_id uuid, p_limit integer) SET search_path = 'public';
ALTER FUNCTION public.get_user_company_id() SET search_path = 'public';
ALTER FUNCTION public.get_user_role() SET search_path = 'public';
ALTER FUNCTION public.log_audit_event() SET search_path = 'public';
ALTER FUNCTION public.normalize_arabic(p_text text) SET search_path = 'public';
ALTER FUNCTION public.prevent_posted_journal_line_modification() SET search_path = 'public';
ALTER FUNCTION public.prevent_posted_journal_modification() SET search_path = 'public';
ALTER FUNCTION public.report_balance_sheet(p_company_id uuid, p_as_of_date date) SET search_path = 'public';
ALTER FUNCTION public.report_cash_flow(p_company_id uuid, p_from date, p_to date) SET search_path = 'public';
ALTER FUNCTION public.report_debt_aging(p_company_id uuid) SET search_path = 'public';
ALTER FUNCTION public.report_profit_loss(p_company_id uuid, p_from date, p_to date) SET search_path = 'public';
ALTER FUNCTION public.report_trial_balance(p_company_id uuid, p_from date, p_to date, p_branch_id uuid) SET search_path = 'public';
ALTER FUNCTION public.resolve_vehicle_from_vin(p_vin text) SET search_path = 'public';
ALTER FUNCTION public.save_product_uoms(p_product_id uuid, p_uoms jsonb) SET search_path = 'public';
ALTER FUNCTION public.search_by_oem(p_company_id uuid, p_search_term text, p_limit integer) SET search_path = 'public';
ALTER FUNCTION public.search_cached_parts(p_provider text, p_normalized_number text) SET search_path = 'public';
ALTER FUNCTION public.search_cached_xrefs(p_provider text, p_source_number text) SET search_path = 'public';
ALTER FUNCTION public.search_inventory(p_term text, p_company_id uuid) SET search_path = 'public';
ALTER FUNCTION public.sync_product_search_numbers(p_product_id uuid) SET search_path = 'public';
ALTER FUNCTION public.trg_incentive_calc_guard() SET search_path = 'public';
ALTER FUNCTION public.trg_incentive_lines_period_guard() SET search_path = 'public';
ALTER FUNCTION public.trg_incentive_links_period_guard() SET search_path = 'public';
ALTER FUNCTION public.trg_sync_product_search_numbers() SET search_path = 'public';
ALTER FUNCTION public.user_is_admin_or_manager() SET search_path = 'public';
ALTER FUNCTION public.verify_company_access(p_company_id uuid) SET search_path = 'public';
ALTER FUNCTION public.void_bond(p_payment_id uuid) SET search_path = 'public';
