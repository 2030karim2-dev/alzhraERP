-- Migration: 20260921000002_fix_debt_followup_dashboard_overload_and_branch_kpi_index.sql
-- Description: Drop ambiguous get_debt_followup_dashboard 5-param overload and add branch covering index for dashboard/debts KPIs

-- 1. Drop redundant/ambiguous 5-param overload of get_debt_followup_dashboard
-- The 6-param overload (with p_limit DEFAULT NULL) covers all 1, 4, 5, and 6 argument invocations.
-- Having both caused Postgres error 42725: "function is not unique" which broke get_debt_analytics_summary and dashboard KPIs.
DROP FUNCTION IF EXISTS public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid);

-- 2. Add covering index for branch-level invoice filtering and KPI calculations
-- Covers: company_id, branch_id, type, status, with covering columns for sums and dates
CREATE INDEX IF NOT EXISTS idx_invoices_branch_covering 
ON public.invoices (company_id, branch_id, type, status) 
INCLUDE (total_amount, paid_amount, exchange_rate, currency_code, issue_date) 
WHERE deleted_at IS NULL;

-- 3. Ensure get_debt_followup_dashboard permissions are intact
REVOKE EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) TO authenticated;

-- 4. Ensure get_debt_analytics_summary permissions are intact
REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid, uuid) TO authenticated;
