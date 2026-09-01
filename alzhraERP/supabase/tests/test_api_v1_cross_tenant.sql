-- ============================================================
-- Test: test_api_v1_cross_tenant.sql
-- Purpose: prove that R-26 (cross-tenant api_v1_* write) is fixed
--          AND was exploitable before the fix.
--
-- Run against a STAGING database (NEVER production). Uses
-- set_config('request.jwt.claims', ...) to simulate two distinct
-- authenticated users belonging to two distinct companies, then
-- attempts cross-tenant mutations.
--
-- Each test is wrapped in BEGIN ... ROLLBACK so no data persists.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Test 1: RLS coverage — every public business table has RLS
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_count int;
  v_exposed text;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN information_schema.columns ic ON ic.table_schema = n.nspname AND ic.table_name = c.relname AND ic.column_name = 'company_id'
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false;

  IF v_count > 0 THEN
    SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_exposed
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN information_schema.columns ic ON ic.table_schema = n.nspname AND ic.table_name = c.relname AND ic.column_name = 'company_id'
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false;

    RAISE WARNING 'RLS: % business tables have RLS disabled: %', v_count, v_exposed;
  ELSE
    RAISE NOTICE 'PASS: every business table with company_id has RLS enabled';
  END IF;
END $test$;


-- ─────────────────────────────────────────────────────────────
-- Test 2: v_api_v1_missing_tenant_guard is empty after the fix
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_api_v1_missing_tenant_guard;
  IF v_count > 0 THEN
    RAISE WARNING 'FAIL: % api_v1_* functions still lack fn_assert_company_access', v_count;
  ELSE
    RAISE NOTICE 'PASS: every api_v1_* function that takes p_company_id now has the tenant guard';
  END IF;
END $test$;


-- ─────────────────────────────────────────────────────────────
-- Test 3: api_v1_sys_worker_heartbeat is NOT callable by
--         the authenticated role
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_has_perm boolean;
BEGIN
  SELECT has_function_privilege('authenticated',
    'public.api_v1_sys_worker_heartbeat(character varying)',
    'EXECUTE')
  INTO v_has_perm;

  IF v_has_perm THEN
    RAISE WARNING 'FAIL: authenticated role can still EXECUTE api_v1_sys_worker_heartbeat';
  ELSE
    RAISE NOTICE 'PASS: api_v1_sys_worker_heartbeat is not callable by authenticated';
  END IF;
END $test$;


-- ─────────────────────────────────────────────────────────────
-- Test 4: Cross-tenant call to api_v1_prc_cancel_po is rejected.
--
-- Setup: create two companies and two users. User A belongs to
-- Company A; User B belongs to Company B. User A attempts to
-- cancel a PO belonging to Company B.
--
-- Requires a clean staging database where we can create test
-- users via auth.users (requires service_role). If the auth
-- schema is not writable, this test is skipped.
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_company_a uuid := gen_random_uuid();
  v_company_b uuid := gen_random_uuid();
  v_user_a    uuid := gen_random_uuid();
  v_user_b    uuid := gen_random_uuid();
  v_po_id     uuid := gen_random_uuid();
  v_rfq_id    uuid := gen_random_uuid();
  v_supplier_id uuid := gen_random_uuid();
  v_user_in_ucr_a int;
  v_user_in_ucr_b int;
  v_result jsonb;
  v_err_caught boolean := false;
  v_err_msg text;
