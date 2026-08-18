-- ============================================================
-- 20260819000006_index_fk_search_path.sql
-- Advisor hardening round 4 (applied directly to live DB):
--   1. Set immutable search_path='public' on the last 4 functions
--      flagged as `function_search_path_mutable`.
--   2. Create covering indexes for all foreign keys that lacked
--      one (`unindexed_foreign_keys` — 141 indexes, additive only).
--
-- Idempotent: safe to re-run (IF NOT EXISTS + NOT EXISTS guards).
-- ============================================================

-- 1) search_path hardening (trigger / immutable helpers)
ALTER FUNCTION public.normalize_oem_v1(text) SET search_path = public;
ALTER FUNCTION public.set_vin_analyses_updated_at() SET search_path = public;
ALTER FUNCTION public.trg_incentive_set_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2) Covering indexes for every FK column set without an index
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT left('idx_' || t.relname || '_' || string_agg(a.attname, '_' ORDER BY k.ordinality), 63) AS idx_name,
           t.relname AS tbl,
           string_agg(quote_ident(a.attname), ', ' ORDER BY k.ordinality) AS cols
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f' AND n.nspname = 'public'
      AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey::smallint[] @> c.conkey::smallint[])
    GROUP BY c.conname, c.conrelid, t.relname
    ORDER BY t.relname, c.conname
  LOOP
    BEGIN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s);', r.idx_name, r.tbl, r.cols);
    EXCEPTION WHEN duplicate_table THEN
      NULL;
    END;
  END LOOP;
END
$$;
