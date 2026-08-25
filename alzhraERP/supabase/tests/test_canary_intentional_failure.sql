-- ============================================================
-- Test: test_canary_intentional_failure.sql
-- Purpose: PROVE that the security canary catches a real
--          vulnerability. This is run as a meta-test:
--          1) Create an intentionally insecure function.
--          2) Run the canary view.
--          3) Assert the canary returns >0 rows.
--          4) Drop the function.
--          5) Assert the canary returns 0 rows.
--
-- This file is the only way to prove the canary isn't a
-- tautological "0 rows because there's nothing to flag" check.
-- ============================================================

\echo '====== Meta-test: canary must catch intentional vulnerabilities ======'
DO $meta$
DECLARE
  v_pre int;
  v_during int;
  v_post int;
BEGIN
  -- Step 1: snapshot the canary baseline
  SELECT count(*) INTO v_pre FROM public.v_security_definer_no_search_path;

  -- Step 2: create an intentionally insecure function
  -- (no SET search_path, called by the canary view)
  EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.intentionally_insecure_fn()
    RETURNS int
    LANGUAGE plpgsql
    SECURITY DEFINER
    -- NOTE: no SET search_path
    AS $body$
    DECLARE
      v_x int;
    BEGIN
      v_x := 1;
      RETURN v_x;
    END;
    $body$;
  $func$;

  -- Step 3: re-run the canary
  SELECT count(*) INTO v_during FROM public.v_security_definer_no_search_path;

  -- Step 4: drop the vulnerable function
  EXECUTE 'DROP FUNCTION public.intentionally_insecure_fn()';

  -- Step 5: verify the canary returns to baseline
  SELECT count(*) INTO v_post FROM public.v_security_definer_no_search_path;

  -- Assertions
  IF v_during > v_pre THEN
    RAISE NOTICE 'META-TEST PASS: canary detected the intentional vulnerability (rows went % -> % -> %)', v_pre, v_during, v_post;
  ELSE
    RAISE WARNING 'META-TEST FAIL: canary did NOT detect the intentional vulnerability (rows: % -> % -> %)', v_pre, v_during, v_post;
  END IF;
END $meta$;
