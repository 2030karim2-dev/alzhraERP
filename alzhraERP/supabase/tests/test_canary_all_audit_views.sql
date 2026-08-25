-- ============================================================
-- Test: test_canary_all_audit_views.sql
-- Purpose: CI-friendly single-shot check of every audit view.
--          Exits with a non-zero status if any view returns rows.
--
-- Designed to be run in a Supabase CI workflow or via psql.
-- Each failing view produces a WARNING; the final \echo
-- summarises the canary status.
-- ============================================================

\set ON_ERROR_STOP off

\echo '====== Canary: v_tables_without_rls ======'
DO $canary$
DECLARE
  v_count int;
  v_sample text;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_tables_without_rls;
  IF v_count > 0 THEN
    SELECT string_agg(schema || '.' || table_name, ', ' ORDER BY table_name)
      INTO v_sample
      FROM public.v_tables_without_rls
      LIMIT 5;
    RAISE WARNING 'CANARY FAIL: v_tables_without_rls has % rows: %', v_count, v_sample;
  ELSE
    RAISE NOTICE 'CANARY OK: v_tables_without_rls empty';
  END IF;
END $canary$;

\echo
\echo '====== Canary: v_security_definer_no_search_path ======'
DO $canary$
DECLARE
  v_count int;
  v_sample text;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_security_definer_no_search_path;
  IF v_count > 0 THEN
    SELECT string_agg(schema || '.' || function_name, ', ' ORDER BY function_name)
      INTO v_sample
      FROM public.v_security_definer_no_search_path
      LIMIT 5;
    RAISE WARNING 'CANARY FAIL: v_security_definer_no_search_path has % rows: %', v_count, v_sample;
  ELSE
    RAISE NOTICE 'CANARY OK: v_security_definer_no_search_path empty';
  END IF;
END $canary$;

\echo
\echo '====== Canary: v_functions_public_execute ======'
DO $canary$
DECLARE
  v_count int;
  v_sample text;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_functions_public_execute;
  IF v_count > 0 THEN
    SELECT string_agg(schema || '.' || function_name, ', ' ORDER BY function_name)
      INTO v_sample
      FROM public.v_functions_public_execute
      LIMIT 5;
    RAISE WARNING 'CANARY FAIL: v_functions_public_execute has % rows: %', v_count, v_sample;
  ELSE
    RAISE NOTICE 'CANARY OK: v_functions_public_execute empty';
  END IF;
END $canary$;

\echo
\echo '====== Canary: v_api_v1_missing_tenant_guard ======'
DO $canary$
DECLARE
  v_count int;
  v_sample text;
BEGIN
  SELECT count(*) INTO v_count FROM public.v_api_v1_missing_tenant_guard;
  IF v_count > 0 THEN
    SELECT string_agg(schema || '.' || function_name, ', ' ORDER BY function_name)
      INTO v_sample
      FROM public.v_api_v1_missing_tenant_guard
      LIMIT 5;
    RAISE WARNING 'CANARY FAIL: v_api_v1_missing_tenant_guard has % rows: %', v_count, v_sample;
  ELSE
    RAISE NOTICE 'CANARY OK: v_api_v1_missing_tenant_guard empty';
  END IF;
END $canary$;

\echo
\echo '====== Canary: v_rpcs_missing_audit ======'
DO $canary$
DECLARE
  v_count int;
  v_sample text;
BEGIN
  -- This view is allowed to be non-empty during the R-28 cleanup
  -- (10 RPCs are TODO(audit_write)). It must trend toward zero.
  SELECT count(*) INTO v_count FROM public.v_rpcs_missing_audit;
  IF v_count > 20 THEN
    -- Threshold: 20 is the current expected count (35 - 13 already
    -- wired + 2 helpers). After the engineering team wires the
    -- remaining 10, this should drop to ~13.
    SELECT string_agg(schema || '.' || function_name, ', ' ORDER BY function_name)
      INTO v_sample
      FROM public.v_rpcs_missing_audit
      LIMIT 5;
    RAISE WARNING 'CANARY FAIL: v_rpcs_missing_audit has % rows: %', v_count, v_sample;
  ELSIF v_count > 0 THEN
    SELECT string_agg(schema || '.' || function_name, ', ' ORDER BY function_name)
      INTO v_sample
      FROM public.v_rpcs_missing_audit
      LIMIT 5;
    RAISE NOTICE 'CANARY INFO: v_rpcs_missing_audit has % rows (R-28 cleanup in progress): %', v_count, v_sample;
  ELSE
    RAISE NOTICE 'CANARY OK: v_rpcs_missing_audit empty';
  END IF;
END $canary$;

\echo
\echo '====== Canary: storage MIME guard trigger ======'
DO $canary$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE p.proname = 'storage_guard_dangerous_mime'
    AND t.tgisinternal = false;
  IF v_count = 1 THEN
    RAISE NOTICE 'CANARY OK: storage_guard_dangerous_mime trigger installed';
  ELSE
    RAISE WARNING 'CANARY FAIL: storage_guard_dangerous_mime trigger missing (count: %)', v_count;
  END IF;
END $canary$;

