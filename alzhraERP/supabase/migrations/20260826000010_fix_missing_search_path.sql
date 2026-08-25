-- ============================================================
-- Migration: 20260826000010_fix_missing_search_path.sql
-- Date: 2026-08-26
-- Severity: MEDIUM (R-30)
--
-- PURPOSE:
-- Adversarial audit (Phase 6) found 2 SECURITY DEFINER trigger
-- functions that were missing SET search_path:
--   1) public.chat_guard_body (added in 20260826000000)
--   2) public.honeypot_alert  (added in 20260826000008)
--
-- Without search_path pinning, an attacker who can create a
-- schema (e.g. via a future privilege escalation) could
-- shadow the references in these trigger bodies and execute
-- arbitrary code in the SECURITY DEFINER context.
--
-- The triggers only reference public.chat_messages,
-- public.security_alert, and a small set of fully-qualified
-- names — so the impact is lower than for an RPC. But
-- defense in depth dictates pinning anyway.
--
-- FIX: SET search_path TO 'public' on both functions, then
--      ALTER FUNCTION ... DEPENDS ON EXTENSION pg_trgm; etc.
--      are NOT needed.
-- ============================================================

BEGIN;

DO $do$
DECLARE
  v_body text;
  v_new text;
  v_count int := 0;
BEGIN
  FOR v_body IN
    SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('chat_guard_body', 'honeypot_alert')
      AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
  LOOP
    IF v_body LIKE '%SET search_path TO %public%' THEN
      CONTINUE;
    END IF;
    v_new := regexp_replace(
      v_body,
      E'(LANGUAGE plpgsql\s*\n)(AS \$func\$)',
      E'\1 SET search_path TO ''public''\n\2',
      1
    );
    IF v_new = v_body THEN
      v_new := regexp_replace(
        v_body,
        E'(LANGUAGE plpgsql)',
        E'\1' || chr(10) || ' SET search_path TO ''public''',
        1
      );
    END IF;
    IF v_new = v_body THEN
      RAISE WARNING 'Could not inject SET search_path into body containing: %', left(v_body, 200);
      CONTINUE;
    END IF;
    EXECUTE v_new;
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'R-30: pinned search_path on % functions', v_count;
END $do$;


NOTIFY pgrst, 'reload schema';

COMMIT;
