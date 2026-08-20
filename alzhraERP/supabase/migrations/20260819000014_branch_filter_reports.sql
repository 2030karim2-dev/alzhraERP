-- ============================================================
-- Branch filter for P&L / Balance Sheet / Cash Flow (Phase 2.5, H4)
-- ------------------------------------------------------------
-- 2026-08-19
--
-- report_profit_loss / report_balance_sheet / report_cash_flow had NO
-- p_branch_id parameter, so the active branch filter was silently ignored
-- and the accounting section always showed ALL branches for these reports.
--
-- Fix: add `p_branch_id uuid DEFAULT NULL` to each function (branch filtered
-- on journal_entry_lines.branch_id / invoices.branch_id / expenses.branch_id
-- / payments.branch_id). Signatures change, so the old overloads are dropped
-- first (checked: no views depend on them), then recreated with the extra
-- parameter — the same pattern ADR-006 used for get_account_ledger.
--
-- NOTE: these bodies also carry the C1 tenant access check from migration 10.
-- ============================================================

-- ============================================================
-- 1) report_profit_loss — add p_branch_id
-- ============================================================

DROP FUNCTION IF EXISTS public.report_profit_loss(uuid, date, date);

CREATE OR REPLACE FUNCTION public.report_profit_loss(p_company_id uuid, p_from date, p_to date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(category text, amount numeric, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_revenue numeric;
  v_expense numeric;
  v_gross_profit numeric;
  v_net_profit numeric;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Revenue (accounts starting with 4)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_revenue
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '4%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  -- Expenses (accounts starting with 5)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_expense
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '5%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  v_net_profit := v_revenue - v_expense;
  v_gross_profit := v_revenue;

  category := 'الإيرادات'; amount := v_revenue; type := 'revenue'; RETURN NEXT;
  category := 'المصروفات'; amount := v_expense; type := 'expense'; RETURN NEXT;
  category := 'صافي الربح/الخسارة'; amount := v_net_profit; type := 'net_profit'; RETURN NEXT;
END;
$function$;

-- ============================================================
-- 2) report_balance_sheet — add p_branch_id
-- ============================================================

DROP FUNCTION IF EXISTS public.report_balance_sheet(uuid, date);

CREATE OR REPLACE FUNCTION public.report_balance_sheet(p_company_id uuid, p_as_of_date date DEFAULT NULL::date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(category text, amount numeric, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date date := COALESCE(p_as_of_date, CURRENT_DATE);
  v_assets numeric;
  v_liabilities numeric;
  v_equity numeric;
  v_cash numeric;
  v_receivables numeric;
  v_inventory_value numeric;
  v_payables numeric;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Assets (accounts starting with 1)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_assets
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '1%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  -- Liabilities (accounts starting with 2)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_liabilities
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '2%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  -- Equity (accounts starting with 3)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_equity
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.code LIKE '3%'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  -- Return rows in proper order
  category := 'الأصول'; amount := v_assets; type := 'asset'; RETURN NEXT;
  category := 'الالتزامات'; amount := v_liabilities; type := 'liability'; RETURN NEXT;
  category := 'حقوق الملكية'; amount := v_equity; type := 'equity'; RETURN NEXT;
END;
$function$;


-- ============================================================
-- 3) report_cash_flow — add p_branch_id
-- ============================================================

DROP FUNCTION IF EXISTS public.report_cash_flow(uuid, date, date);

CREATE OR REPLACE FUNCTION public.report_cash_flow(p_company_id uuid, p_from date, p_to date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(category text, inflow numeric, outflow numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_operating_in numeric;
  v_operating_out numeric;
  v_investing_in numeric;
  v_investing_out numeric;
  v_financing_in numeric;
  v_financing_out numeric;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Operating inflow (sales cash receipts)
  SELECT COALESCE(SUM(i.total_amount), 0) INTO v_operating_in
  FROM public.invoices i
  WHERE i.company_id = p_company_id
    AND i.type = 'sale'
    AND i.status IN ('paid', 'partially_paid')
    AND i.payment_method = 'cash'
    AND i.issue_date BETWEEN p_from AND p_to
    AND i.deleted_at IS NULL
    AND (p_branch_id IS NULL OR i.branch_id = p_branch_id);

  -- Operating outflow (expenses paid)
  SELECT COALESCE(SUM(e.amount), 0) INTO v_operating_out
  FROM public.expenses e
  WHERE e.company_id = p_company_id
    AND e.status = 'posted'
    AND e.payment_method IN ('cash', 'bank')
    AND e.expense_date BETWEEN p_from AND p_to
    AND e.deleted_at IS NULL
    AND (p_branch_id IS NULL OR e.branch_id = p_branch_id);

  -- Receipt bonds
  SELECT COALESCE(SUM(p.amount), 0) INTO v_financing_in
  FROM public.payments p
  WHERE p.company_id = p_company_id
    AND p.type = 'receipt'
    AND p.status = 'posted'
    AND p.payment_date BETWEEN p_from AND p_to
    AND p.deleted_at IS NULL
    AND (p_branch_id IS NULL OR p.branch_id = p_branch_id);

  -- Payment bonds
  SELECT COALESCE(SUM(p.amount), 0) INTO v_financing_out
  FROM public.payments p
  WHERE p.company_id = p_company_id
    AND p.type = 'disbursement'
    AND p.status = 'posted'
    AND p.payment_date BETWEEN p_from AND p_to
    AND p.deleted_at IS NULL
    AND (p_branch_id IS NULL OR p.branch_id = p_branch_id);

  category := 'التشغيل'; inflow := v_operating_in; outflow := v_operating_out; RETURN NEXT;
  category := 'الاستثمار'; inflow := 0; outflow := 0; RETURN NEXT;
  category := 'التمويل'; inflow := v_financing_in; outflow := v_financing_out; RETURN NEXT;
END;
$function$;

-- ============================================================
-- 4) Defensive privileges for the new signatures
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_cash_flow(uuid, date, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_cash_flow(uuid, date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_cash_flow(uuid, date, date, uuid) TO authenticated;

