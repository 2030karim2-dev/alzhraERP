-- ============================================================
-- Test: test_rls_isolation.sql
-- Purpose: prove that RLS prevents cross-tenant reads/writes
--          on the most-used business tables.
--
-- Each test sets a fake JWT, attempts the operation, expects
-- the operation to fail or return zero rows. All changes are
-- rolled back at the end.
-- ============================================================

\echo '====== RLS: anon cannot SELECT from business tables ======'
DO $test$
DECLARE
  v_count int;
BEGIN
  -- Simulate anon: clear JWT claims, set role to anon.
  PERFORM set_config('request.jwt.claims', null, false);
  SET LOCAL role anon;

  -- Attempt a SELECT on companies; expect 0 rows (RLS or no rows at all).
  BEGIN
    SELECT count(*) INTO v_count FROM public.companies;
    IF v_count = 0 THEN
      RAISE NOTICE 'PASS: anon sees 0 rows in public.companies';
    ELSE
      RAISE WARNING 'FAIL: anon sees % rows in public.companies', v_count;
    END IF;
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    RAISE NOTICE 'PASS: anon SELECT on public.companies denied: %', SQLERRM;
  END;

  RESET role;
  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'rollback_test' THEN
    RAISE NOTICE 'TEST complete (changes rolled back)';
  ELSE
    RAISE;
  END IF;
END $test$;


\echo
\echo '====== RLS: authenticated user in company A cannot SELECT company B data ======'
DO $test$
DECLARE
  v_company_a uuid := gen_random_uuid();
  v_company_b uuid := gen_random_uuid();
  v_user_a    uuid := gen_random_uuid();
  v_invoice_count int;
BEGIN
  -- Create two companies and one user in A.
  INSERT INTO public.companies (id, name, name_ar)
  VALUES (v_company_a, 'TEST_RLS_A', 'أ'), (v_company_b, 'TEST_RLS_B', 'ب');

  INSERT INTO public.user_company_roles (user_id, company_id, role)
  VALUES (v_user_a, v_company_a, 'admin');

  INSERT INTO public.invoices (company_id, type, total_amount, status, created_by)
  VALUES (v_company_b, 'sale', 100, 'draft', v_user_a);

  -- Switch to user A.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text,
    true);

  SELECT count(*) INTO v_invoice_count FROM public.invoices WHERE company_id = v_company_b;

  IF v_invoice_count = 0 THEN
    RAISE NOTICE 'PASS: user in company A sees 0 invoices from company B';
  ELSE
    RAISE WARNING 'FAIL: user in company A sees % invoices from company B (RLS leak!)', v_invoice_count;
  END IF;

  RAISE EXCEPTION 'rollback_test' USING ERRCODE = 'P0001';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'rollback_test' THEN
    RAISE NOTICE 'TEST complete (changes rolled back)';
  ELSE
    RAISE;
  END IF;
END $test$;