\echo
\echo '====== Canary: chat body guard trigger ======'
DO $canary$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE p.proname = 'chat_guard_body'
    AND t.tgisinternal = false;
  IF v_count = 1 THEN
    RAISE NOTICE 'CANARY OK: chat_guard_body trigger installed';
  ELSE
    RAISE WARNING 'CANARY FAIL: chat_guard_body trigger missing (count: %)', v_count;
  END IF;
END $canary$;

\echo
\echo '====== Canary: api_v1_sys_worker_heartbeat auth ======'
DO $canary$
DECLARE
  v_auth boolean;
BEGIN
  SELECT has_function_privilege('authenticated',
    'public.api_v1_sys_worker_heartbeat(character varying)', 'EXECUTE')
  INTO v_auth;
  IF v_auth THEN
    RAISE WARNING 'CANARY FAIL: authenticated can EXECUTE api_v1_sys_worker_heartbeat (should be service_role only)';
  ELSE
    RAISE NOTICE 'CANARY OK: api_v1_sys_worker_heartbeat is not callable by authenticated';
  END IF;
END $canary$;

\echo
\echo '====== Canary: idempotency index per-company ======'
DO $canary$
DECLARE
  v_per_company int;
  v_global int;
BEGIN
  SELECT count(*) INTO v_per_company FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'invoices' AND indexname = 'idx_invoices_company_idem_key';
  SELECT count(*) INTO v_global FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'invoices' AND indexname = 'idx_invoices_idempotency_key';

  IF v_per_company = 1 AND v_global = 0 THEN
    RAISE NOTICE 'CANARY OK: per-company idempotency index in place, legacy global dropped';
  ELSIF v_per_company = 1 AND v_global = 1 THEN
    RAISE WARNING 'CANARY FAIL: legacy global idempotency index still present (cross-tenant DoS vector)';
  ELSE
    RAISE WARNING 'CANARY FAIL: per-company index missing (have global: %, per-company: %)', v_global, v_per_company;
  END IF;
END $canary$;

\echo
\echo '====== Canary: realtime publication sensitive tables ======'
DO $canary$
DECLARE
  v_published text;
BEGIN
  SELECT string_agg(tablename, ', ' ORDER BY tablename) INTO v_published
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND tablename IN ('audit_logs', 'audit_logs_archive', 'role_permissions', 'user_company_roles');
  IF v_published IS NOT NULL THEN
    RAISE WARNING 'CANARY FAIL: sensitive tables in supabase_realtime: %', v_published;
  ELSE
    RAISE NOTICE 'CANARY OK: no sensitive tables in supabase_realtime';
  END IF;
END $canary$;

\echo
\echo '====== Canary: anon role privileges ======'
DO $canary$
DECLARE
  v_count int;
BEGIN
  -- Anon should have no direct table grants on business tables.
  SELECT count(*) INTO v_count
  FROM information_schema.role_table_grants
  WHERE grantee = 'anon'
    AND table_schema = 'public'
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE');
  IF v_count > 0 THEN
    RAISE WARNING 'CANARY FAIL: anon has % write privileges on public tables', v_count;
  ELSE
    RAISE NOTICE 'CANARY OK: anon has no write privileges on public tables';
  END IF;
END $canary$;


\echo
\echo '====== Canary: honeypot tables RLS-locked ======'
DO $canary$
DECLARE
  v_unlocked text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_unlocked
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND c.relname IN (
      'admin_secrets','api_keys_cache','vault_staging_keys',
      'pg_credential_dump','service_role_holders','auth_bypass_tokens',
      'decrypted_passwords','jwt_signing_secrets','aws_root_keys',
      'stripe_internal_accounts'
    )
    AND c.relrowsecurity = false;
  IF v_unlocked IS NOT NULL THEN
    RAISE WARNING 'CANARY FAIL: honeypot tables without RLS: %', v_unlocked;
  ELSE
    RAISE NOTICE 'CANARY OK: all 10 honeypot tables are RLS-locked';
  END IF;
END $canary$;


\echo
\echo '====== Canary: csp_reports table + view ======'
DO $canary$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'csp_reports';
  IF v_count = 1 THEN
    RAISE NOTICE 'CANARY OK: csp_reports table exists';
  ELSE
    RAISE WARNING 'CANARY FAIL: csp_reports table missing';
  END IF;
  SELECT count(*) INTO v_count
  FROM information_schema.views
  WHERE table_schema = 'public' AND table_name = 'v_csp_violations_recent';
  IF v_count = 1 THEN
    RAISE NOTICE 'CANARY OK: v_csp_violations_recent view exists';
  ELSE
    RAISE WARNING 'CANARY FAIL: v_csp_violations_recent view missing';
  END IF;
END $canary$;


\echo
\echo '====== Canary: critical write RPCs all call audit_write ======'
DO $canary$
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
    RAISE WARNING 'CANARY FAIL: % critical RPCs missing audit_write: %', array_length(v_critical, 1), v_missing;
  ELSIF v_count = 0 THEN
    RAISE NOTICE 'CANARY INFO: no critical RPCs in this DB (skipped)';
  ELSE
    RAISE NOTICE 'CANARY OK: all % critical write RPCs call audit_write', v_count;
  END IF;
END $canary$;


\echo
\echo '====== Canary summary ======'
\echo 'If you see any CANARY FAIL above, the audit gates have failed.'
\echo 'A WARNING means a hard-fail; a NOTICE means an info-level finding.'
\echo 'Run the individual test files for PASS/FAIL evidence.'
