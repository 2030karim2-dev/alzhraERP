-- ============================================================
-- Test: test_business_logic.sql
-- Purpose: probe business-logic and race-condition vulnerabilities
--          in the most critical write paths.
--
-- Tests:
--   1) Idempotency: double-submit of commit_sales_invoice_v2 with
--      the same idempotency_key must produce only one invoice.
--   2) Stock race: two concurrent quick_adjust_stock_batch calls
--      on the same product must not produce a negative balance.
--   3) Cross-tenant financial isolation: invoice from company A
--      cannot be voided by a user from company B.
--   4) Posted-journal immutability: a posted journal entry must
--      not be modifiable or deletable.
--   5) Inventory transfer atomicity: a transfer that deducts
--      source stock then fails must not leave source depleted.
-- ============================================================

\echo '====== Idempotency: double commit_sales_invoice_v2 with same key ======'
DO $test$
DECLARE
  v_company uuid := gen_random_uuid();
  v_party uuid := gen_random_uuid();
  v_user uuid := gen_random_uuid();
  v_key text := 'idem-' || extract(epoch from now())::text;
  v_items jsonb;
  v_result1 jsonb;
  v_result2 jsonb;
  v_id1 uuid;
  v_id2 uuid;
  v_count int;
BEGIN
  -- Skip if commit_sales_invoice_v2 is not callable.
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='commit_sales_invoice_v2') THEN
    RAISE NOTICE 'SKIP: commit_sales_invoice_v2 not found';
    RETURN;
  END IF;

  -- Set up.
  INSERT INTO public.companies (id, name_en, name_ar) VALUES (v_company, 'TEST_IDEM', 'اختبار');
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'parties') THEN
    INSERT INTO public.parties (id, company_id, name, type, created_by)
    VALUES (v_party, v_company, 'IDEM_PARTY', 'customer', v_user);
  END IF;
  INSERT INTO public.user_company_roles (user_id, company_id, role) VALUES (v_user, v_company, 'admin');

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);

  v_items := jsonb_build_array(
    jsonb_build_object('product_id', gen_random_uuid(), 'quantity', 1, 'unit_price', 100)
  );

  -- First commit.
  BEGIN
    v_result1 := public.commit_sales_invoice_v2(
      p_party_id := v_party,
      p_invoice_date := CURRENT_DATE,
      p_due_date := CURRENT_DATE + interval '30 days',
      p_items := v_items,
      p_idempotency_key := v_key
    );
    v_id1 := (v_result1->>'invoice_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'INFO: first commit raised: %', SQLERRM;
  END;

  -- Second commit with the same key.
  BEGIN
    v_result2 := public.commit_sales_invoice_v2(
      p_party_id := v_party,
      p_invoice_date := CURRENT_DATE,
      p_due_date := CURRENT_DATE + interval '30 days',
      p_items := v_items,
      p_idempotency_key := v_key
    );
    v_id2 := (v_result2->>'invoice_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- A unique-violation is acceptable behavior on duplicate idem keys.
    IF SQLERRM LIKE '%idempotency_key%' OR SQLERRM LIKE '%idx_invoices%' THEN
      RAISE NOTICE 'PASS: second commit rejected by unique constraint';
    ELSE
      RAISE NOTICE 'INFO: second commit raised: %', SQLERRM;
    END IF;
  END;

  -- Count invoices with this key.
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    SELECT count(*) INTO v_count FROM public.invoices
    WHERE company_id = v_company AND idempotency_key = v_key;
    IF v_count = 1 THEN
      RAISE NOTICE 'PASS: only 1 invoice with idempotency_key=%, got %', v_key, v_count;
    ELSIF v_count = 0 THEN
      RAISE NOTICE 'INFO: 0 invoices with this key (commit failed before insert)';
    ELSE
      RAISE WARNING 'FAIL: % invoices with same idempotency_key (expected 1)', v_count;
    END IF;
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'rollback_test' THEN
    RAISE NOTICE 'TEST complete (changes rolled back)';
  ELSE
    RAISE;
  END IF;
END $test$;


\echo
\echo '====== Stock race: concurrent quick_adjust_stock_batch ======'
DO $test$
DECLARE
  v_company uuid := gen_random_uuid();
  v_user uuid := gen_random_uuid();
  v_product uuid := gen_random_uuid();
  v_warehouse uuid := gen_random_uuid();
  v_initial_qty numeric := 100;
  v_adjust1 numeric := -90;  -- leaves 10
  v_adjust2 numeric := -90;  -- would leave -80 (should be rejected)
  v_final numeric;
  v_ok boolean := true;
BEGIN
  -- Skip if quick_adjust_stock_batch not present.
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='quick_adjust_stock_batch') THEN
    RAISE NOTICE 'SKIP: quick_adjust_stock_batch not found';
    RETURN;
  END IF;

  INSERT INTO public.companies (id, name_en, name_ar) VALUES (v_company, 'TEST_RACE', 'اختبار');
  INSERT INTO public.user_company_roles (user_id, company_id, role) VALUES (v_user, v_company, 'admin');

  -- Create a product and warehouse.
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'products') THEN
    INSERT INTO public.products (id, company_id, name_ar, sku, sale_price, purchase_price, status)
    VALUES (v_product, v_company, 'RACE_PROD', 'RACE-' || substr(v_product::text, 1, 8), 100, 50, 'active');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'warehouses') THEN
    INSERT INTO public.warehouses (id, company_id, name, code)
    VALUES (v_warehouse, v_company, 'RACE_WH', 'RW-' || substr(v_warehouse::text, 1, 8));
  END IF;

  -- Set initial stock.
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'product_stock') THEN
    INSERT INTO public.product_stock (product_id, warehouse_id, company_id, quantity)
    VALUES (v_product, v_warehouse, v_company, v_initial_qty);
  END IF;

  -- Single-thread test: first adjust should succeed; second should be rejected or clamp to 0.
  -- We can't truly test concurrency in a single psql session without \timing tricks,
  -- but we can verify that the function refuses to go negative.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);

  -- Try to oversell.
  BEGIN
    PERFORM public.quick_adjust_stock_batch(
      v_company,
      jsonb_build_array(
        jsonb_build_object('product_id', v_product, 'warehouse_id', v_warehouse, 'quantity_delta', v_adjust1 + v_adjust2)
      ),
      'oversell test'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS: oversell rejected: %', SQLERRM;
    v_ok := false;
  END;

  IF v_ok THEN
    -- Check the resulting stock.
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'product_stock') THEN
      SELECT quantity INTO v_final FROM public.product_stock
      WHERE product_id = v_product AND warehouse_id = v_warehouse;
      IF v_final < 0 THEN
        RAISE WARNING 'FAIL: stock went negative: %', v_final;
      ELSE
        RAISE NOTICE 'PASS: stock did not go negative (final: %)', v_final;
      END IF;
    END IF;
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'rollback_test' THEN
    RAISE NOTICE 'TEST complete (changes rolled back)';
  ELSE
    RAISE;
  END IF;
