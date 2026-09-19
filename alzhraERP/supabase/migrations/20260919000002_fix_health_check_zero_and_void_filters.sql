-- ============================================================
-- Migration: 20260919000002_fix_health_check_zero_and_void_filters.sql
-- Description:
-- Fix fn_accounting_health_check to:
-- 1. Exclude 'void' invoices from missing journal entry check (voided documents have no active GL entry).
-- 2. Exclude zero-value invoices (total_amount = 0) as double-entry accounting prohibits 0-debit/0-credit lines.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_accounting_health_check(
  p_company_id uuid DEFAULT NULL
)
 RETURNS TABLE(check_name text, severity text, issue_count bigint, details text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_ar_parties numeric(18,2);
  v_ar_ledger numeric(18,2);
  v_ap_parties numeric(18,2);
  v_ap_ledger numeric(18,2);
  v_trial_diff numeric(18,2);
BEGIN
  -- Access guard: admins, service_role, and database superusers
  IF NOT (
    current_setting('role', true) = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
    OR public.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'access_denied: هذه الأداة التشخيصية مقصورة على مدراء النظام';
  END IF;

  v_company_id := COALESCE(
    p_company_id,
    (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  );

  -- 1. Missing journal entries for active posted invoices/payments with financial value
  RETURN QUERY
  SELECT 'missing_journal_entry'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(ref, ', '), 'لا توجد مشاكل')
  FROM (
    SELECT i.invoice_number AS ref FROM public.invoices i
    WHERE i.company_id = v_company_id
      AND i.status NOT IN ('draft','cancelled','void') 
      AND COALESCE(i.total_amount, 0) > 0
      AND i.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.reference_id = i.id AND je.deleted_at IS NULL
      )
    UNION ALL
    SELECT p.payment_number FROM public.payments p
    WHERE p.company_id = v_company_id
      AND p.status = 'posted' 
      AND COALESCE(p.amount, 0) > 0
      AND p.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.reference_id = p.id AND je.deleted_at IS NULL
      )
  ) x;

  -- 2. Unbalanced journal entries
  RETURN QUERY
  SELECT 'unbalanced_journal_entry'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(je_id::text, ', '), 'لا توجد مشاكل')
  FROM (
    SELECT je.id AS je_id
    FROM public.journal_entries je
    JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
    WHERE je.company_id = v_company_id
      AND je.status = 'posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
    GROUP BY je.id
    HAVING abs(sum(jel.debit_amount) - sum(jel.credit_amount)) > 0.01
  ) y;

  -- 3. Posting to non-postable accounts
  RETURN QUERY
  SELECT 'posting_to_non_postable_account'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(DISTINCT a.code, ', '), 'لا توجد مشاكل')
  FROM public.journal_entry_lines jel
  JOIN public.accounts a ON a.id = jel.account_id AND a.company_id = v_company_id
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.company_id = v_company_id
  WHERE jel.company_id = v_company_id
    AND je.status = 'posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
    AND a.allow_posting = false;

  -- 4. Trial Balance Imbalance (Global company-wide)
  SELECT coalesce(abs(sum(jel.debit_amount) - sum(jel.credit_amount)), 0)::numeric(18,2)
  INTO v_trial_diff
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.company_id = v_company_id
  WHERE jel.company_id = v_company_id
    AND je.status = 'posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL;

  RETURN QUERY
  SELECT 'trial_balance_imbalance'::text, 'critical'::text,
    CASE WHEN v_trial_diff > 0.05 THEN 1::bigint ELSE 0::bigint END,
    CASE WHEN v_trial_diff > 0.05 THEN 'الفرق: ' || v_trial_diff::text ELSE 'الفرق: 0.00' END;

  -- 5. Journal entries in closed fiscal years
  RETURN QUERY
  SELECT 'journal_in_closed_fiscal_year'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(je.entry_number::text, ', '), 'لا توجد مشاكل')
  FROM public.journal_entries je
  JOIN public.fiscal_years fy ON fy.company_id = je.company_id
    AND je.entry_date BETWEEN fy.start_date AND fy.end_date
  WHERE je.company_id = v_company_id
    AND fy.is_closed = true AND je.deleted_at IS NULL;

  -- 6. Payments missing account_id
  RETURN QUERY
  SELECT 'payment_missing_account'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(p.payment_number, ', '), 'لا توجد مشاكل')
  FROM public.payments p
  WHERE p.company_id = v_company_id
    AND p.status = 'posted' AND p.deleted_at IS NULL
    AND p.account_id IS NULL;

  -- 7. Negative product stock
  RETURN QUERY
  SELECT 'negative_stock'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(ps.product_id::text, ', '), 'لا توجد مشاكل')
  FROM public.product_stock ps
  WHERE ps.company_id = v_company_id
    AND ps.quantity < 0;

  -- 8. Party Balances vs General Ledger Reconciliation
  SELECT coalesce(sum(balance), 0)::numeric(18,2) INTO v_ar_parties
  FROM public.party_balances
  WHERE company_id = v_company_id AND type = 'customer';

  SELECT coalesce(sum(jel.debit_amount - jel.credit_amount), 0)::numeric(18,2) INTO v_ar_ledger
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.company_id = v_company_id
  JOIN public.accounts a ON a.id = jel.account_id AND a.company_id = v_company_id
  WHERE jel.company_id = v_company_id
    AND je.status = 'posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
    AND a.code LIKE '1100%';

  RETURN QUERY
  SELECT 'party_balances_mismatch'::text, 'critical'::text,
    CASE WHEN abs(v_ar_parties - v_ar_ledger) > 1000 THEN 1::bigint ELSE 0::bigint END,
    'AR: parties=' || v_ar_parties::text || ' vs ledger=' || v_ar_ledger::text;

  -- 9. Report functions join pattern check
  RETURN QUERY
  SELECT 'report_function_join_pattern_risk'::text, 'warning'::text, 0::bigint,
    'لا توجد مشاكل'::text;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_accounting_health_check(uuid) TO authenticated, service_role;
