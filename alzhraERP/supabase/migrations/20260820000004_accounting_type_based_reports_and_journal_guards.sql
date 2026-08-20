-- ============================================================
-- Accounting accuracy phase 3 (R1 + R2 + R3 from the 2026-08-20 audit)
-- ------------------------------------------------------------
-- 2026-08-20
--
-- R1 — Report classification by account TYPE instead of code prefix:
--   report_balance_sheet / report_profit_loss used to filter accounts by
--   `a.code LIKE '1%'/'2%'/'3%'/'4%'/'5%'`, while get_account_ledger,
--   report_trial_balance, report_account_balances and get_monthly_performance
--   classify by `a.type`. Consequences of the old code-prefix logic:
--     * a custom asset coded '7001' was silently EXCLUDED from the balance sheet;
--     * an expense coded '1999' was WRONGLY added to assets AND to expenses;
--     * a custom revenue coded '9100' never reached the income statement.
--   Fix: classify by `a.type` in both report functions (signatures unchanged).
--
-- R2 — Zero-amount journals can no longer be posted:
--   (a) post_manual_journal rejects empty / all-zero lines inline;
--   (b) check_journal_balance (the deferred `ensure_journal_balance`
--       constraint trigger) rejects a POSTED journal whose lines total zero,
--       covering every auto-posting path (invoices, payments, reversals).
--       Draft journals may still exist without lines until they are posted.
--
-- R3 — post_manual_journal input hardening:
--   * p_exchange_rate must be > 0 (a 0 / negative rate would zero out the
--     whole entry and silently produce a zero journal);
--   * created_by comes from auth.uid() (falling back to p_user_id only when
--     there is no session, e.g. service-role contexts) so an authenticated
--     client cannot spoof the attribution;
--   * the two RAISE EXCEPTION messages that were stored with corrupted
--     encoding (?-marks) are rewritten in proper UTF-8 Arabic.
--
-- No function signature changed, so existing GRANTs and callers keep
-- working. Defensive REVOKE/GRANT statements are included (same pattern
-- as migrations 20260819000010 / 20260819000014).
-- ============================================================

-- ============================================================
-- 1) report_profit_loss — classify by account type
-- ============================================================

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

  -- Revenue (accounts classified as revenue by type)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_revenue
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.type = 'revenue'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  -- Expenses (accounts classified as expense by type)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_expense
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.type = 'expense'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  v_net_profit := v_revenue - v_expense;
  v_gross_profit := v_revenue;

  -- Return rows
  category := 'الإيرادات'; amount := v_revenue; type := 'revenue'; RETURN NEXT;
  category := 'المصروفات'; amount := v_expense; type := 'expense'; RETURN NEXT;
  category := 'صافي الربح/الخسارة'; amount := v_net_profit; type := 'net_profit'; RETURN NEXT;
END;
$function$;

-- ============================================================
-- 2) report_balance_sheet — classify by account type
-- ============================================================

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
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Assets (accounts classified as asset by type)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_assets
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.type = 'asset'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  -- Liabilities (accounts classified as liability by type)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_liabilities
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.type = 'liability'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date <= v_date
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  -- Equity (accounts classified as equity by type)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_equity
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.type = 'equity'
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
-- 3) post_manual_journal — zero-journal + exchange-rate guards,
--    session-based attribution and clean Arabic messages
-- ============================================================

