-- ============================================================
-- Debt & Collection correctness tests (deep audit 2026-09-11)
-- ============================================================
-- Verifies against a real database (as a role that bypasses RLS):
--   T1  fn_to_base_amount dual-convention (divide / multiply / inverse)
--   T2  Bond journal lines are stored in BASE currency with foreign_amount
--       preserved (units unification — 20260911000001)
--   T3  create_financial_bond allocation: same currency updates
--       invoices.paid_amount; cross-currency allocation raises
--   T4  party_balances = base journal sum + converted opening balance
--   T5  party_balances_by_currency = per-currency foreign balance
--   T6  get_debt_analytics_summary.total_receivables = base conversion
--   T7  get_debt_followup_dashboard includes status 'confirmed'
--   T8  get_party_statement starts from the opening balance (stable order)
--   T9  'both' party receipt posts without exception
--
-- HOW TO RUN:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/test_debt_collection_correctness.sql
-- The whole script runs inside ONE transaction that is ROLLED BACK.
-- ============================================================

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_uid     uuid;
  v_company uuid;
  v_customer uuid;
  v_supplier uuid;
  v_both    uuid;
  v_cash    uuid;
  v_inv_yer uuid;
  v_inv_sar uuid;
  v_inv_confirmed uuid;
  v_inv_usd uuid;
  v_jid     uuid;
  v_val     numeric;
  v_cnt     bigint;
  v_txt     text;
  v_rows    json;
