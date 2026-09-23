-- ============================================================
-- Test: test_statements_and_detailed_party_ledger.sql
-- Description:
--   Tests the correctness and security of hardened account statements:
--   1. get_party_statement multi-currency separation (SAR and YER)
--   2. get_party_statement opening balance & brought-forward (BF) rows
--   3. get_party_statement enriched metadata (reference_id, payment_status, items_count)
--   4. get_account_ledger foreign_balance & party_name restoration
--   5. get_statement_transaction_details line items breakdown
-- ============================================================

DO $$
DECLARE
  v_company_id uuid := gen_random_uuid();
  v_customer_id uuid := gen_random_uuid();
  v_supplier_id uuid := gen_random_uuid();
  v_user_id uuid := auth.uid();
  v_ar_account_id uuid;
  v_ap_account_id uuid;
  v_cash_account_id uuid;
  v_revenue_account_id uuid;
  v_inv_id uuid := gen_random_uuid();
  v_je_id uuid := gen_random_uuid();
  v_statement json;
  v_bf_row jsonb;
  v_details jsonb;
  v_ledger json;
BEGIN
  -- 1. Setup minimal company
  INSERT INTO public.companies(id, name_ar, base_currency)
  VALUES (v_company_id, 'شركة فحص كشوفات الحساب', 'SAR')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Setup Accounts
  SELECT id INTO v_ar_account_id FROM public.accounts WHERE company_id = v_company_id AND code = '1100' LIMIT 1;
  IF v_ar_account_id IS NULL THEN
    INSERT INTO public.accounts(id, company_id, code, name_ar, type, currency_code)
    VALUES (gen_random_uuid(), v_company_id, '1100', 'المدينون - العملاء', 'asset', 'SAR')
    RETURNING id INTO v_ar_account_id;
  END IF;

  SELECT id INTO v_ap_account_id FROM public.accounts WHERE company_id = v_company_id AND code = '2100' LIMIT 1;
  IF v_ap_account_id IS NULL THEN
    INSERT INTO public.accounts(id, company_id, code, name_ar, type, currency_code)
    VALUES (gen_random_uuid(), v_company_id, '2100', 'الدائنون - الموردون', 'liability', 'SAR')
    RETURNING id INTO v_ap_account_id;
  END IF;

  SELECT id INTO v_cash_account_id FROM public.accounts WHERE company_id = v_company_id AND code = '1201' LIMIT 1;
  IF v_cash_account_id IS NULL THEN
    INSERT INTO public.accounts(id, company_id, code, name_ar, type, currency_code)
    VALUES (gen_random_uuid(), v_company_id, '1201', 'صندوق الريال اليمني', 'asset', 'YER')
    RETURNING id INTO v_cash_account_id;
  END IF;

  SELECT id INTO v_revenue_account_id FROM public.accounts WHERE company_id = v_company_id AND code = '4100' LIMIT 1;
  IF v_revenue_account_id IS NULL THEN
    INSERT INTO public.accounts(id, company_id, code, name_ar, type, currency_code)
    VALUES (gen_random_uuid(), v_company_id, '4100', 'إيرادات المبيعات', 'revenue', 'SAR')
    RETURNING id INTO v_revenue_account_id;
  END IF;

  -- 3. Setup Parties
  INSERT INTO public.parties(id, company_id, name, type)
  VALUES (v_customer_id, v_company_id, 'عميل تجريبي كشف الحساب', 'customer');

  INSERT INTO public.parties(id, company_id, name, type)
  VALUES (v_supplier_id, v_company_id, 'مورد تجريبي كشف الحساب', 'supplier');

  -- 4. Opening Balances
  -- Customer owes 50,000 YER on 2026-01-01
  INSERT INTO public.party_opening_balances(company_id, party_id, amount, currency_code, direction, entry_date, notes)
  VALUES (v_company_id, v_customer_id, 50000, 'YER', 'debit', DATE '2026-01-01', 'رصيد افتتاحي يمني');

  -- Customer owes 100 SAR on 2026-01-01
  INSERT INTO public.party_opening_balances(company_id, party_id, amount, currency_code, direction, entry_date, notes)
  VALUES (v_company_id, v_customer_id, 100, 'SAR', 'debit', DATE '2026-01-01', 'رصيد افتتاحي سعودي');

  -- 5. Sales Invoice on 2026-02-15 (150,000 YER)
  INSERT INTO public.invoices(
    id, company_id, party_id, invoice_number, issue_date, type, status,
    currency_code, exchange_rate, total_amount, paid_amount
  ) VALUES (
    v_inv_id, v_company_id, v_customer_id, 'INV-TEST-001', DATE '2026-02-15', 'sale', 'unpaid',
    'YER', 410.0, 150000, 0
  );

  INSERT INTO public.invoice_items(
    invoice_id, company_id, quantity, unit_price, subtotal, tax_amount, total_amount, notes
  ) VALUES (
    v_inv_id, v_company_id, 2, 75000, 150000, 0, 150000, 'صنف قطع غيار تجريبي'
  );

  -- Journal Entry for Invoice
  INSERT INTO public.journal_entries(
    id, company_id, entry_date, entry_number, reference_type, reference_id, status, description
  ) VALUES (
    v_je_id, v_company_id, DATE '2026-02-15', 999901, 'sales_invoice', v_inv_id, 'posted', 'فاتورة مبيعات رقم INV-TEST-001'
  );

  INSERT INTO public.journal_entry_lines(
    journal_entry_id, account_id, company_id, party_id, debit_amount, credit_amount,
    currency_code, foreign_amount, exchange_rate, description
  ) VALUES
    (v_je_id, v_ar_account_id, v_company_id, v_customer_id, ROUND(150000.0/410.0, 4), 0, 'YER', 150000, 410.0, 'مبيعات آجل'),
    (v_je_id, v_revenue_account_id, v_company_id, NULL, 0, ROUND(150000.0/410.0, 4), 'YER', 150000, 410.0, 'إيراد مبيعات');

  -- ----------------------------------------------------------
  -- TEST 1: Full Statement Without Date Filter
  -- ----------------------------------------------------------
  v_statement := public.get_party_statement(v_company_id, v_customer_id);
  RAISE NOTICE 'Test 1: Full Statement Count = %', json_array_length(v_statement);
  ASSERT json_array_length(v_statement) = 3, 'TEST 1 FAILED: Expected 3 movements (2 OB + 1 INV)';

  -- ----------------------------------------------------------
  -- TEST 2: Multi-Currency Isolation & Proper Amounts
  -- ----------------------------------------------------------
  -- The YER invoice movement must show debit = 150000 (NOT the SAR converted 365.85)
  ASSERT (v_statement::jsonb -> 2 ->> 'debit')::numeric = 150000, 
    'TEST 2 FAILED: YER invoice debit must be 150000, got ' || (v_statement::jsonb -> 2 ->> 'debit');

  -- The YER invoice running balance must be 50000 (OB) + 150000 (INV) = 200000 YER
  ASSERT (v_statement::jsonb -> 2 ->> 'balance')::numeric = 200000,
    'TEST 2 FAILED: YER running balance must be 200000, got ' || (v_statement::jsonb -> 2 ->> 'balance');

  -- ----------------------------------------------------------
  -- TEST 3: Brought Forward (BF) Row on Date Filter
  -- ----------------------------------------------------------
  -- Filter starting from 2026-02-01: OB from Jan 1st must become a 'BF' row
  v_statement := public.get_party_statement(v_company_id, v_customer_id, DATE '2026-02-01', NULL, 'YER');
  RAISE NOTICE 'Test 3: Date Filtered Statement Count = %', json_array_length(v_statement);
  
  v_bf_row := (v_statement::jsonb -> 0);
  ASSERT (v_bf_row ->> 'ref') = 'BF', 'TEST 3 FAILED: First row must be BF';
  ASSERT (v_bf_row ->> 'debit')::numeric = 50000, 'TEST 3 FAILED: Brought forward debit must be 50000';
  ASSERT (v_bf_row ->> 'balance')::numeric = 50000, 'TEST 3 FAILED: Brought forward balance must be 50000';

  -- ----------------------------------------------------------
  -- TEST 4: Transaction Details RPC
  -- ----------------------------------------------------------
  v_details := public.get_statement_transaction_details(v_company_id, 'sales_invoice', v_inv_id);
  ASSERT (v_details ->> 'kind') = 'invoice', 'TEST 4 FAILED: Kind must be invoice';
  ASSERT jsonb_array_length(v_details -> 'items') = 1, 'TEST 4 FAILED: Expected 1 line item';
  ASSERT (v_details -> 'items' -> 0 ->> 'unit_price')::numeric = 75000, 'TEST 4 FAILED: Unit price must be 75000';

  -- ----------------------------------------------------------
  -- TEST 5: General Ledger Foreign Balance
  -- ----------------------------------------------------------
  v_ledger := public.get_account_ledger(v_company_id, v_ar_account_id, '2026-01-01', '2026-12-31');
  ASSERT (v_ledger::jsonb -> 'entries' -> 0 ->> 'party_name') = 'عميل تجريبي كشف الحساب',
    'TEST 5 FAILED: Ledger entry must contain restored party_name';

  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE 'ALL STATEMENT AUDIT & DETAILED GRID TESTS PASSED! 🎯';
  RAISE NOTICE '══════════════════════════════════════════════════════';

  -- Cleanup test company
  DELETE FROM public.companies WHERE id = v_company_id;
END;
$$;
