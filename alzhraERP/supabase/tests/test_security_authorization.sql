-- ============================================================
-- Test: test_security_authorization.sql
-- Purpose: comprehensive authorization tests for the database.
--
-- Each test is wrapped in BEGIN ... ROLLBACK so no data persists.
-- All assertions are RAISE NOTICE / RAISE WARNING (visible in psql /
-- supabase logs); none block execution.
--
-- Run with: psql -f test_security_authorization.sql
-- or via the Supabase SQL editor (in a staging project).
-- ============================================================

\echo '====== RLS coverage on business tables ======'
DO $test$
DECLARE
  v_count int;
  v_exposed text;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN information_schema.columns ic
    ON ic.table_schema = n.nspname AND ic.table_name = c.relname AND ic.column_name = 'company_id'
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false;

  IF v_count > 0 THEN
    SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_exposed
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN information_schema.columns ic
      ON ic.table_schema = n.nspname AND ic.table_name = c.relname AND ic.column_name = 'company_id'
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false;
    RAISE WARNING 'RLS GAP: % business tables have RLS disabled: %', v_count, v_exposed;
  ELSE
    RAISE NOTICE 'PASS: every business table with company_id has RLS enabled';
  END IF;
END $test$;

\echo
\echo '====== SECURITY DEFINER + search_path ======'
DO $test$
DECLARE
  v_count int;
  v_names text;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_security_definer_no_search_path;
  IF v_count > 0 THEN
    SELECT string_agg(function_name, ', ' ORDER BY function_name) INTO v_names
    FROM public.v_security_definer_no_search_path;
    RAISE WARNING 'SECURITY DEFINER GAP: % functions lack search_path: %', v_count, v_names;
  ELSE
    RAISE NOTICE 'PASS: every SECURITY DEFINER function has search_path pinned';
  END IF;
END $test$;

\echo
\echo '====== PUBLIC EXECUTE on functions ======'
DO $test$
DECLARE
  v_count int;
  v_names text;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_functions_public_execute;
  IF v_count > 0 THEN
    SELECT string_agg(function_name, ', ' ORDER BY function_name) INTO v_names
    FROM public.v_functions_public_execute;
    RAISE WARNING 'PUBLIC EXECUTE GAP: % functions are EXECUTE-able by PUBLIC: %', v_count, v_names;
  ELSE
    RAISE NOTICE 'PASS: no functions are EXECUTE-able by PUBLIC (anon)';
  END IF;
END $test$;

\echo
\echo '====== api_v1_* functions with tenant guard ======'
DO $test$
DECLARE
  v_count int;
  v_names text;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_api_v1_missing_tenant_guard;
  IF v_count > 0 THEN
    SELECT string_agg(function_name, ', ' ORDER BY function_name) INTO v_names
    FROM public.v_api_v1_missing_tenant_guard;
    RAISE WARNING 'R-26 GAP: % api_v1_* functions lack fn_assert_company_access: %', v_count, v_names;
  ELSE
    RAISE NOTICE 'PASS: every api_v1_* function that takes p_company_id has the tenant guard';
  END IF;
END $test$;

\echo
\echo '====== Idempotency key UNIQUE is per-company ======'
DO $test$
DECLARE
  v_global int;
  v_per_company int;
BEGIN
  SELECT count(*) INTO v_global FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'invoices' AND indexname = 'idx_invoices_idempotency_key';
  SELECT count(*) INTO v_per_company FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'invoices' AND indexname = 'idx_invoices_company_idem_key';

  IF v_per_company = 1 AND v_global = 0 THEN
    RAISE NOTICE 'PASS: per-company idempotency UNIQUE in place; legacy global dropped';
  ELSIF v_per_company = 1 AND v_global = 1 THEN
    RAISE WARNING 'PARTIAL: per-company present, but legacy global also present (cross-tenant DoS vector)';
  ELSE
    RAISE WARNING 'FAIL: per-company idempotency UNIQUE missing (have global: %, per-company: %)', v_global, v_per_company;
  END IF;
END $test$;

\echo
\echo '====== Storage MIME guard trigger present ======'
DO $test$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE p.proname = 'storage_guard_dangerous_mime'
    AND t.tgisinternal = false;

  IF v_count = 1 THEN
    RAISE NOTICE 'PASS: storage_guard_dangerous_mime trigger is installed';
  ELSE
    RAISE WARNING 'FAIL: storage_guard_dangerous_mime trigger not installed (count: %)', v_count;
  END IF;
END $test$;

\echo
\echo '====== Chat body guard trigger present ======'
DO $test$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE p.proname = 'chat_guard_body'
    AND t.tgisinternal = false;

  IF v_count = 1 THEN
    RAISE NOTICE 'PASS: chat_guard_body trigger is installed';
  ELSE
    RAISE WARNING 'FAIL: chat_guard_body trigger not installed (count: %)', v_count;
  END IF;
END $test$;

\echo
\echo '====== audit_logs.action CHECK constraint ======'
DO $test$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM pg_constraint WHERE conname = 'audit_logs_action_nonempty';
  IF v_count = 1 THEN
    RAISE NOTICE 'PASS: audit_logs.action non-empty CHECK constraint present';
  ELSE
    RAISE WARNING 'FAIL: audit_logs.action non-empty CHECK constraint missing';
  END IF;
END $test$;

\echo
\echo '====== Realtime publication tables (sensitive) ======'
DO $test$
DECLARE
  v_publication text;
BEGIN
  -- List the tables in the supabase_realtime publication.
  SELECT string_agg(tablename, ', ' ORDER BY tablename) INTO v_publication
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND tablename IN ('audit_logs', 'audit_logs_archive', 'role_permissions');

  IF v_publication IS NOT NULL THEN
    RAISE WARNING 'REALTIME GAP: sensitive tables in supabase_realtime publication: %', v_publication;
  ELSE
    RAISE NOTICE 'PASS: no sensitive tables in supabase_realtime publication';
  END IF;
END $test$;

\echo
\echo '====== Permissions on storage.objects ======'
DO $test$
DECLARE
  v_count int;
BEGIN
  -- Check that anon has NO privileges on storage.objects.
  SELECT count(*) INTO v_count
  FROM information_schema.role_table_grants
  WHERE grantee = 'anon' AND table_schema = 'storage' AND table_name = 'objects';

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS: anon has no privileges on storage.objects';
  ELSE
    RAISE WARNING 'FAIL: anon has % privileges on storage.objects', v_count;
  END IF;
END $test$;

\echo
\echo '====== Service role: confirm it has full access (sanity) ======'
DO $test$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.role_table_grants
  WHERE grantee = 'service_role' AND table_schema = 'public' AND table_name = 'companies';

  -- service_role should have ALL on at least companies.
  IF v_count >= 1 THEN
    RAISE NOTICE 'PASS: service_role has access to public.companies (sanity)';
  ELSE
    RAISE WARNING 'INFO: service_role has no grants on public.companies (may be via owner inheritance)';
  END IF;
END $test$;
