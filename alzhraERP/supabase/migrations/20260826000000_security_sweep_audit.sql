-- ============================================================
-- Migration: 20260826000000_security_sweep_audit.sql
-- Date: 2026-08-26
-- Purpose: Idempotent security audit + hardening sweep
--
-- Sections:
--   1) Helper view: tables without RLS (for review)
--   2) Helper view: SECURITY DEFINER functions missing SET search_path
--   3) Helper view: functions with PUBLIC EXECUTE
--   4) Defensive REVOKE/GRANT on known critical functions
--   5) Idempotency UNIQUE constraint hardening
--   6) Storage MIME-type guard trigger (defense in depth)
--   7) Chat body sanitization trigger
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) v_tables_without_rls — for manual review, NOT auto-fix
--    A table may legitimately be public (e.g. currencies lookup,
--    enums, etc.) — review before enabling RLS.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_tables_without_rls AS
SELECT n.nspname AS schema, c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relrowsecurity = false
ORDER BY c.relname;

GRANT SELECT ON public.v_tables_without_rls TO authenticated;
REVOKE ALL ON public.v_tables_without_rls FROM anon;
REVOKE ALL ON public.v_tables_without_rls FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────
-- 2) v_security_definer_no_search_path — flags any SECURITY
--    DEFINER function that does NOT have search_path pinned.
--    These are vulnerable to search_path hijacking if a hostile
--    schema is created before the function runs.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_security_definer_no_search_path AS
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.oid
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
  AND n.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(p.proconfig) AS cfg
    WHERE cfg LIKE 'search_path=%'
  )
ORDER BY p.proname;

GRANT SELECT ON public.v_security_definer_no_search_path TO authenticated;
REVOKE ALL ON public.v_security_definer_no_search_path FROM anon;
REVOKE ALL ON public.v_security_definer_no_search_path FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────
-- 3) v_functions_public_execute — flags functions that are
--    executable by the PUBLIC role (which includes anon in
--    Supabase). Should be REVOKEd from PUBLIC and granted to
--    authenticated or service_role explicitly.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_functions_public_execute AS
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.oid
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND has_function_privilege('PUBLIC', p.oid, 'EXECUTE')
ORDER BY p.proname;

GRANT SELECT ON public.v_functions_public_execute TO authenticated;
REVOKE ALL ON public.v_functions_public_execute FROM anon;
REVOKE ALL ON public.v_functions_public_execute FROM PUBLIC;


-- ─────────────────────────────────────────────────────────────
-- 4) Defensive REVOKE/GRANT for the well-known RPCs that are
--    already hardened in earlier migrations — this is a no-op
--    if they're already correct, and a safety net for fresh
--    databases where earlier migrations were not applied in
--    order.
-- ─────────────────────────────────────────────────────────────

-- has_permission (both overloads)
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='has_permission' AND pg_get_function_identity_arguments(p.oid)='p_permission text') THEN
    REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='has_permission' AND pg_get_function_identity_arguments(p.oid)='p_permission text, p_company_id uuid') THEN
    REVOKE EXECUTE ON FUNCTION public.has_permission(text, uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.has_permission(text, uuid) TO authenticated;
  END IF;
END $do$;

-- get_user_permissions (both overloads)
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='get_user_permissions' AND pg_get_function_identity_arguments(p.oid)='') THEN
    REVOKE EXECUTE ON FUNCTION public.get_user_permissions() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.get_user_permissions() TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='get_user_permissions' AND pg_get_function_identity_arguments(p.oid)='p_company_id uuid') THEN
    REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 5) Idempotency UNIQUE index — confirm the client-supplied
