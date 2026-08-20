-- ============================================================
-- Cumulative account balances (Phase 2.2 of the accounting audit)
-- ------------------------------------------------------------
-- 2026-08-19
--
-- H3 fix: `accountsService.getAccounts({ includeBalances: true })` used
-- `report_trial_balance` with `p_from = Jan 1 of the current calendar year`,
-- so opening balances from PREVIOUS years were excluded from
-- `Account.balance`. That made the chart-of-accounts tree, the treasury
-- sidebar and the POS / sales / purchase cash-fund balances wrong whenever
-- the company had movements before Jan 1.
--
-- This migration adds `report_account_balances`, which returns the TRUE
-- cumulative balance (all posted movements up to p_as_of_date) for every
-- account, with the standard tenant access check (C1 lesson) from the start.
-- ============================================================

CREATE OR REPLACE FUNCTION public.report_account_balances(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_as_of_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(account_id uuid, balance numeric, total_debit numeric, total_credit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  RETURN QUERY
  SELECT l.account_id,
         SUM(l.debit_amount) - SUM(l.credit_amount) AS balance,
         SUM(l.debit_amount) AS total_debit,
         SUM(l.credit_amount) AS total_credit
  FROM public.journal_entry_lines l
  JOIN public.journal_entries j ON j.id = l.journal_entry_id
  WHERE j.company_id = p_company_id
    AND j.status = 'posted'
    AND j.deleted_at IS NULL
    AND l.deleted_at IS NULL
    AND j.entry_date <= p_as_of_date
    AND (p_branch_id IS NULL OR l.branch_id = p_branch_id)
  GROUP BY l.account_id
  ORDER BY l.account_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.report_account_balances(uuid, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_account_balances(uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_account_balances(uuid, uuid, date) TO authenticated;
