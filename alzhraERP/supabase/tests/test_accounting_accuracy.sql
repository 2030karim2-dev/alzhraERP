-- ============================================================
-- Accounting accuracy regression tests — R1 / R2 / R3
-- (fixes from the 2026-08-20 accounting audit)
-- ------------------------------------------------------------
-- Verifies against a real database:
--   R1  report_balance_sheet / report_profit_loss classify by
--       account TYPE (not code prefix). Fixture accounts use codes far
--       above the default chart (88001 asset, 18899 expense with a '1'
--       prefix, 99901 revenue) to prove type-based classification.
--   R2  zero-amount journals are rejected both in
--       post_manual_journal and in the deferred
--       ensure_journal_balance trigger (check_journal_balance).
--   R3  post_manual_journal rejects a non-positive exchange rate
--       and stores base amounts with the rate correctly applied.
--
-- HOW TO RUN (local / CI database, as a role that bypasses RLS,
-- e.g. the DB owner or service_role):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/test_accounting_accuracy.sql
--
-- The whole script runs inside ONE transaction that is ROLLED BACK
-- at the end, so it never leaves data behind.
--
-- NOTE: the script creates a throwaway test company and simulates
-- auth.uid() via request.jwt.claim.sub; the test identity is inserted
-- into user_company_roles so the SECURITY DEFINER access checks behave
-- exactly as in the app. Everything is rolled back at the end.
-- ============================================================

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_uid     uuid;
  v_company uuid;

  v_acc_asset_custom uuid; -- type=asset,  code 7001 (non-conventional)
  v_acc_code1_exp    uuid; -- type=expense,code 1999 (looks like an asset)
  v_acc_liability    uuid;
  v_acc_equity       uuid;
  v_acc_revenue      uuid;
  v_acc_expense      uuid;

  v_assets      numeric;
  v_liabilities numeric;
  v_equity      numeric;
  v_revenue     numeric;
  v_expense     numeric;
  v_net         numeric;
  v_jid         uuid;
  v_lines       jsonb;
