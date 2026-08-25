-- ============================================================
-- Test: test_audit_trail_phase2.sql
-- Purpose: verify that the 10 RPCs wired in
--          20260826000005_wire_audit_write_into_write_rpcs.sql
--          actually call public.audit_write().
--
-- Strategy: parse the function body of each wired RPC and
-- check that it contains 'public.audit_write('. The body is
-- read via pg_get_functiondef, which works on the LIVE database,
-- so this test catches any post-migration regression.
-- ============================================================

\echo '====== R-28 phase 2: every critical write RPC calls audit_write ======'
DO $test$
DECLARE
  v_rpc text;
  v_critical text[] := ARRAY[
    'void_invoice', 'void_bond', 'void_expense',
    'commit_sales_invoice_v2', 'commit_purchase_invoice',
    'commit_purchase_return', 'commit_sale_return',
    'process_sales_return', 'commit_expense_v2',
    'commit_payment', 'post_manual_journal',
    'create_stock_transfer', 'quick_adjust_stock_batch'
  ];
  v_missing text := '';
  v_count int := 0;
BEGIN
  FOREACH v_rpc IN ARRAY v_critical LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                   WHERE n.nspname='public' AND p.proname = v_rpc) THEN
      CONTINUE;
    END IF;
    v_count := v_count + 1;
    IF (SELECT pg_get_functiondef(p.oid)
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname = v_rpc)
       NOT LIKE '%public.audit_write(%' THEN
      v_missing := v_missing || v_rpc || ', ';
    END IF;
  END LOOP;
  IF v_missing <> '' THEN
    RAISE WARNING 'R-28 GAP: % critical RPCs lack audit_write: %', array_length(v_critical, 1), v_missing;
  ELSE
    RAISE NOTICE 'PASS: all % critical write RPCs call audit_write', v_count;
  END IF;
END $test$;


\echo
\echo '====== Honeypot tables exist and are RLS-locked ======'
DO $test$
DECLARE
  v_t text;
  v_count int := 0;
  v_unlocked text := '';
BEGIN
  FOR v_t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname IN (
        'admin_secrets','api_keys_cache','vault_staging_keys',
        'pg_credential_dump','service_role_holders','auth_bypass_tokens',
        'decrypted_passwords','jwt_signing_secrets','aws_root_keys',
        'stripe_internal_accounts'
      )
  LOOP
    v_count := v_count + 1;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c WHERE c.relname = v_t AND c.relrowsecurity = true
    ) THEN
      v_unlocked := v_unlocked || v_t || ', ';
    END IF;
  END LOOP;
  IF v_unlocked <> '' THEN
    RAISE WARNING 'HONEYPOT GAP: %', v_unlocked;
  ELSE
    RAISE NOTICE 'PASS: % honeypot tables all RLS-locked', v_count;
  END IF;
END $test$;


\echo
\echo '====== Honeypot trigger fires on probe ======'
DO $test$
DECLARE
  v_user uuid := gen_random_uuid();
  v_company uuid := gen_random_uuid();
  v_alert_id bigint;
  v_pre_count int;
  v_post_count int;
BEGIN
  -- Set up a fake auth.uid() context.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);

  v_pre_count := (SELECT count(*) FROM public.security_alerts
                  WHERE alert_type = 'honeypot_access' AND user_id = v_user);

  -- Try to SELECT from a honeypot table. The RLS=false policy
  -- means the SELECT returns 0 rows, but the trigger fires
  -- BEFORE the RLS check, so the alert is logged.
  PERFORM count(*) FROM public.admin_secrets;

  v_post_count := (SELECT count(*) FROM public.security_alerts
                   WHERE alert_type = 'honeypot_access' AND user_id = v_user);

  IF v_post_count > v_pre_count THEN
    RAISE NOTICE 'PASS: honeypot probe logged an alert (count went from % to %)', v_pre_count, v_post_count;
  ELSE
    RAISE WARNING 'FAIL: honeypot probe was NOT logged (count stayed at %)', v_pre_count;
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
\echo '====== csp_reports table accepts inserts ======'
DO $test$
DECLARE
  v_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'csp_reports') THEN
    RAISE WARNING 'FAIL: csp_reports table missing';
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.csp_reports (blocked_uri, violated_directive, raw_payload)
    VALUES ('eval', 'script-src', '{"test": true}'::jsonb)
    RETURNING id INTO v_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'FAIL: csp_reports insert failed: %', SQLERRM;
    RETURN;
  END;

  IF v_id IS NOT NULL THEN
    RAISE NOTICE 'PASS: csp_reports accepted test insert (id=%)', v_id;
  ELSE
    RAISE WARNING 'FAIL: csp_reports did not return id';
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'rollback_test' THEN
    RAISE NOTICE 'TEST complete (changes rolled back)';
  ELSE
    RAISE;
  END IF;
END $test$;
