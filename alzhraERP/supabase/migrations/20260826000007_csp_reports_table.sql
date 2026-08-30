-- ============================================================
-- Migration: 20260826000007_csp_reports_table.sql
-- Date: 2026-08-26
-- Severity: INFORMATIONAL (defense in depth)
--
-- PURPOSE:
-- Receives Content-Security-Policy violation reports from the
-- browser. The `report-uri` directive in the CSP header is
-- configured to POST here. Reports are stored and analyzed
-- weekly to detect:
--   1) New inline scripts added by future code (potential XSS)
--   2) Unexpected third-party scripts (supply-chain attack)
--   3) Misconfigured CSP that breaks legitimate code
--
-- The reports are aggregated in csp_reports_daily by a pg_cron
-- job, then csp_reports rows older than 90 days are purged.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Raw reports table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.csp_reports (
  id          bigserial PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  -- csp-report fields
  blocked_uri text,
  document_uri text,
  violated_directive text,
  effective_directive text,
  original_policy text,
  disposition text,
  referrer text,
  script_sample text,
  source_file text,
  line_number int,
  column_number int,
  status_code int,
  -- request metadata (set by the Edge Function)
  user_agent text,
  remote_addr text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- raw payload for forensics
  raw_payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS csp_reports_received_at_idx ON public.csp_reports (received_at DESC);
CREATE INDEX IF NOT EXISTS csp_reports_directive_idx ON public.csp_reports (violated_directive);
CREATE INDEX IF NOT EXISTS csp_reports_company_idx ON public.csp_reports (company_id);

COMMENT ON TABLE public.csp_reports IS
  'Raw CSP violation reports. The Edge Function csp-report inserts here.';

-- RLS: only service_role can read/insert (the Edge Function uses service_role).
ALTER TABLE public.csp_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csp_reports_super_admin ON public.csp_reports;
CREATE POLICY csp_reports_super_admin ON public.csp_reports
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- ─────────────────────────────────────────────────────────────
-- 2) Daily aggregation table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.csp_reports_daily (
  day date PRIMARY KEY,
  total_reports int NOT NULL DEFAULT 0,
  unique_violations int NOT NULL DEFAULT 0,
  top_directive text,
  top_blocked_uri text,
  by_directive jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.csp_reports_daily IS
  'Daily rollup of CSP reports. Populated by pg_cron from csp_reports.';

ALTER TABLE public.csp_reports_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS csp_reports_daily_super_admin ON public.csp_reports_daily;
CREATE POLICY csp_reports_daily_super_admin ON public.csp_reports_daily
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- ─────────────────────────────────────────────────────────────
-- 3) pg_cron aggregator
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cron_aggregate_csp_reports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_inserted int;
BEGIN
  INSERT INTO public.csp_reports_daily (day, total_reports, unique_violations, top_directive, top_blocked_uri, by_directive)
  SELECT
    date_trunc('day', received_at)::date AS day,
    count(*)::int AS total_reports,
    count(distinct (violated_directive, coalesce(blocked_uri, '')))::int AS unique_violations,
    (SELECT violated_directive FROM public.csp_reports r2
       WHERE date_trunc('day', r2.received_at)::date = date_trunc('day', r1.received_at)::date
       GROUP BY violated_directive ORDER BY count(*) DESC LIMIT 1) AS top_directive,
    (SELECT blocked_uri FROM public.csp_reports r2
       WHERE date_trunc('day', r2.received_at)::date = date_trunc('day', r1.received_at)::date
       AND r2.blocked_uri IS NOT NULL
       GROUP BY blocked_uri ORDER BY count(*) DESC LIMIT 1) AS top_blocked_uri,
    jsonb_object_agg(violated_directive, dir_count) AS by_directive
  FROM (
    SELECT
      received_at,
      violated_directive,
      blocked_uri,
      count(*) OVER (PARTITION BY violated_directive) AS dir_count
    FROM public.csp_reports
    WHERE received_at >= now() - interval '1 day'
  ) r1
  GROUP BY date_trunc('day', received_at)
  ON CONFLICT (day) DO UPDATE
    SET total_reports = EXCLUDED.total_reports,
        unique_violations = EXCLUDED.unique_violations,
        top_directive = EXCLUDED.top_directive,
        top_blocked_uri = EXCLUDED.top_blocked_uri,
        by_directive = EXCLUDED.by_directive,
        last_updated_at = now();
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.cron_aggregate_csp_reports() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_aggregate_csp_reports() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_aggregate_csp_reports() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cron_aggregate_csp_reports() TO service_role;

-- pg_cron job: run daily at 02:00 UTC
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csp-aggregate-daily') THEN
      PERFORM cron.unschedule('csp-aggregate-daily');
    END IF;
    PERFORM cron.schedule('csp-aggregate-daily', '0 2 * * *', $$SELECT public.cron_aggregate_csp_reports()$$);
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 4) Purge old reports (> 90 days)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cron_purge_csp_reports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE v_affected int;
BEGIN
  DELETE FROM public.csp_reports
  WHERE received_at < now() - interval '90 days';
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.cron_purge_csp_reports() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_purge_csp_reports() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_purge_csp_reports() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cron_purge_csp_reports() TO service_role;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csp-purge-90d') THEN
      PERFORM cron.unschedule('csp-purge-90d');
    END IF;
    PERFORM cron.schedule('csp-purge-90d', '0 3 * * 0', $$SELECT public.cron_purge_csp_reports()$$);
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 5) View: top CSP violators in the last 7 days
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_csp_violations_recent AS
SELECT
  date_trunc('hour', received_at) AS hour_bucket,
  violated_directive,
  blocked_uri,
  count(*) AS report_count,
  array_agg(distinct source_file) FILTER (WHERE source_file IS NOT NULL) AS source_files
FROM public.csp_reports
WHERE received_at >= now() - interval '7 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

GRANT SELECT ON public.v_csp_violations_recent TO authenticated;
REVOKE ALL ON public.v_csp_violations_recent FROM anon;
REVOKE ALL ON public.v_csp_violations_recent FROM PUBLIC;


NOTIFY pgrst, 'reload schema';

COMMIT;
