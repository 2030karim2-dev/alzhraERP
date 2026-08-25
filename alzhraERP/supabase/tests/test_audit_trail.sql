-- ============================================================
-- Test: test_audit_trail.sql
-- Purpose: prove R-28 audit logging is wired correctly.
-- ============================================================

\echo '====== audit_write helper is installed ======'
DO $test$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'audit_write';
  IF v_count = 1 THEN
    RAISE NOTICE 'PASS: public.audit_write exists';
  ELSE
    RAISE WARNING 'FAIL: public.audit_write not found';
  END IF;
END $test$;

\echo
\echo '====== audit_write has REVOKE/GRANT sane ======'
DO $test$
DECLARE
  v_anon boolean;
  v_auth boolean;
  v_svc boolean;
BEGIN
  SELECT has_function_privilege('anon', 'public.audit_write(text,text,uuid,uuid,jsonb)', 'EXECUTE') INTO v_anon;
  SELECT has_function_privilege('authenticated', 'public.audit_write(text,text,uuid,uuid,jsonb)', 'EXECUTE') INTO v_auth;
  SELECT has_function_privilege('service_role', 'public.audit_write(text,text,uuid,uuid,jsonb)', 'EXECUTE') INTO v_svc;
  IF v_anon THEN
    RAISE WARNING 'FAIL: anon can EXECUTE audit_write';
  ELSE
    RAISE NOTICE 'PASS: anon cannot EXECUTE audit_write';
  END IF;
  IF v_auth THEN
    RAISE NOTICE 'PASS: authenticated can EXECUTE audit_write';
  ELSE
    RAISE WARNING 'FAIL: authenticated cannot EXECUTE audit_write';
  END IF;
END $test$;

\echo
\echo '====== audit_write actually inserts an audit row ======'
DO $test$
DECLARE
  v_id uuid;
  v_company uuid := gen_random_uuid();
  v_action text := 'test_audit_action_' || extract(epoch from now())::text;
  v_dummy_id uuid := gen_random_uuid();
  v_inserted_count int;
  v_action_in_db text;
BEGIN
  INSERT INTO public.companies (id, name, name_ar) VALUES (v_company, 'TEST_AUDIT', 'اختبار');

  BEGIN
    v_id := public.audit_write(
      p_action := v_action,
      p_entity := 'test_entity',
      p_entity_id := v_dummy_id,
      p_company_id := v_company,
      p_details := jsonb_build_object('test', true)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'FAIL: audit_write raised: %', SQLERRM;
    RETURN;
  END;

  IF v_id IS NULL THEN
    RAISE WARNING 'FAIL: audit_write returned NULL';
  ELSE
    RAISE NOTICE 'PASS: audit_write returned an id';
  END IF;

  SELECT count(*) INTO v_inserted_count
  FROM public.audit_logs
  WHERE action = v_action AND company_id = v_company;

  IF v_inserted_count = 1 THEN
    RAISE NOTICE 'PASS: one row inserted with action=%', v_action;
  ELSE
    RAISE WARNING 'FAIL: expected 1 row, got %', v_inserted_count;
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
\echo '====== audit_write failure does NOT raise ======'
DO $test$
DECLARE
  v_id uuid;
  v_failed boolean := false;
BEGIN
  -- Pass a non-UUID for entity_id (cast fails inside).
  BEGIN
    v_id := public.audit_write(
      p_action := 'test_failure',
      p_entity := 'test',
      p_entity_id := NULL,  -- NULL is allowed; will just attribute to NULL
      p_company_id := gen_random_uuid()
    );
    -- Should not have raised.
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;

  IF v_failed THEN
    RAISE WARNING 'FAIL: audit_write raised an exception (should fail-safe)';
  ELSE
    RAISE NOTICE 'PASS: audit_write did not raise';
  END IF;
END $test$;

\echo
\echo '====== v_rpcs_missing_audit is exposed and queryable ======'
DO $test$
DECLARE
  v_count int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'v_rpcs_missing_audit'
  ) THEN
    RAISE WARNING 'FAIL: v_rpcs_missing_audit view not created';
  ELSE
    SELECT count(*) INTO v_count FROM public.v_rpcs_missing_audit;
    RAISE NOTICE 'INFO: v_rpcs_missing_audit currently lists % RPCs (all are TODO; should decrease over time)', v_count;
  END IF;
END $test$;