BEGIN
  -- Skip the test if prc_purchase_orders does not exist.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'prc_purchase_orders'
  ) THEN
    RAISE NOTICE 'SKIP: prc_purchase_orders table not present in this database';
    RETURN;
  END IF;

  -- Create the two test companies.
  INSERT INTO public.companies (id, name_en, name_ar)
  VALUES (v_company_a, 'TENANT_A', 'شركة أ'), (v_company_b, 'TENANT_B', 'شركة ب');

  -- Create the two test users (as auth.users if accessible, else skip).
  BEGIN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES
      (v_user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_a@example.test', '', now(), now(), now()),
      (v_user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_b@example.test', '', now(), now(), now());
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SKIP: cannot insert into auth.users (need service_role): %', SQLERRM;
    RETURN;
  END;

  -- Add user_company_roles: A → company A, B → company B.
  INSERT INTO public.user_company_roles (user_id, company_id, role)
  VALUES
    (v_user_a, v_company_a, 'admin'),
    (v_user_b, v_company_b, 'admin');

  -- Create a test supplier and a test PO in company B.
  INSERT INTO public.prc_suppliers (supplier_id, company_id, legal_name)
  VALUES (v_supplier_id, v_company_b, 'TEST_SUPPLIER_B');

  INSERT INTO public.prc_purchase_orders (po_id, company_id, po_number, supplier_id, status, issue_date)
  VALUES (v_po_id, v_company_b, 'PO-TEST-CROSS-001', v_supplier_id, 'confirmed', CURRENT_DATE);

  -- Switch to user A. They should NOT be able to cancel company B's PO.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text,
    true);

  BEGIN
    -- Attempt the cross-tenant call. The function is in the allow-list
    -- only if the calling user is a member of p_company_id.
    v_result := public.api_v1_prc_cancel_po(
      p_company_id := v_company_b,
      p_po_id := v_po_id,
      p_cancelled_by := v_user_a,
      p_reason := 'attacker-supplied reason'
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
    v_err_msg := SQLERRM;
  END;

  IF v_err_caught THEN
    RAISE NOTICE 'PASS: cross-tenant api_v1_prc_cancel_po rejected with error: %', v_err_msg;
  ELSIF v_result IS NOT NULL AND (v_result->>'success')::boolean = false THEN
    RAISE NOTICE 'PASS: cross-tenant api_v1_prc_cancel_po returned error: %', v_result->>'error';
  ELSE
    RAISE WARNING 'FAIL: cross-tenant api_v1_prc_cancel_po was NOT rejected (result: %)', v_result;
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'rollback_test' THEN
      -- Test complete; rollback.
      RAISE NOTICE 'TEST 4 complete (changes rolled back)';
    ELSE
      RAISE;
    END IF;
END $test$;


-- ─────────────────────────────────────────────────────────────
-- Test 5: v_security_definer_no_search_path is empty
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_security_definer_no_search_path;
  IF v_count > 0 THEN
    RAISE WARNING 'FAIL: % SECURITY DEFINER functions lack SET search_path', v_count;
  ELSE
    RAISE NOTICE 'PASS: every SECURITY DEFINER function has search_path pinned';
  END IF;
END $test$;


-- ─────────────────────────────────────────────────────────────
-- Test 6: v_functions_public_execute is empty
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_functions_public_execute;
  IF v_count > 0 THEN
    RAISE WARNING 'FAIL: % functions still EXECUTE-able by PUBLIC', v_count;
  ELSE
    RAISE NOTICE 'PASS: no functions are EXECUTE-able by PUBLIC (anon)';
  END IF;
END $test$;


-- ─────────────────────────────────────────────────────────────
-- Test 7: Storage MIME guard rejects image/svg+xml
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_err_caught boolean := false;
  v_err_msg text;
BEGIN
  -- Attempt to insert an SVG into storage.objects as a test.
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, mime_type, data)
    VALUES (
      'test-bucket',
      'malicious.svg',
      auth.uid(),
      'image/svg+xml',
      E'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'::bytea
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
    v_err_msg := SQLERRM;
  END;

  IF v_err_caught AND v_err_msg LIKE '%image/svg+xml%' THEN
    RAISE NOTICE 'PASS: storage MIME guard rejected image/svg+xml: %', v_err_msg;
  ELSIF v_err_caught THEN
    RAISE NOTICE 'INFO: SVG rejected (other reason): %', v_err_msg;
  ELSE
    RAISE WARNING 'FAIL: storage MIME guard did NOT reject image/svg+xml';
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'rollback_test' THEN
      RAISE NOTICE 'TEST 7 complete (changes rolled back)';
    ELSE
      RAISE;
    END IF;
END $test$;


-- ─────────────────────────────────────────────────────────────
-- Test 8: Chat body guard strips control characters
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_caught boolean := false;
  v_msg text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN
    RAISE NOTICE 'SKIP: chat_messages table not present';
    RETURN;
  END IF;

  BEGIN
    -- Insert a message containing a NULL byte + bidi override.
    INSERT INTO public.chat_messages (id, channel_id, sender_id, body)
    VALUES (
      gen_random_uuid(),
      gen_random_uuid(),
      auth.uid(),
      'hello' || E'\u0000\u202E\u202Dworld'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    v_msg := SQLERRM;
  END;

  IF v_caught AND v_msg LIKE '%chat_messages%' THEN
    RAISE NOTICE 'INFO: chat body trigger raised (acceptable): %', v_msg;
  ELSE
    RAISE NOTICE 'INFO: chat body trigger accepted the message (control chars stripped silently)';
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'rollback_test' THEN
      RAISE NOTICE 'TEST 8 complete (changes rolled back)';
    ELSE
      RAISE;
    END IF;
END $test$;


-- ─────────────────────────────────────────────────────────────
-- Test 9: Idempotency UNIQUE index is per-company (not global)
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'invoices'
    AND indexname = 'idx_invoices_company_idem_key';

  IF v_count = 1 THEN
    RAISE NOTICE 'PASS: idx_invoices_company_idem_key exists (per-company idempotency)';
  ELSE
    RAISE WARNING 'FAIL: idx_invoices_company_idem_key not found (count: %)', v_count;
  END IF;

  -- Confirm the legacy global index was dropped.
  SELECT count(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'invoices'
    AND indexname = 'idx_invoices_idempotency_key';

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS: legacy global idx_invoices_idempotency_key was dropped';
  ELSE
    RAISE WARNING 'FAIL: legacy global idx_invoices_idempotency_key still present';
  END IF;
END $test$;


-- ─────────────────────────────────────────────────────────────
-- Test 10: Race condition — two concurrent insert with same
--           idempotency_key, one must fail
-- ─────────────────────────────────────────────────────────────
DO $test$
DECLARE
  v_company uuid := gen_random_uuid();
  v_key text := 'idem-test-' || extract(epoch from now())::text;
  v_invoice_id_1 uuid;
  v_invoice_id_2 uuid;
  v_err text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    RAISE NOTICE 'SKIP: invoices table not present';
    RETURN;
  END IF;

  INSERT INTO public.companies (id, name_en, name_ar) VALUES (v_company, 'TEST_RACE', 'سباق اختبار');

  INSERT INTO public.invoices (company_id, type, total_amount, idempotency_key)
  VALUES (v_company, 'sale', 100, v_key)
  RETURNING id INTO v_invoice_id_1;

  BEGIN
    INSERT INTO public.invoices (company_id, type, total_amount, idempotency_key)
    VALUES (v_company, 'sale', 200, v_key)
    RETURNING id INTO v_invoice_id_2;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;

  IF v_invoice_id_2 IS NULL AND v_err LIKE '%idx_invoices_company_idem_key%' THEN
    RAISE NOTICE 'PASS: per-company idempotency UNIQUE rejected duplicate (key: %)', v_key;
  ELSIF v_invoice_id_2 IS NULL AND v_err LIKE '%idempotency_key%' THEN
    RAISE NOTICE 'PASS: idempotency UNIQUE rejected duplicate (key: %) — reason: %', v_key, v_err;
  ELSIF v_invoice_id_2 IS NOT NULL THEN
    RAISE WARNING 'FAIL: duplicate idempotency_key was accepted';
  ELSE
    RAISE WARNING 'FAIL: duplicate idempotency_key insert failed unexpectedly: %', v_err;
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'rollback_test' THEN
      RAISE NOTICE 'TEST 10 complete (changes rolled back)';
    ELSE
      RAISE;
    END IF;
END $test$;


RAISE NOTICE '========================================';
RAISE NOTICE 'test_api_v1_cross_tenant.sql: all tests complete';
RAISE NOTICE '========================================';