BEGIN
  -- Use a real auth user (user_company_roles.user_id has an FK to
  -- auth.users; the membership row itself is rolled back).
  SELECT id INTO v_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'accounting accuracy test requires at least one user in auth.users';
  END IF;

  -- Create a throwaway test company (id generated; every other required
  -- column has a default). Everything is rolled back at the end.
  INSERT INTO public.companies (name_ar) VALUES ('__accounting_accuracy_test__')
  RETURNING id INTO v_company;

  -- Simulate an authenticated session for the SECURITY DEFINER checks.
  PERFORM set_config('request.jwt.claim.sub', v_uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  INSERT INTO user_company_roles(user_id, company_id, role)
  VALUES (v_uid, v_company, 'accountant');

  INSERT INTO fiscal_years(company_id, name, start_date, end_date, is_closed)
  VALUES (v_company, 'FY2026', DATE '2026-01-01', DATE '2026-12-31', false);

  -- ── R1 fixtures: deliberately non-conventional account codes ─────────
  -- (codes chosen far above the default chart 1000..5100 range so they can
  --  never collide with any pre-seeded chart of accounts)
  INSERT INTO accounts(company_id, code, name_ar, type, currency_code)
  VALUES (v_company, '88001', 'أصل برمز غير تقليدي', 'asset', 'SAR')
  RETURNING id INTO v_acc_asset_custom;

  INSERT INTO accounts(company_id, code, name_ar, type, currency_code)
  VALUES (v_company, '18899', 'مصروف برمز يبدأ بـ 1 (يشبه الأصل)', 'expense', 'SAR')
  RETURNING id INTO v_acc_code1_exp;

  INSERT INTO accounts(company_id, code, name_ar, type, currency_code)
  VALUES (v_company, '22999', 'التزام مخصص', 'liability', 'SAR')
  RETURNING id INTO v_acc_liability;

  INSERT INTO accounts(company_id, code, name_ar, type, currency_code)
  VALUES (v_company, '33999', 'حقوق ملكية', 'equity', 'SAR')
  RETURNING id INTO v_acc_equity;

  INSERT INTO accounts(company_id, code, name_ar, type, currency_code)
  VALUES (v_company, '99901', 'إيراد برمز غير تقليدي', 'revenue', 'SAR')
  RETURNING id INTO v_acc_revenue;

  INSERT INTO accounts(company_id, code, name_ar, type, currency_code)
  VALUES (v_company, '55899', 'مصروف مخصص', 'expense', 'SAR')
  RETURNING id INTO v_acc_expense;

  -- ── Posted journals (all inside the open fiscal year) ────────────────
  -- j1: opening   Dr custom-asset 1000 / Cr equity 1000
  -- (header inserted as draft first: the immutability triggers forbid
  --  inserting lines into a 'posted' journal)
  INSERT INTO journal_entries(company_id, entry_number, entry_date, description, status)
  VALUES (v_company, 100001, DATE '2026-06-01', 'test opening', 'draft')
  RETURNING id INTO v_jid;
  INSERT INTO journal_entry_lines(journal_entry_id, account_id, debit_amount, credit_amount, company_id)
  VALUES (v_jid, v_acc_asset_custom, 1000, 0, v_company);
  INSERT INTO journal_entry_lines(journal_entry_id, account_id, debit_amount, credit_amount, company_id)
  VALUES (v_jid, v_acc_equity, 0, 1000, v_company);
  UPDATE journal_entries SET status = 'posted' WHERE id = v_jid;

  -- j2: sale      Dr custom-asset 500 / Cr custom-revenue 500
  INSERT INTO journal_entries(company_id, entry_number, entry_date, description, status)
  VALUES (v_company, 100002, DATE '2026-06-02', 'test sale', 'draft')
  RETURNING id INTO v_jid;
  INSERT INTO journal_entry_lines(journal_entry_id, account_id, debit_amount, credit_amount, company_id)
  VALUES (v_jid, v_acc_asset_custom, 500, 0, v_company);
  INSERT INTO journal_entry_lines(journal_entry_id, account_id, debit_amount, credit_amount, company_id)
  VALUES (v_jid, v_acc_revenue, 0, 500, v_company);
  UPDATE journal_entries SET status = 'posted' WHERE id = v_jid;

  -- j3: expense    Dr expense(5100) 300 / Cr custom-asset 300
  INSERT INTO journal_entries(company_id, entry_number, entry_date, description, status)
  VALUES (v_company, 100003, DATE '2026-06-03', 'test expense', 'draft')
  RETURNING id INTO v_jid;
  INSERT INTO journal_entry_lines(journal_entry_id, account_id, debit_amount, credit_amount, company_id)
  VALUES (v_jid, v_acc_expense, 300, 0, v_company);
  INSERT INTO journal_entry_lines(journal_entry_id, account_id, debit_amount, credit_amount, company_id)
  VALUES (v_jid, v_acc_asset_custom, 0, 300, v_company);
  UPDATE journal_entries SET status = 'posted' WHERE id = v_jid;

  -- j4: miscoded expense  Dr code1-exp(1999) 100 / Cr custom-asset 100
  INSERT INTO journal_entries(company_id, entry_number, entry_date, description, status)
  VALUES (v_company, 100004, DATE '2026-06-04', 'test miscoded expense', 'draft')
  RETURNING id INTO v_jid;
  INSERT INTO journal_entry_lines(journal_entry_id, account_id, debit_amount, credit_amount, company_id)
  VALUES (v_jid, v_acc_code1_exp, 100, 0, v_company);
  INSERT INTO journal_entry_lines(journal_entry_id, account_id, debit_amount, credit_amount, company_id)
  VALUES (v_jid, v_acc_asset_custom, 0, 100, v_company);
  UPDATE journal_entries SET status = 'posted' WHERE id = v_jid;

  -- ══ R1: report_balance_sheet / report_profit_loss classify by TYPE ══
  SELECT amount INTO v_assets FROM public.report_balance_sheet(v_company, DATE '2026-12-31', NULL)
  WHERE type = 'asset';
  ASSERT v_assets = 1100,
    'R1 FAIL: balance_sheet assets = ' || COALESCE(v_assets::text, 'NULL')
    || ' (expected 1100: custom asset 88001 included, expense 18899 excluded)';

  SELECT amount INTO v_liabilities FROM public.report_balance_sheet(v_company, DATE '2026-12-31', NULL)
  WHERE type = 'liability';
  ASSERT v_liabilities = 0, 'R1 FAIL: liabilities should be 0';

  SELECT amount INTO v_equity FROM public.report_balance_sheet(v_company, DATE '2026-12-31', NULL)
  WHERE type = 'equity';
  ASSERT v_equity = 1000, 'R1 FAIL: equity should be 1000';

  SELECT amount INTO v_revenue FROM public.report_profit_loss(v_company, DATE '2026-01-01', DATE '2026-12-31', NULL)
  WHERE type = 'revenue';
  ASSERT v_revenue = 500,
    'R1 FAIL: P&L revenue = ' || COALESCE(v_revenue::text, 'NULL')
    || ' (expected 500: custom revenue 99901 included)';

  SELECT amount INTO v_expense FROM public.report_profit_loss(v_company, DATE '2026-01-01', DATE '2026-12-31', NULL)
  WHERE type = 'expense';
  ASSERT v_expense = 400,
    'R1 FAIL: P&L expenses = ' || COALESCE(v_expense::text, 'NULL')
    || ' (expected 400: expense 18899 included)';

  SELECT amount INTO v_net FROM public.report_profit_loss(v_company, DATE '2026-01-01', DATE '2026-12-31', NULL)
  WHERE type = 'net_profit';
  ASSERT v_net = 100, 'R1 FAIL: P&L net = ' || COALESCE(v_net::text, 'NULL') || ' (expected 100)';

  RAISE NOTICE 'PASS R1: balance sheet / P&L classify by account type';

  -- ══ R2a: post_manual_journal rejects an empty payload ══
  BEGIN
    PERFORM public.post_manual_journal(v_company, v_uid, DATE '2026-06-10', 'zero entry test', '[]'::jsonb);
    ASSERT false, 'R2 FAIL: post_manual_journal accepted an empty lines payload';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM LIKE '%أسطر%', 'R2 FAIL: unexpected empty-payload message: ' || SQLERRM;
  END;

  -- ══ R2b: post_manual_journal rejects all-zero lines ══
  BEGIN
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_acc_asset_custom, 'debit', 0, 'credit', 0),
      jsonb_build_object('account_id', v_acc_equity, 'debit', 0, 'credit', 0)
    );
    PERFORM public.post_manual_journal(v_company, v_uid, DATE '2026-06-10', 'zero lines test', v_lines);
    ASSERT false, 'R2 FAIL: post_manual_journal accepted all-zero lines';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM LIKE '%صفرية%', 'R2 FAIL: unexpected zero-lines message: ' || SQLERRM;
  END;

  -- ══ R3: post_manual_journal rejects a non-positive exchange rate ══
  BEGIN
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_acc_asset_custom, 'debit', 200, 'credit', 0),
      jsonb_build_object('account_id', v_acc_revenue, 'debit', 0, 'credit', 200)
    );
    PERFORM public.post_manual_journal(v_company, v_uid, DATE '2026-06-10', 'rate test', v_lines, 'SAR', 0);
    ASSERT false, 'R3 FAIL: post_manual_journal accepted exchange rate 0';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM LIKE '%سعر صرف%', 'R3 FAIL: unexpected rate message: ' || SQLERRM;
  END;

  -- ══ Positive path: a valid balanced journal posts with the rate applied ══
  v_lines := jsonb_build_array(
    jsonb_build_object('account_id', v_acc_asset_custom, 'debit', 200, 'credit', 0, 'description', 'Dr'),
    jsonb_build_object('account_id', v_acc_revenue, 'debit', 0, 'credit', 200, 'description', 'Cr')
  );
  SELECT public.post_manual_journal(v_company, v_uid, DATE '2026-06-11', 'valid entry', v_lines, 'SAR', 2)
  INTO v_jid;

  ASSERT v_jid IS NOT NULL, 'R3 FAIL: post_manual_journal returned no id';
  PERFORM 1 FROM public.journal_entries WHERE id = v_jid AND status = 'posted';
  ASSERT FOUND, 'R3 FAIL: posted journal not found';

  PERFORM 1 FROM public.journal_entry_lines
  WHERE journal_entry_id = v_jid AND debit_amount = 400;
  ASSERT FOUND, 'R3 FAIL: base debit 200 * rate 2 should be stored as 400';

  RAISE NOTICE 'PASS R2/R3: post_manual_journal guards + rate application';

  -- ══ R2c: deferred trigger rejects a POSTED zero journal ══
  -- draft header first (immutability triggers would reject lines on a
  -- posted header), then zero line, then promote to posted. entry_number
  -- is left to the numbering trigger (MAX+1) to avoid any collision with
  -- the journal posted by the positive-path test above.
  INSERT INTO journal_entries(company_id, entry_date, description, status)
  VALUES (v_company, DATE '2026-06-12', 'posted zero guard', 'draft')
  RETURNING id INTO v_jid;

  INSERT INTO journal_entry_lines(journal_entry_id, account_id, debit_amount, credit_amount, company_id)
  VALUES (v_jid, v_acc_asset_custom, 0, 0, v_company);

  UPDATE journal_entries SET status = 'posted' WHERE id = v_jid;

  BEGIN
    -- Force the deferred constraint now so the error is catchable here.
    SET CONSTRAINTS ensure_journal_balance IMMEDIATE;
    ASSERT false, 'R2 FAIL: deferred trigger allowed a posted zero journal';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM LIKE '%صفرية%', 'R2 FAIL: unexpected deferred-trigger message: ' || SQLERRM;
  END;

  RAISE NOTICE 'PASS R2c: deferred trigger rejects posted zero journal';
  RAISE NOTICE 'ALL ACCOUNTING ACCURACY TESTS PASSED';
END;
$$;

ROLLBACK;