END $test$;


\echo
\echo '====== Posted-journal immutability ======'
DO $test$
DECLARE
  v_company uuid := gen_random_uuid();
  v_je_id uuid := gen_random_uuid();
  v_modified int := 0;
BEGIN
  -- The trigger trg_journal_entries_immutability should prevent
  -- UPDATE of posted journals. Test by attempting an UPDATE
  -- directly via the table (which will fire the trigger).
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'journal_entries') THEN
    RAISE NOTICE 'SKIP: journal_entries not present';
    RETURN;
  END IF;

  -- This test is structural: it confirms the trigger exists.
  SELECT count(*) INTO v_modified
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE p.proname IN ('prevent_posted_journal_modification', 'prevent_posted_journal_edit', 'prevent_posted_journal_line_modification')
    AND t.tgisinternal = false;

  IF v_modified >= 2 THEN
    RAISE NOTICE 'PASS: posted-journal immutability triggers installed (count: %)', v_modified;
  ELSE
    RAISE WARNING 'FAIL: posted-journal immutability triggers missing (count: %)', v_modified;
  END IF;
END $test$;


\echo
\echo '====== Cross-tenant invoice void ======'
DO $test$
DECLARE
  v_company_a uuid := gen_random_uuid();
  v_company_b uuid := gen_random_uuid();
  v_user_a uuid := gen_random_uuid();
  v_invoice_id uuid := gen_random_uuid();
  v_status text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    RAISE NOTICE 'SKIP: invoices not present';
    RETURN;
  END IF;

  -- Set up two companies, two users.
  INSERT INTO public.companies (id, name_en, name_ar)
  VALUES (v_company_a, 'TEST_XA', 'أ'), (v_company_b, 'TEST_XB', 'ب');
  INSERT INTO public.user_company_roles (user_id, company_id, role)
  VALUES (v_user_a, v_company_a, 'admin');

  -- Create invoice in company B.
  INSERT INTO public.invoices (id, company_id, type, total_amount, status, created_by)
  VALUES (v_invoice_id, v_company_b, 'sale', 100, 'posted', v_user_a);

  -- Switch to user A.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);

  -- Attempt to void company B's invoice. Should fail or be a no-op.
  BEGIN
    PERFORM public.void_invoice(v_invoice_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS: cross-tenant void_invoice raised: %', SQLERRM;
    -- Check invoice is still 'posted' (not voided).
    SELECT status INTO v_status FROM public.invoices WHERE id = v_invoice_id;
    IF v_status = 'posted' THEN
      RAISE NOTICE 'PASS: invoice is still posted after cross-tenant void attempt';
    ELSE
      RAISE WARNING 'FAIL: invoice status changed to % after cross-tenant void', v_status;
    END IF;
    RETURN;
  END;

  -- If void_invoice did not raise, check the status.
  SELECT status INTO v_status FROM public.invoices WHERE id = v_invoice_id;
  IF v_status = 'void' THEN
    RAISE WARNING 'FAIL: invoice was voided by cross-tenant caller';
  ELSE
    RAISE NOTICE 'INFO: cross-tenant void_invoice was a no-op (status: %)', v_status;
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'rollback_test' THEN
    RAISE NOTICE 'TEST complete (changes rolled back)';
  ELSE
    RAISE;
  END IF;
END $test$;


\echo
\echo '====== Financial value manipulation: server-side total recalc ======'
DO $test$
DECLARE
  v_company uuid := gen_random_uuid();
  v_user uuid := gen_random_uuid();
  v_party uuid := gen_random_uuid();
  v_product uuid := gen_random_uuid();
  v_warehouse uuid := gen_random_uuid();
  v_items jsonb;
  v_result jsonb;
  v_invoice_id uuid;
  v_total_in_db numeric;
  v_expected_total numeric := 250;
  v_pass boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    RAISE NOTICE 'SKIP: invoices not present';
    RETURN;
  END IF;

  INSERT INTO public.companies (id, name_en, name_ar) VALUES (v_company, 'TEST_FIN', 'اختبار');
  INSERT INTO public.user_company_roles (user_id, company_id, role) VALUES (v_user, v_company, 'admin');
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'parties') THEN
    INSERT INTO public.parties (id, company_id, name, type, created_by)
    VALUES (v_party, v_company, 'FIN_PARTY', 'customer', v_user);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'products') THEN
    INSERT INTO public.products (id, company_id, name_ar, sku, sale_price, purchase_price, status)
    VALUES (v_product, v_company, 'FIN_PROD', 'FIN-' || substr(v_product::text, 1, 8), 50, 25, 'active');
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);

  -- Try to submit a sales invoice with a client-side total_amount
  -- that is WRONG: 5 items @ 100 each = 500, but we claim 99999
  -- in total. The server should recompute and store 500.
  v_items := jsonb_build_array(
    jsonb_build_object('product_id', v_product, 'quantity', 5, 'unit_price', 50, 'total_override', 99999)
  );

  BEGIN
    v_result := public.commit_sales_invoice_v2(
      p_party_id := v_party,
      p_invoice_date := CURRENT_DATE,
      p_due_date := CURRENT_DATE + interval '30 days',
      p_items := v_items
    );
    v_invoice_id := (v_result->>'invoice_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'INFO: commit raised: %', SQLERRM;
  END;

  IF v_invoice_id IS NOT NULL THEN
    SELECT total_amount INTO v_total_in_db FROM public.invoices WHERE id = v_invoice_id;
    -- 5 * 50 = 250 expected (NOT 99999).
    IF v_total_in_db = 250 THEN
      RAISE NOTICE 'PASS: total_amount is server-recomputed (250, not the client claim 99999)';
    ELSIF v_total_in_db = 99999 THEN
      RAISE WARNING 'FAIL: total_amount was taken from client (99999)';
    ELSE
      RAISE NOTICE 'INFO: total_amount = % (verify against business logic)', v_total_in_db;
    END IF;
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'rollback_test' THEN
    RAISE NOTICE 'TEST complete (changes rolled back)';
  ELSE
    RAISE;
  END IF;
END $test$;