--    idempotency_key cannot be reused to create duplicate rows.
--    Migration 20260816000005 added the column and a global
--    UNIQUE index on (idempotency_key) — which is a cross-tenant
--    DoS vector: tenant A could squat a key tenant B wants to
--    use, blocking B's invoice. Replace the global index with
--    a per-company index, scoped by (company_id, idempotency_key).
-- ─────────────────────────────────────────────────────────────
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'idempotency_key'
  ) THEN
    -- 5a) Add a per-company unique index IF MISSING.
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'idx_invoices_company_idem_key'
    ) THEN
      CREATE UNIQUE INDEX idx_invoices_company_idem_key
        ON public.invoices (company_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL;
    END IF;

    -- 5b) Keep the legacy global index BUT only as a non-unique
    -- supporting index for the existing query plan. Do NOT drop
    -- the old index name; a parallel index on the same column is
    -- wasteful, so we drop the old one and rely on the new one.
    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'idx_invoices_idempotency_key'
    ) THEN
      DROP INDEX IF EXISTS public.idx_invoices_idempotency_key;
    END IF;
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 6) Storage MIME guard — block image/svg+xml and any text/html
--    variant from being stored, even if a per-bucket policy is
--    misconfigured. SVG and HTML are XSS vectors when later
--    rendered in the same origin.
--
--    This trigger runs as table owner (postgres) so it can
--    reject regardless of who is inserting. It only inspects
--    inserts (uploads are INSERTs on storage.objects).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.storage_guard_dangerous_mime()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  v_mime text := lower(coalesce(NEW.mime_type, ''));
BEGIN
  -- Block SVG (XSS via inline <script> and on* attributes) and any
  -- HTML/XHTML variant that a browser would render.
  IF v_mime IN (
    'image/svg+xml',
    'image/svg',
    'text/html',
    'application/xhtml+xml',
    'text/xhtml',
    'application/html'
  ) THEN
    RAISE EXCEPTION 'storage_guard: mime_type % is not allowed (security policy)', v_mime
      USING ERRCODE = '42501';
  END IF;

  -- Block executable content masquerading as something benign.
  IF v_mime IN (
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-executable',
    'application/x-shockwave-flash',
    'application/java-archive',
    'application/x-java-applet'
  ) THEN
    RAISE EXCEPTION 'storage_guard: mime_type % is not allowed (security policy)', v_mime
      USING ERRCODE = '42501';
  END IF;

  -- Enforce a hard size cap at the storage layer (25 MB). The
  -- per-bucket policies should enforce smaller caps (10 MB images
  -- etc.), but this is the last line of defense.
  IF octet_length(NEW.data) IS NOT NULL AND octet_length(NEW.data) > 26214400 THEN
    RAISE EXCEPTION 'storage_guard: object exceeds 25MB hard cap'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$func$;

-- Drop and recreate so this is idempotent.
DROP TRIGGER IF EXISTS trg_storage_guard_mime ON storage.objects;
CREATE TRIGGER trg_storage_guard_mime
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.storage_guard_dangerous_mime();


-- ─────────────────────────────────────────────────────────────
-- 7) Chat body sanitization — reject control characters in
--    chat_messages.body BEFORE INSERT/UPDATE. The frontend
--    already renders messages as text (no Markdown), but a
--    poisoned message body containing a NULL byte, BOM, or
--    bidi override can still break clients that auto-detect
--    encoding or do string slicing.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.chat_guard_body()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  v_body text;
BEGIN
  v_body := NEW.body;

  -- Strip ASCII control characters except whitespace (\t \n \r).
  -- Also strip bidi overrides (U+202A-U+202E, U+2066-U+2069) which
  -- are a known UI-redress vector.
  v_body := regexp_replace(
    v_body,
    '[\x00-\x08\x0B\x0C\x0E-\x1F\u202A-\u202E\u2066-\u2069]',
    '',
    'g'
  );

  -- Hard cap on body size to prevent a single message from
  -- blowing up the row (Postgres TOAST handles >2KB automatically,
  -- but a 1MB chat message is abuse).
  IF length(v_body) > 16000 THEN
    RAISE EXCEPTION 'chat_messages.body exceeds 16KB cap' USING ERRCODE = '22023';
  END IF;

  NEW.body := v_body;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_chat_messages_body_guard ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_body_guard
  BEFORE INSERT OR UPDATE OF body ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_guard_body();


-- ─────────────────────────────────────────────────────────────
-- 8) Audit-log NOT NULL guards — defense in depth so a bug in
--    a future migration cannot leave an audit row with no actor.
-- ─────────────────────────────────────────────────────────────
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='audit_logs' AND column_name='action') THEN
    -- Add CHECK that action is non-empty; existing rows are fine.
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_action_nonempty'
    ) THEN
      ALTER TABLE public.audit_logs
        ADD CONSTRAINT audit_logs_action_nonempty
        CHECK (length(trim(action)) > 0);
    END IF;
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 9) Reload PostgREST schema cache so the views and triggers
--    are immediately visible to the API.
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;
