-- =============================================================================
-- Migration: 20260908000006_fix_health_check_company_isolation.sql
-- Purpose:   Fix fn_accounting_health_check cross-tenant data leak in
--            party_balances_mismatch check. Previously it queried
--            party_balances without company_id filter, mixing data from
--            ALL companies (multi-tenant bug => false mismatch of ~230k SAR).
--
--            Also add p_company_id parameter so each company can run the
--            check against its own data specifically.
-- =============================================================================

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
BEGIN
  -- Access guard: only admins and service_role
  IF NOT (current_setting('role', true) = 'service_role' OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'access_denied: هذه الأداة التشخيصية مقصورة على مدراء النظام';
  END IF;

  -- Resolve company context: explicit param > current user's company
  v_company_id := COALESCE(
    p_company_id,
    (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  );

  -- 1. Missing journal entries for posted invoices/payments
  RETURN QUERY
  SELECT 'missing_journal_entry'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(ref, ', '), 'لا توجد مشاكل')
  FROM (
    SELECT i.invoice_number AS ref FROM invoices i
    WHERE i.company_id = v_company_id
      AND i.status NOT IN ('draft','cancelled') AND i.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM journal_entries je
        WHERE je.reference_id = i.id AND je.deleted_at IS NULL
      )
    UNION ALL
    SELECT p.payment_number FROM payments p
    WHERE p.company_id = v_company_id
      AND p.status = 'posted' AND p.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM journal_entries je
        WHERE je.reference_id = p.id AND je.deleted_at IS NULL
      )
  ) x;

  -- 2. Unbalanced journal entries (debit ≠ credit)
  RETURN QUERY
  SELECT 'unbalanced_journal_entry'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(entry_number::text, ', '), 'لا توجد مشاكل')
  FROM (
    SELECT je.entry_number
    FROM journal_entries je
    JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id AND jel.deleted_at IS NULL
    WHERE je.company_id = v_company_id AND je.deleted_at IS NULL
    GROUP BY je.id, je.entry_number
    HAVING ROUND(SUM(jel.debit_amount) - SUM(jel.credit_amount), 2) <> 0
  ) x;

  -- 3. Posting to non-postable or inactive accounts
  RETURN QUERY
  SELECT 'posting_to_non_postable_account'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(a.code, ', '), 'لا توجد مشاكل')
  FROM journal_entry_lines jel
  JOIN accounts a ON a.id = jel.account_id
  WHERE a.company_id = v_company_id
    AND jel.deleted_at IS NULL
    AND (a.allow_posting = false OR a.is_active = false);

  -- 4. Trial balance imbalance (total debit ≠ total credit)
  RETURN QUERY
  SELECT 'trial_balance_imbalance'::text, 'critical'::text,
    CASE WHEN ABS(COALESCE(SUM(total_debit),0) - COALESCE(SUM(total_credit),0)) > 0.01
         THEN 1 ELSE 0 END::bigint,
    'الفرق: ' || ROUND(COALESCE(SUM(total_debit),0) - COALESCE(SUM(total_credit),0), 2)::text
  FROM vw_trial_balance
  WHERE company_id = v_company_id;

  -- 5. Journal entries in closed fiscal year
  RETURN QUERY
  SELECT 'journal_in_closed_fiscal_year'::text, 'critical'::text, count(*)::bigint,
    coalesce(string_agg(je.entry_number::text, ', '), 'لا توجد مشاكل')
  FROM journal_entries je
  JOIN fiscal_years fy ON fy.company_id = je.company_id
    AND je.entry_date BETWEEN fy.start_date AND fy.end_date
  WHERE je.company_id = v_company_id
    AND fy.is_closed = true AND je.deleted_at IS NULL;

  -- 6. Payments posted without a cash/bank account linked
  RETURN QUERY
  SELECT 'payment_missing_account'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(payment_number, ', '), 'لا توجد مشاكل')
  FROM payments
  WHERE company_id = v_company_id
    AND status = 'posted' AND account_id IS NULL AND deleted_at IS NULL;

  -- 7. Products with negative stock
  RETURN QUERY
  SELECT 'negative_stock'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(product_id::text, ', '), 'لا توجد مشاكل')
  FROM product_stock
  WHERE company_id = v_company_id AND quantity < 0;

  -- 8. AR sub-ledger (party_balances customers) vs GL account 1100
  --    FIX: Filter BOTH sides by v_company_id to prevent cross-tenant mismatch.
  RETURN QUERY
  SELECT 'party_balances_mismatch'::text, 'critical'::text,
    CASE WHEN ABS(
      COALESCE((
        SELECT SUM(balance) FROM party_balances
        WHERE type = 'customer' AND company_id = v_company_id
      ), 0)
      - COALESCE((
        SELECT net_balance FROM vw_trial_balance
        WHERE code = '1100' AND company_id = v_company_id
        LIMIT 1
      ), 0)
    ) > 0.01 THEN 1 ELSE 0 END::bigint,
    'AR: parties=' || COALESCE((
        SELECT SUM(balance) FROM party_balances
        WHERE type = 'customer' AND company_id = v_company_id
      ), 0)::text
    || ' vs ledger=' || COALESCE((
        SELECT net_balance FROM vw_trial_balance
        WHERE code = '1100' AND company_id = v_company_id
        LIMIT 1
      ), 0)::text;

  -- 9. Report function join pattern risk (cross-schema check, company-agnostic)
  RETURN QUERY
  SELECT 'report_function_join_pattern_risk'::text, 'warning'::text, count(*)::bigint,
    coalesce(string_agg(p.proname, ', '), 'لا توجد مشاكل')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'report_%'
    AND pg_get_functiondef(p.oid) ~* 'LEFT\s+JOIN\s+journal_entry_lines\s+jel\s+ON\s+a\.id\s*=\s*jel\.account_id\s+AND\s+jel\.deleted_at\s+IS\s+NULL\s*$';

END;
$function$;

-- Update privileges to allow calling with optional company_id param
GRANT EXECUTE ON FUNCTION fn_accounting_health_check(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION fn_accounting_health_check(uuid) FROM anon;