BEGIN
  SELECT id INTO v_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'debt correctness test requires at least one user in auth.users';
  END IF;

  INSERT INTO public.companies (name_ar) VALUES ('__debt_collection_test__')
  RETURNING id INTO v_company;

  PERFORM set_config('request.jwt.claim.sub', v_uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  INSERT INTO user_company_roles(user_id, company_id, role)
  VALUES (v_uid, v_company, 'accountant');

  INSERT INTO fiscal_years(company_id, name, start_date, end_date, is_closed)
  VALUES (v_company, 'FY2026', DATE '2026-01-01', DATE '2026-12-31', false);

  -- ── Currencies (global config; rolled back with the transaction) ──────
  INSERT INTO public.supported_currencies(code, name_ar, symbol, exchange_operator)
  VALUES ('YER', 'ريال يمني', 'ر.ي', 'divide')
  ON CONFLICT (code) DO UPDATE SET exchange_operator = 'divide';
  INSERT INTO public.supported_currencies(code, name_ar, symbol, exchange_operator)
  VALUES ('USD', 'دولار', '$', 'multiply')
  ON CONFLICT (code) DO UPDATE SET exchange_operator = 'multiply';

  INSERT INTO public.exchange_rates(company_id, currency_code, rate_to_base, effective_date)
  VALUES (v_company, 'YER', 410, DATE '2026-01-01'),
         (v_company, 'USD', 3.75, DATE '2026-01-01');

  INSERT INTO public.parties(company_id, name, type)
  VALUES (v_company, '__test_customer__', 'customer') RETURNING id INTO v_customer;
  INSERT INTO public.parties(company_id, name, type)
  VALUES (v_company, '__test_supplier__', 'supplier') RETURNING id INTO v_supplier;
  INSERT INTO public.parties(company_id, name, type)
  VALUES (v_company, '__test_both__', 'both') RETURNING id INTO v_both;

  -- Chart of accounts required by the auto-post triggers
  INSERT INTO accounts(company_id, code, name_ar, type, currency_code, allow_posting)
  VALUES (v_company, '1100', 'مدينون', 'asset', 'SAR', true);
  INSERT INTO accounts(company_id, code, name_ar, type, currency_code, allow_posting)
  VALUES (v_company, '2100', 'دائنون', 'liability', 'SAR', true);
  INSERT INTO accounts(company_id, code, name_ar, type, currency_code, allow_posting)
  VALUES (v_company, '4100', 'إيرادات', 'revenue', 'SAR', true);
  INSERT INTO accounts(company_id, code, name_ar, type, currency_code, allow_posting)
  VALUES (v_company, '2200', 'ضريبة', 'liability', 'SAR', true);
  INSERT INTO accounts(company_id, code, name_ar, type, currency_code, allow_posting)
  VALUES (v_company, '1200', 'مخزون', 'asset', 'SAR', true);
  INSERT INTO accounts(company_id, code, name_ar, type, currency_code, allow_posting)
  VALUES (v_company, '5100', 'تكلفة مبيعات', 'expense', 'SAR', true);
  INSERT INTO accounts(company_id, code, name_ar, type, currency_code, allow_posting)
  VALUES (v_company, '1001', 'الصندوق', 'asset', 'SAR', true)
  RETURNING id INTO v_cash;

  -- Opening balance for the customer: 5,000 YER receivable
  INSERT INTO public.party_opening_balances(company_id, party_id, currency_code, amount, direction, entry_date)
  VALUES (v_company, v_customer, 'YER', 5000, 'debit', DATE '2026-01-01');

  -- ═══ T1: fn_to_base_amount dual convention ═══
  v_val := public.fn_to_base_amount('SAR', 123.456, 1);
  ASSERT ABS(v_val - 123.456) < 0.001, 'T1 FAIL: SAR passthrough = ' || v_val::text;

  v_val := public.fn_to_base_amount('YER', 41000, 410);
  ASSERT ABS(v_val - 100) < 0.001, 'T1 FAIL: YER divide = ' || v_val::text;

  v_val := public.fn_to_base_amount('YER', 100000, 0.002439);
  ASSERT ABS(v_val - 243.9024) < 0.01, 'T1 FAIL: YER inverse = ' || v_val::text;

  v_val := public.fn_to_base_amount('USD', 100, 3.75);
  ASSERT ABS(v_val - 375) < 0.001, 'T1 FAIL: USD multiply = ' || v_val::text;

  v_val := public.fn_to_base_amount('YER', 555, 0);
  ASSERT ABS(v_val - 555) < 0.001, 'T1 FAIL: zero rate = ' || v_val::text;

  -- ── Invoices ──────────────────────────────────────────────────────────
  INSERT INTO public.invoices(
    company_id, party_id, invoice_number, type, status, total_amount, subtotal,
    tax_amount, discount_amount, issue_date, due_date, payment_method,
    currency_code, exchange_rate, paid_amount, created_by
  ) VALUES (
    v_company, v_customer, 'T-YER-0001', 'sale', 'posted', 100000, 100000,
    0, 0, DATE '2026-06-01', DATE '2026-07-01', 'credit', 'YER', 410, 0, v_uid
  ) RETURNING id INTO v_inv_yer;

  INSERT INTO public.invoices(
    company_id, party_id, invoice_number, type, status, total_amount, subtotal,
    tax_amount, discount_amount, issue_date, due_date, payment_method,
    currency_code, exchange_rate, paid_amount, created_by
  ) VALUES (
    v_company, v_customer, 'T-SAR-0002', 'sale', 'partially_paid', 500, 500,
    0, 0, DATE '2026-06-02', DATE '2026-07-02', 'credit', 'SAR', 1, 200, v_uid
  ) RETURNING id INTO v_inv_sar;

  INSERT INTO public.invoices(
    company_id, party_id, invoice_number, type, status, total_amount, subtotal,
    tax_amount, discount_amount, issue_date, due_date, payment_method,
    currency_code, exchange_rate, paid_amount, created_by
  ) VALUES (
    v_company, v_customer, 'T-SAR-0003', 'sale', 'confirmed', 300, 300,
    0, 0, DATE '2026-06-03', DATE '2026-08-03', 'credit', 'SAR', 1, 0, v_uid
  ) RETURNING id INTO v_inv_confirmed;

  INSERT INTO public.invoices(
    company_id, party_id, invoice_number, type, status, total_amount, subtotal,
    tax_amount, discount_amount, issue_date, due_date, payment_method,
    currency_code, exchange_rate, paid_amount, created_by
  ) VALUES (
    v_company, v_supplier, 'T-USD-0004', 'purchase', 'posted', 100, 100,
    0, 0, DATE '2026-06-04', DATE '2026-07-04', 'credit', 'USD', 3.75, 0, v_uid
  ) RETURNING id INTO v_inv_usd;

  -- ═══ T2: receipt bond journal units (YER 30,000 @ 410) ═══
  -- Same-currency allocation → paid_amount updated by 30,000
  PERFORM public.create_financial_bond(
    v_company, 'receipt', 30000, 'YER', 410, 30000, DATE '2026-06-10',
    v_cash, v_customer, 'party', 'تحصيل اختبار', v_inv_yer, v_uid
  );

  SELECT paid_amount INTO v_val FROM public.invoices WHERE id = v_inv_yer;
  ASSERT ABS(v_val - 30000) < 0.001, 'T3 FAIL: paid_amount = ' || COALESCE(v_val::text, 'NULL');

  -- The bond journal line must be in BASE currency (30000 / 410) with
  -- foreign_amount = 30000 preserved.
  SELECT jel.credit_amount INTO v_val
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE je.company_id = v_company AND je.reference_type = 'receipt_bond'
    AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
    AND a.code = '1100';
  ASSERT ABS(v_val - 73.1707) < 0.01, 'T2 FAIL: bond AR base credit = ' || COALESCE(v_val::text, 'NULL');

  SELECT jel.foreign_amount INTO v_val
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE je.company_id = v_company AND je.reference_type = 'receipt_bond'
    AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
    AND a.code = '1100';
  ASSERT ABS(v_val - 30000) < 0.001, 'T2 FAIL: bond AR foreign = ' || COALESCE(v_val::text, 'NULL');

  -- Cross-currency allocation (YER bond → SAR invoice) must raise
  BEGIN
    PERFORM public.create_financial_bond(
      v_company, 'receipt', 100, 'YER', 410, 100, DATE '2026-06-11',
      v_cash, v_customer, 'party', 'cross-currency', v_inv_sar, v_uid
    );
    RAISE EXCEPTION 'T3 FAIL: cross-currency allocation did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      v_txt := SQLERRM;
      IF v_txt LIKE '%did not raise%' THEN
        RAISE;
      END IF;
      -- The guard message mentions the mismatch — accept any raise
      IF v_txt NOT LIKE '%تختلف%' AND v_txt NOT LIKE '%عملة%' THEN
        RAISE EXCEPTION 'T3 FAIL: unexpected error: %', v_txt;
      END IF;
  END;
  -- ═══ T4: party_balances = base journal sum + converted opening ═══
  -- YER journal: 100000/410 = 243.9024 (invoice) - 30000/410 = 73.1707 (bond)
  --              = 170.7317 ; opening 5000/410 = 12.1951 ; YER total = 182.9268
  -- Plus SAR invoices: (500 - 200) + 300 = 600 ; Total = 782.9268
  SELECT balance INTO v_val
  FROM public.party_balances
  WHERE company_id = v_company AND party_id = v_customer;
  ASSERT ABS(v_val - 782.9268) < 0.01, 'T4 FAIL: customer party_balances = ' || COALESCE(v_val::text, 'NULL');

  -- Supplier: USD purchase 100 @ 3.75 → +375 base
  SELECT balance INTO v_val
  FROM public.party_balances
  WHERE company_id = v_company AND party_id = v_supplier;
  ASSERT ABS(v_val - 375) < 0.01, 'T4 FAIL: supplier party_balances = ' || COALESCE(v_val::text, 'NULL');

  -- ═══ T5: party_balances_by_currency (per-currency foreign balance) ═══
  -- YER row: invoice remaining (70000) + opening (5000) = 75000
  SELECT balance INTO v_val
  FROM public.party_balances_by_currency
  WHERE company_id = v_company AND party_id = v_customer AND currency_code = 'YER';
  ASSERT ABS(v_val - 75000) < 0.01, 'T5 FAIL: customer YER = ' || COALESCE(v_val::text, 'NULL');

  -- SAR row: 500 - 200 + 300 (confirmed) = 600
  SELECT balance INTO v_val
  FROM public.party_balances_by_currency
  WHERE company_id = v_company AND party_id = v_customer AND currency_code = 'SAR';
  ASSERT ABS(v_val - 600) < 0.01, 'T5 FAIL: customer SAR = ' || COALESCE(v_val::text, 'NULL');

  -- Supplier USD row: 100
  SELECT balance INTO v_val
  FROM public.party_balances_by_currency
  WHERE company_id = v_company AND party_id = v_supplier AND currency_code = 'USD';
  ASSERT ABS(v_val - 100) < 0.01, 'T5 FAIL: supplier USD = ' || COALESCE(v_val::text, 'NULL');

  -- ═══ T6: analytics total_receivables = base conversion ═══
  -- YER: 75000/410 = 182.9268 ; SAR: 600 ; total = 782.9268
  SELECT (raw::jsonb ->> 'total_receivables')::numeric INTO v_val
  FROM (SELECT public.get_debt_analytics_summary(v_company) AS raw) s;
  ASSERT ABS(v_val - 782.9268) < 0.01, 'T6 FAIL: total_receivables = ' || COALESCE(v_val::text, 'NULL');

  -- ═══ T7: follow-up dashboard includes status 'confirmed' ═══
  -- (the confirmed invoice's remaining 300 SAR must be represented)
  SELECT COALESCE(SUM(d.outstanding_balance), 0) INTO v_val
  FROM public.get_debt_followup_dashboard(v_company) d
  WHERE d.party_id = v_customer;
  -- YER remaining+opening raw: 70000 + 5000 = 75000 ; SAR remaining+confirmed: 300 + 300 = 600
  ASSERT ABS(v_val - 75600) < 0.01, 'T7 FAIL: dashboard customer outstanding = ' || COALESCE(v_val::text, 'NULL');

  -- ═══ T8: get_party_statement starts from the opening balance ═══
  v_rows := public.get_party_statement(v_company, v_customer);
  -- The YER opening balance row (dated 2026-01-01, before every movement) must be first
  v_txt := (v_rows::jsonb -> 0 ->> 'ref');
  ASSERT v_txt = 'OB', 'T8 FAIL: first statement row ref = ' || COALESCE(v_txt, 'NULL');

  -- ═══ T9: 'both' party receipt posts without exception ═══
  PERFORM public.create_financial_bond(
    v_company, 'receipt', 50, 'SAR', 1, 50, DATE '2026-06-15',
    v_cash, v_both, 'party', 'قبض من طرف مزدوج', NULL, v_uid
  );
  SELECT COUNT(*) INTO v_cnt
  FROM public.journal_entries je
  JOIN public.accounts a ON a.id = (
    SELECT id FROM public.accounts
    WHERE company_id = v_company AND code = '1100' LIMIT 1)
  JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id AND jel.account_id = a.id
  WHERE je.company_id = v_company AND je.deleted_at IS NULL
    AND je.reference_type = 'receipt_bond' AND jel.deleted_at IS NULL
    AND jel.party_id = v_both;
  ASSERT v_cnt >= 1, 'T9 FAIL: both-party receipt did not post an AR line';

END;
$$;

ROLLBACK;
