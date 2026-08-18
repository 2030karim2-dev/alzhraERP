-- ============================================================
-- Migration: Remove legacy RPC overloads (Task 17)
-- Date: 2026-08-16
-- Phase: D
--
-- Verified against the live database and the frontend:
--   * commit_sales_invoice (BOTH overloads)  -> the app uses
--     `commit_sales_invoice_v2`; 0 internal referencers.
--   * finalize_audit_session 4-arg           -> the app uses the
--     3-arg form (auditService.ts).
--   * get_dashboard_summary 4-arg / get_expense_stats 4-arg /
--     get_monthly_performance(p_month) / get_sales_stats 3-arg
--     are legacy overloads not used by the frontend.
--
-- PostgreSQL refuses DROP if any view/trigger/function still
-- depends on them, so this is safe by construction.
-- ============================================================

DROP FUNCTION public.commit_sales_invoice(p_company_id uuid, p_user_id uuid, p_data jsonb);
DROP FUNCTION public.commit_sales_invoice(p_company_id uuid, p_user_id uuid, p_party_id uuid, p_items jsonb, p_payment_method text, p_notes text, p_treasury_account_id uuid, p_currency text, p_exchange_rate numeric, p_branch_id uuid, p_discount_amount numeric);
DROP FUNCTION public.finalize_audit_session(p_session_id uuid, p_user_id uuid, p_items jsonb, p_company_id uuid);
DROP FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid, p_date_from date, p_date_to date);
DROP FUNCTION public.get_expense_stats(p_company_id uuid, p_start_date date, p_end_date date, p_branch_id uuid);
DROP FUNCTION public.get_monthly_performance(p_company_id uuid, p_year integer, p_month integer);
DROP FUNCTION public.get_sales_stats(p_company_id uuid, p_start_date date, p_end_date date);