CREATE OR REPLACE FUNCTION public.post_manual_journal(p_company_id uuid, p_user_id uuid, p_date date, p_description text, p_lines jsonb, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_reference_type text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_journal_id   uuid;
  v_line         RECORD;
  v_base_debit   numeric;
  v_base_credit  numeric;
  v_foreign_amt  numeric;
  v_total_debit  numeric := 0;
  v_total_credit numeric := 0;
  v_created_by   uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية ترحيل القيود المحاسبية لهذه الشركة';
  END IF;

  -- R3: a non-positive exchange rate would silently zero out the whole entry.
  IF p_exchange_rate IS NULL OR p_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'سعر صرف غير صالح: يجب أن يكون أكبر من صفر';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id
      AND p_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'لا توجد سنة مالية مفتوحة تغطي تاريخ القيد المحدد';
  END IF;

  -- R2a: reject an empty payload before jsonb_to_recordset returns nothing.
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'لا يمكن ترحيل قيد بدون أسطر';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
    AS x(debit numeric, credit numeric)
  LOOP
    v_total_debit  := v_total_debit  + ROUND(COALESCE(v_line.debit,  0) * p_exchange_rate, 4);
    v_total_credit := v_total_credit + ROUND(COALESCE(v_line.credit, 0) * p_exchange_rate, 4);
  END LOOP;

  -- R2b: reject all-zero journals (the debit side must carry real value).
  IF v_total_debit <= 0 THEN
    RAISE EXCEPTION 'لا يمكن ترحيل قيد بقيمة صفرية: إجمالي المدين = %', v_total_debit;
  END IF;

  IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
    RAISE EXCEPTION 'القيد غير متوازن: المدين (%) لا يساوي الدائن (%)', v_total_debit, v_total_credit;
  END IF;

  -- R3: attribution comes from the authenticated session when available
  -- (service-role / server contexts fall back to the provided user id).
  v_created_by := COALESCE(auth.uid(), p_user_id);

  INSERT INTO journal_entries(
    company_id, branch_id, entry_date, description, reference_type, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, p_date, p_description,
    COALESCE(p_reference_type, 'manual'), 'draft', v_created_by
  ) RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
    AS x(account_id uuid, party_id uuid, debit numeric, credit numeric, description text)
  LOOP
    v_base_debit  := ROUND(COALESCE(v_line.debit,  0) * p_exchange_rate, 4);
    v_base_credit := ROUND(COALESCE(v_line.credit, 0) * p_exchange_rate, 4);
    v_foreign_amt := GREATEST(COALESCE(v_line.debit, 0), COALESCE(v_line.credit, 0));

    INSERT INTO journal_entry_lines(
      journal_entry_id, account_id, party_id,
      debit_amount, credit_amount, description,
      currency_code, exchange_rate, foreign_amount, company_id, branch_id
    ) VALUES (
      v_journal_id, v_line.account_id, v_line.party_id,
      v_base_debit, v_base_credit,
      COALESCE(v_line.description, p_description),
      p_currency_code, p_exchange_rate, v_foreign_amt,
      p_company_id, p_branch_id
    );
  END LOOP;

  UPDATE journal_entries SET status = 'posted' WHERE id = v_journal_id;

  RETURN v_journal_id;
END;
$function$;

-- ============================================================
-- 4) check_journal_balance — reject POSTED zero-amount journals
--    (fired by the deferred `ensure_journal_balance` constraint
--    trigger at COMMIT time; protects every auto-posting path)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_journal_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_debit  NUMERIC;
  v_total_credit NUMERIC;
  v_entry_id     UUID;
  v_status       TEXT;
BEGIN
  v_entry_id := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  SELECT
    COALESCE(SUM(debit_amount),  0),
    COALESCE(SUM(credit_amount), 0)
  INTO v_total_debit, v_total_credit
  FROM public.journal_entry_lines
  WHERE journal_entry_id = v_entry_id AND deleted_at IS NULL;

  IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
    RAISE EXCEPTION 'القيد غير متوازن: المدين = %, الدائن = %',
      v_total_debit, v_total_credit;
  END IF;

  -- R2b: a POSTED journal must carry real amounts. Draft journals may
  -- legitimately exist without lines until they are posted, so the
  -- zero check is scoped to posted journals only.
  SELECT status INTO v_status
  FROM public.journal_entries
  WHERE id = v_entry_id AND deleted_at IS NULL;

  IF v_status = 'posted' AND (v_total_debit + v_total_credit) <= 0 THEN
    RAISE EXCEPTION 'لا يمكن أن يبقى قيد مرحّل بقيمة صفرية (القيد %)', v_entry_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 5) Defensive privileges (same pattern as migrations 10/14)
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.post_manual_journal(uuid, uuid, date, text, jsonb, text, numeric, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.post_manual_journal(uuid, uuid, date, text, jsonb, text, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_manual_journal(uuid, uuid, date, text, jsonb, text, numeric, text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_balance_sheet(uuid, date, uuid) TO authenticated;
