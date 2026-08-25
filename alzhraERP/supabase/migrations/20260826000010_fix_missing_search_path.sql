-- ============================================================
-- Migration: 20260826000010_fix_missing_search_path.sql
-- Date: 2026-08-26
-- Severity: MEDIUM (R-30)
--
-- PURPOSE:
-- Pin search_path on trigger functions chat_guard_body and honeypot_alert.
-- ============================================================

BEGIN;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'chat_guard_body') THEN
    EXECUTE 'ALTER FUNCTION public.chat_guard_body() SET search_path TO ''public''';
    RAISE NOTICE 'R-30: pinned search_path on chat_guard_body()';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'honeypot_alert') THEN
    EXECUTE 'ALTER FUNCTION public.honeypot_alert() SET search_path TO ''public''';
    RAISE NOTICE 'R-30: pinned search_path on honeypot_alert()';
  END IF;
END $do$;

NOTIFY pgrst, 'reload schema';

COMMIT;
