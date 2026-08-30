-- ============================================================
-- Migration: 20260826000006_input_validation_triggers.sql
-- Date: 2026-08-26
-- Severity: MEDIUM (Phase 14)
--
-- PURPOSE:
-- Add server-side length / format guards to text columns that
-- the frontend can write to (parties.name, products.name_ar,
-- accounts.name_ar, chat_messages.body, etc.). Defense in depth
-- against:
--   1) Frontend bugs (missing maxLength on inputs)
--   2) Direct API calls bypassing the UI
--   3) Malicious users trying to inject large strings to
--      DoS the system (billion-laughs style or row-size bloat)
--
-- APPROACH:
-- Generic trigger function that reads a JSON of
-- {table_name: {column_name: max_length}} and rejects INSERT
-- or UPDATE when any column exceeds its limit.
--
-- Per-table triggers are then installed on the high-risk
-- columns.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Generic length validation trigger function.
--    Usage: install a BEFORE INSERT OR UPDATE trigger on the
--    target table; the function reads the column lengths from
--    a config table OR from per-trigger configuration.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public._text_length_limits (
  table_name text NOT NULL,
  column_name text NOT NULL,
  max_length integer NOT NULL,
  PRIMARY KEY (table_name, column_name)
);

ALTER TABLE public._text_length_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS text_length_limits_read ON public._text_length_limits;
CREATE POLICY text_length_limits_read ON public._text_length_limits
  FOR SELECT TO authenticated, anon
  USING (true);

-- Seed the limits (conservative; supersede the existing application
-- maxLength attributes with server-side truth).
INSERT INTO public._text_length_limits (table_name, column_name, max_length) VALUES
  ('parties',          'name',           200),
  ('parties',          'phone',           32),
  ('parties',          'email',          254),
  ('parties',          'tax_number',      64),
  ('parties',          'address',       1000),
  ('products',         'name_ar',        500),
  ('products',         'sku',            100),
  ('products',         'part_number',    100),
  ('products',         'description',   4000),
  ('accounts',         'name_ar',        200),
  ('accounts',         'name_en',        200),
  ('expenses',         'description',   2000),
  ('invoices',         'notes',         4000),
  ('invoices',         'invoice_number',  64),
  ('payments',         'notes',         4000),
  ('journal_entries',  'description',   4000),
  ('companies',        'name',           200),
  ('companies',        'name_ar',        200),
  ('companies',        'name_en',        200),
  ('user_profiles',    'full_name',      200)
ON CONFLICT (table_name, column_name) DO UPDATE
  SET max_length = EXCLUDED.max_length;

-- Trigger function
CREATE OR REPLACE FUNCTION public.guard_text_lengths()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  v_rec record;
  v_val text;
BEGIN
  FOR v_rec IN
    SELECT column_name, max_length
    FROM public._text_length_limits
    WHERE table_name = TG_TABLE_NAME
  LOOP
    EXECUTE format('SELECT ($1).%I::text', v_rec.column_name)
      INTO v_val
      USING NEW;

    IF v_val IS NOT NULL AND length(v_val) > v_rec.max_length THEN
      RAISE EXCEPTION '% exceeds maximum length of % characters',
        v_rec.column_name, v_rec.max_length
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.guard_text_lengths() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_text_lengths() TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 2) Install the trigger on the high-risk tables.
--    Each BEFORE INSERT OR UPDATE trigger fires the same function.
-- ─────────────────────────────────────────────────────────────

DO $do$
DECLARE
  v_t record;
BEGIN
  FOR v_t IN
    SELECT DISTINCT l.table_name
    FROM public._text_length_limits l
    JOIN pg_tables t ON t.schemaname = 'public' AND t.tablename = l.table_name
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_text_lengths ON public.%I', v_t.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_guard_text_lengths BEFORE INSERT OR UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.guard_text_lengths()',
      v_t.table_name
    );
  END LOOP;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 3) Specific guard: reject control characters in
--    parties.name and products.name_ar (defense in depth even
--    though we render as text, this prevents client-side XSS
--    via DOM-based attacks on browser extensions that read
--    these values).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.guard_text_control_chars()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  v_col record;
  v_val text;
  v_bad text := '';
BEGIN
  -- Only check string columns present in the table
  FOR v_col IN
    SELECT a.attname AS col
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = TG_TABLE_NAME
      AND a.atttypid = 'text'::regtype
      AND a.attnum > 0
      AND NOT a.attisdropped
  LOOP
    EXECUTE format('SELECT ($1).%I::text', v_col.col) INTO v_val USING NEW;
    IF v_val IS NOT NULL AND v_val ~ '[\x00-\x08\x0B\x0C\x0E-\x1F]' THEN
      v_bad := v_bad || v_col.col || ', ';
    END IF;
  END LOOP;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'control_chars_rejected: % contain illegal control characters', rtrim(v_bad, ', ')
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.guard_text_control_chars() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_text_control_chars() TO authenticated;

DO $do$
DECLARE
  v_t record;
BEGIN
  FOR v_t IN
    SELECT DISTINCT table_name FROM public._text_length_limits
    WHERE table_name IN ('parties', 'products', 'accounts', 'companies', 'expenses', 'invoices', 'payments')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_text_control_chars ON public.%I', v_t.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_guard_text_control_chars BEFORE INSERT OR UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.guard_text_control_chars()',
      v_t.table_name
    );
  END LOOP;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 4) Update v_rpcs_missing_audit (the new limits table should
--    be tracked).
-- ─────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

COMMIT;
