-- ============================================================
-- Detailed Profit & Loss report (per-account breakdown)
-- ------------------------------------------------------------
-- Problem (found in code review 2026-08-26):
--   report_profit_loss returns ONLY three aggregated rows
--   (revenue / expense / net_profit). Both P&L surfaces
--   (Accounting → قائمة الدخل، Reports) could therefore display a
--   single synthetic line per side with no account detail, even
--   though the UI iterates arrays of line items.
--
-- Fix:
--   New RPC `report_profit_loss_detailed` returning ONE ROW PER
--   ACCOUNT that had activity in the period, using the exact same
--   conventions as report_profit_loss / report_trial_balance:
--     * SECURITY DEFINER + pinned search_path
--     * access gated by fn_assert_company_access(p_company_id)
--     * posted journals only (je.status='posted'), soft-delete aware
--       on BOTH the entry and its lines
--     * period filter on je.entry_date BETWEEN p_from AND p_to
--     * branch filter on journal_entry_lines.branch_id (line level,
--       mirroring the existing functions)
--     * sign convention: revenue = credit − debit (positive normal),
--       expense = debit − credit (positive normal) → both sides come
--       back positive, ready for direct display
--   Row shape intentionally matches report_trial_balance
--   (account_id/account_code/account_name/account_type/total_debit/
--    total_credit/balance) so the frontend mapping is shared.
--
-- The aggregate report_profit_loss is KEPT UNCHANGED: it remains the
-- fallback when this migration has not been applied yet, and other
-- callers depend on it.
-- Date: 2026-08-26
-- ============================================================

BEGIN;

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
    balance numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      END AS balance
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

GRANT EXECUTE ON FUNCTION public.report_profit_loss_detailed(uuid, date, date, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.report_profit_loss_detailed(uuid, date, date, uuid) FROM anon, PUBLIC;

COMMIT;
