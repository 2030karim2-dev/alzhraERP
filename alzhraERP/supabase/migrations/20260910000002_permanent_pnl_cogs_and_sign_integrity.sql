-- ============================================================
-- Migration: 20260910000002_permanent_pnl_cogs_and_sign_integrity.sql
-- ============================================================
-- PURPOSE:
--   1. Update report_profit_loss_detailed to add is_cogs flag per account.
--   2. Create new report_operational_expenses_detailed that permanently
--      excludes COGS (5100/51%) at the database level, independent of UI code.
--
-- SIGN CONVENTION (DO NOT CHANGE):
--   revenue: balance = SUM(credit) - SUM(debit)  --> positive = normal income
--   expense: balance = SUM(debit)  - SUM(credit) --> positive = normal cost
--   negative balance = reversal entry --> MUST be subtracted, NOT added
--   FORBIDDEN: using ABS() on these balances causes reversal doubling
--
-- RULES (permanent):
--   - COGS (code=5100 or LIKE '51%') must NOT appear in operational expense reports
--   - COGS appears in full P&L (report_profit_loss_detailed) with is_cogs=true
--   - Totals are computed WITHOUT ABS(); UI uses sign for color-coding only
-- ============================================================

BEGIN;

-- 1. Update report_profit_loss_detailed: add is_cogs column
CREATE OR REPLACE FUNCTION public.report_profit_loss_detailed(
    p_company_id uuid,
    p_from date,
    p_to date,
    p_branch_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(
    account_id uuid,
    account_code text,
    account_name text,
    account_type text,
    total_debit numeric,
    total_credit numeric,
    balance numeric,
    is_cogs boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- SIGN CONVENTION:
--   revenue: balance = credit - debit (positive = normal income)
--   expense: balance = debit - credit (positive = normal cost)
--   negative = reversal -- subtract it, do NOT add it
--   DO NOT apply ABS() to balance in application code
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  RETURN QUERY
  SELECT
      a.id,
      a.code,
      a.name_ar,
      a.type,
      COALESCE(SUM(jel.debit_amount), 0)  AS total_debit,
      COALESCE(SUM(jel.credit_amount), 0) AS total_credit,
      CASE
        WHEN a.type = 'revenue'
          THEN COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0)
        ELSE COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0)
      END AS balance,
      (a.code = '5100' OR a.code LIKE '51%') AS is_cogs
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.type IN ('revenue', 'expense')
    AND je.status = 'posted'
    AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id)
  GROUP BY a.id, a.code, a.name_ar, a.type
  HAVING COALESCE(SUM(jel.debit_amount), 0) <> 0
      OR COALESCE(SUM(jel.credit_amount), 0) <> 0
  ORDER BY a.code ASC;
END;
$function$;

-- 2. New function: operational expenses only (COGS excluded at DB level)
CREATE OR REPLACE FUNCTION public.report_operational_expenses_detailed(
    p_company_id uuid,
    p_from date,
    p_to date,
    p_branch_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(
    account_id uuid,
    account_code text,
    account_name text,
    total_debit numeric,
    total_credit numeric,
    net_expense numeric,
    line_count bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- net_expense = debit - credit (positive = normal expense, negative = reversal)
-- DO NOT apply ABS() to net_expense in application code
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  RETURN QUERY
  SELECT
      a.id,
      a.code,
      a.name_ar,
      COALESCE(SUM(jel.debit_amount), 0)  AS total_debit,
      COALESCE(SUM(jel.credit_amount), 0) AS total_credit,
      COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) AS net_expense,
      COUNT(jel.id) AS line_count
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.type = 'expense'
    AND a.code <> '5100'
    AND a.code NOT LIKE '51%'
    AND je.status = 'posted'
    AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id)
  GROUP BY a.id, a.code, a.name_ar
  HAVING COALESCE(SUM(jel.debit_amount), 0) <> 0
      OR COALESCE(SUM(jel.credit_amount), 0) <> 0
  ORDER BY net_expense DESC NULLS LAST;
END;
$function$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.report_profit_loss_detailed(uuid, date, date, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.report_profit_loss_detailed(uuid, date, date, uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.report_operational_expenses_detailed(uuid, date, date, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.report_operational_expenses_detailed(uuid, date, date, uuid) FROM anon, PUBLIC;

COMMIT;
