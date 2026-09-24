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
--   T10 receipt payment auto-completes the party's pending promise (Phase 1 / A1)
--
--   T16 reminder queue is write-locked for clients (20260923000005)
--   T17 no dispatch without a ready provider; skipping never writes a failure log
--   T18 automation gates: auto_send_enabled = false enqueues nothing
--   T19 generated secret flags (has_*) mirror the stored provider keys
--   T20 secrets are column-revoked from clients; flags stay readable
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
  v_promise uuid;
  v_branch  uuid;
  v_activity uuid;
  v_next    uuid;
  v_next2   uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'debt correctness test requires at least one user in auth.users';
  END IF;

  INSERT INTO public.companies (name_ar) VALUES ('__debt_collection_test__')
  RETURNING id INTO v_company;

  PERFORM set_config('request.jwt.claim.sub', v_uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- فرع واحد مربوط بدور المستخدم: دوال الديون (اللوحة/التحليلات) تعزل
  -- الفروع عبر get_auth_branches، وشركة بلا أي فرع تُعيد نتائج فارغة.
  INSERT INTO public.branches (company_id, name, is_main)
  VALUES (v_company, '__test_branch__', true)
  RETURNING id INTO v_branch;

  INSERT INTO user_company_roles(user_id, company_id, role, branch_id)
  VALUES (v_uid, v_company, 'accountant', v_branch);

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

  -- ── Invoices ──────────────────────────────────────────────────────────────
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

  -- ═══ T10: receipt payment auto-completes the party's pending promise ═══
  -- (Phase 1 / A1: trg_complete_promises_on_payment)
  INSERT INTO public.debt_payment_promises (company_id, party_id, amount, currency_code, promise_date, status)
  VALUES (v_company, v_customer, 100, 'SAR', CURRENT_DATE - 1, 'pending')
  RETURNING id INTO v_promise;

  INSERT INTO public.payments (company_id, party_id, type, amount, currency_code, payment_date, status, account_id)
  VALUES (v_company, v_customer, 'receipt', 100, 'SAR', CURRENT_DATE, 'posted', v_cash);

  SELECT pp.status INTO v_txt
  FROM public.debt_payment_promises pp
  WHERE pp.id = v_promise;
  ASSERT v_txt = 'completed', 'T10 FAIL: promise status after receipt payment = ' || COALESCE(v_txt, 'NULL');

  SELECT pp.reference_type INTO v_txt
  FROM public.debt_payment_promises pp
  WHERE pp.id = v_promise;
  ASSERT v_txt = 'payment', 'T10 FAIL: promise reference_type = ' || COALESCE(v_txt, 'NULL');

  -- ==== T11: scheduled follow-up actions surface as due work ====
  -- (S1: get_debt_followup_actions closes the write-without-reader gap
  --  created by log_collection_activity.next_action_date.)
  INSERT INTO public.customer_activities (
    company_id, customer_id, activity_type, subject, description,
    status, priority, scheduled_at
  ) VALUES (
    v_company, v_customer, 'task', 'متابعة وعد السداد', 'اتصال متابعة',
    'pending', 'high', CURRENT_DATE - 1
  );

  SELECT COUNT(*) INTO v_cnt
  FROM public.get_debt_followup_actions(v_company) a
  WHERE a.party_id = v_customer AND a.is_overdue;
  ASSERT v_cnt >= 1, 'T11 FAIL: pending follow-up action is not surfaced as overdue';

  SELECT COUNT(*) INTO v_cnt
  FROM public.get_debt_followup_actions(v_company) a
  WHERE a.party_id = v_customer
    AND a.party_name IS NOT NULL
    AND a.subject IS NOT NULL
    AND a.subject <> '';
  ASSERT v_cnt >= 1, 'T11 FAIL: follow-up action party/subject projection is broken';

  -- ==== T12: unified task queue surfaces a scheduled action with its owner ====
  -- (S2: get_debt_task_queue + assign_debt_parties)
  INSERT INTO public.customer_activities (
    company_id, customer_id, activity_type, subject, description,
    status, priority, scheduled_at, assigned_to
  ) VALUES (
    v_company, v_customer, 'task', 'T12 scheduled call', 'probe',
    'pending', 'high', CURRENT_DATE, v_uid
  );

  PERFORM public.assign_debt_parties(v_company, ARRAY[v_customer], v_uid, 'high', 'T12 probe');

  SELECT COUNT(*) INTO v_cnt
  FROM public.get_debt_task_queue(v_company) q
  WHERE q.party_id = v_customer
    AND q.task_type = 'follow_up'
    AND q.assigned_to = v_uid
    AND q.priority = 'high'
    AND q.party_name IS NOT NULL;
  ASSERT v_cnt >= 1, 'T12 FAIL: scheduled action not surfaced with its owner/priority';

  -- The collector filter is the my-accounts view: it must keep the assignment.
  SELECT COUNT(*) INTO v_cnt
  FROM public.get_debt_task_queue(v_company, NULL, v_uid) q
  WHERE q.party_id = v_customer;
  ASSERT v_cnt >= 1, 'T12 FAIL: collector filter dropped the assigned customer';

  -- ==== T13: complete_debt_task is idempotent and schedules the next action ====
  SELECT id INTO v_activity
  FROM public.customer_activities
  WHERE company_id = v_company AND customer_id = v_customer
    AND status = 'pending' AND subject = 'T12 scheduled call'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT next_action_id INTO v_next
  FROM public.complete_debt_task(v_activity, 'no_answer', 'T13 probe', CURRENT_DATE + 2);
  ASSERT v_next IS NOT NULL, 'T13 FAIL: the next action was not scheduled';

  SELECT COUNT(*) INTO v_cnt
  FROM public.customer_activities
  WHERE company_id = v_company AND customer_id = v_customer
    AND status = 'pending' AND subject LIKE 'follow-up:%';
  ASSERT v_cnt = 1, 'T13 FAIL: expected exactly one follow-up task after completion';

  -- A second completion must not create another next action (double-click safety).
  SELECT next_action_id INTO v_next2
  FROM public.complete_debt_task(v_activity, 'no_answer', 'T13 probe again', CURRENT_DATE + 5);
  ASSERT v_next2 IS NULL, 'T13 FAIL: idempotent completion created a second next action';

  SELECT COUNT(*) INTO v_cnt
  FROM public.customer_activities
  WHERE company_id = v_company AND customer_id = v_customer
    AND status = 'pending' AND subject LIKE 'follow-up:%';
  ASSERT v_cnt = 1, 'T13 FAIL: duplicate follow-up task created';

  -- ==== T15: debt template library is complete and idempotent ====
  -- (S3-prep: seed_default_debt_templates - 16 templates, placeholders whitelisted)
  SELECT public.seed_default_debt_templates(v_company) INTO v_cnt;
  ASSERT v_cnt = 16, 'T15 FAIL: first seed inserted ' || COALESCE(v_cnt::text, 'NULL') || ' templates (expected 16)';

  SELECT public.seed_default_debt_templates(v_company) INTO v_cnt;
  ASSERT v_cnt = 0, 'T15 FAIL: second seed inserted ' || COALESCE(v_cnt::text, 'NULL') || ' duplicates (idempotency broken)';

  SELECT COUNT(*) INTO v_cnt
  FROM public.debt_message_templates t
  WHERE t.company_id = v_company
    AND regexp_replace(t.body, '\{\{(customer_name|amount|currency|due_date|days_overdue|invoice_number|company_name|signature)\}\}', '', 'g') ~ '\{\{[a-z_]+\}\}';
  ASSERT v_cnt = 0, 'T15 FAIL: ' || COALESCE(v_cnt::text, 'NULL') || ' template(s) use unsupported placeholders';

  SELECT COUNT(*) INTO v_cnt
  FROM public.debt_message_templates t
  WHERE t.company_id = v_company
    AND position('{{amount}}' in t.body) = 0;
  ASSERT v_cnt = 0, 'T15 FAIL: ' || COALESCE(v_cnt::text, 'NULL') || ' template(s) missing the amount placeholder';

  -- ==== T14: assign_debt_parties validates tenant and collector membership ====
  BEGIN
    PERFORM public.assign_debt_parties(v_company, ARRAY[gen_random_uuid()], v_uid, 'high', NULL);
    RAISE EXCEPTION 'T14 FAIL: assigning an unknown party did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      v_txt := SQLERRM;
      IF v_txt LIKE '%did not raise%' THEN
        RAISE;
      END IF;
      IF v_txt NOT LIKE '%INVALID_PARTY%' THEN
        RAISE EXCEPTION 'T14 FAIL: unexpected error: %', v_txt;
      END IF;
  END;

  BEGIN
    PERFORM public.assign_debt_parties(v_company, ARRAY[v_customer], gen_random_uuid(), 'high', NULL);
    RAISE EXCEPTION 'T14b FAIL: accepting a non-member collector did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      v_txt := SQLERRM;
      IF v_txt LIKE '%did not raise%' THEN
        RAISE;
      END IF;
      IF v_txt NOT LIKE '%INVALID_COLLECTOR%' THEN
        RAISE EXCEPTION 'T14b FAIL: unexpected error: %', v_txt;
      END IF;
  END;

  -- ==== T16: the reminder queue is write-locked for clients ====
  -- (hardening 20260923000005: writes only through the SECURITY DEFINER RPCs)
  SELECT string_agg(g.privilege_type, ',' ORDER BY g.privilege_type) INTO v_txt
  FROM information_schema.role_table_grants g
  WHERE g.table_name = 'debt_reminder_queue' AND g.grantee = 'authenticated';
  ASSERT v_txt = 'SELECT',
    'T16 FAIL: authenticated holds queue privileges [' || COALESCE(v_txt, 'NONE') || ']';

  -- ==== T17: no dispatch without a ready provider; skipping is not a failure ====
  DELETE FROM public.messaging_config WHERE company_id = v_company;

  PERFORM public.enqueue_debt_reminder(
    v_company, v_customer, 'whatsapp', 'T17 probe', '967777000017', NULL, NULL, 't17-1'
  );

  SELECT count(*) INTO v_cnt FROM public.claim_debt_reminders(5, v_company);
  ASSERT v_cnt = 0,
    'T17 FAIL: claimed ' || v_cnt || ' reminder(s) although no provider is configured';

  SELECT status INTO v_txt FROM public.debt_reminder_queue WHERE idempotency_key = 't17-1';
  ASSERT v_txt = 'queued',
    'T17 FAIL: unconfigured reminder left in status [' || COALESCE(v_txt, 'NULL') || ']';

  UPDATE public.messaging_config
     SET whatsapp_enabled = true,
         whatsapp_api_url = 'https://example.test/messages',
         whatsapp_api_key = 't17-key'
   WHERE company_id = v_company;
  IF NOT FOUND THEN
    INSERT INTO public.messaging_config (company_id, whatsapp_enabled, whatsapp_api_url, whatsapp_api_key)
    VALUES (v_company, true, 'https://example.test/messages', 't17-key');
  END IF;

  SELECT count(*) INTO v_cnt FROM public.claim_debt_reminders(5, v_company);
  ASSERT v_cnt >= 1, 'T17 FAIL: a ready provider did not release the queued reminder';

  SELECT attempts INTO v_cnt FROM public.debt_reminder_queue WHERE idempotency_key = 't17-1';
  ASSERT v_cnt = 1,
    'T17 FAIL: attempts = ' || COALESCE(v_cnt::text, 'NULL') || ' (expected exactly 1)';

  -- Skipping an unusable recipient must cancel the row and write NO failure log.
  SELECT id INTO v_next FROM public.debt_reminder_queue WHERE idempotency_key = 't17-1';
  PERFORM public.release_debt_reminder(v_next, 'T17 unusable recipient', true);

  SELECT status INTO v_txt FROM public.debt_reminder_queue WHERE id = v_next;
  ASSERT v_txt = 'cancelled',
    'T17 FAIL: released row status = [' || COALESCE(v_txt, 'NULL') || ']';

  SELECT count(*) INTO v_cnt FROM public.debt_message_log WHERE company_id = v_company;
  ASSERT v_cnt = 0, 'T17 FAIL: skipping wrote ' || v_cnt || ' message-log row(s)';

  -- ==== T18: automation gates ====
  UPDATE public.debt_followup_config SET auto_send_enabled = false WHERE company_id = v_company;
  IF NOT FOUND THEN
    INSERT INTO public.debt_followup_config (company_id, auto_send_enabled, default_country_code)
    VALUES (v_company, false, '967');
  END IF;

  SELECT public.cron_enqueue_debt_reminders() INTO v_cnt;

  SELECT count(*) INTO v_cnt
  FROM public.debt_reminder_queue q
  WHERE q.company_id = v_company AND q.idempotency_key LIKE 'cadence:%';
  ASSERT v_cnt = 0,
    'T18 FAIL: ' || v_cnt || ' cadence reminder(s) enqueued while auto_send_enabled = false';

  SELECT default_country_code INTO v_txt
  FROM public.debt_followup_config WHERE company_id = v_company;
  ASSERT v_txt = '967',
    'T18 FAIL: default_country_code = [' || COALESCE(v_txt, 'NULL') || ']';

  BEGIN
    UPDATE public.debt_followup_config SET default_country_code = 'abcd' WHERE company_id = v_company;
    RAISE EXCEPTION 'T18b FAIL: an invalid default_country_code was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  -- ==== T19: generated secret flags mirror the stored keys ====
  -- T17 left a messaging_config row with whatsapp_api_key = 't17-key'.
  SELECT has_whatsapp_key::text INTO v_txt
  FROM public.messaging_config WHERE company_id = v_company;
  ASSERT v_txt = 'true',
    'T19 FAIL: has_whatsapp_key = [' || COALESCE(v_txt, 'NULL') || '] after T17 stored a key';

  UPDATE public.messaging_config SET whatsapp_api_key = '' WHERE company_id = v_company;
  SELECT has_whatsapp_key::text INTO v_txt
  FROM public.messaging_config WHERE company_id = v_company;
  ASSERT v_txt = 'false',
    'T19 FAIL: has_whatsapp_key = [' || COALESCE(v_txt, 'NULL') || '] after clearing the key';

  UPDATE public.messaging_config SET sms_api_key = 't19-sms-key' WHERE company_id = v_company;
  SELECT has_sms_key::text INTO v_txt
  FROM public.messaging_config WHERE company_id = v_company;
  ASSERT v_txt = 'true',
    'T19 FAIL: has_sms_key = [' || COALESCE(v_txt, 'NULL') || '] after storing an SMS key';

  -- ==== T20: secrets are column-revoked from clients; flags stay readable ====
  ASSERT COALESCE(has_column_privilege('authenticated', 'public.messaging_config',
      'whatsapp_api_key', 'SELECT'), false) = false,
    'T20 FAIL: authenticated can still SELECT whatsapp_api_key';
  ASSERT COALESCE(has_column_privilege('authenticated', 'public.messaging_config',
      'sms_api_key', 'SELECT'), false) = false,
    'T20 FAIL: authenticated can still SELECT sms_api_key';
  ASSERT COALESCE(has_column_privilege('authenticated', 'public.messaging_config',
      'telegram_bot_token', 'SELECT'), false) = false,
    'T20 FAIL: authenticated can still SELECT telegram_bot_token';
  ASSERT COALESCE(has_column_privilege('authenticated', 'public.messaging_config',
      'has_whatsapp_key', 'SELECT'), false) = true,
    'T20 FAIL: authenticated cannot SELECT the has_whatsapp_key flag';
  ASSERT COALESCE(has_column_privilege('authenticated', 'public.messaging_config',
      'whatsapp_api_url', 'SELECT'), false) = true,
    'T20 FAIL: authenticated lost SELECT on the non-secret whatsapp_api_url';
  ASSERT COALESCE(has_column_privilege('authenticated', 'public.messaging_config',
      'company_id', 'SELECT'), false) = true,
    'T20 FAIL: authenticated lost SELECT on company_id';
  ASSERT COALESCE(has_column_privilege('anon', 'public.messaging_config',
      'company_id', 'SELECT'), false) = false,
    'T20 FAIL: anon can still SELECT messaging_config';

END;
$$;

ROLLBACK;
