-- Migration: 20260924000008_fix_cron_job_reliability.sql
-- Description: Repairs two independent pg_cron reliability defects that were
--              only discovered by auditing `cron.job_run_details`.
--
-- DEFECT 1 — `cron_aggregate_csp_reports()` never worked (28 failures,
-- every single day from 2026-08-27 to 2026-09-24):
--
--   ERROR: subquery uses ungrouped column "r1.received_at" from outer query
--
--   The outer SELECT groups by `date_trunc('day', received_at)` but the two
--   correlated scalar subqueries referenced `r1.received_at`, which is not
--   functionally dependent on that grouping expression, so PostgreSQL rejects
--   the whole statement. The daily CSP-violation rollup therefore produced
--   nothing at all since the day it was scheduled.
--
--   Fixed by computing the per-day aggregates in CTEs, where `day` is a real
--   column, and joining the "most frequent directive" / "most frequent blocked
--   URI" lookups on it. The `top_blocked_uri` lookup is now restricted to
--   non-NULL URIs (the previous intent) instead of ranking NULLs first.
--
-- DEFECT 2 — the two 15-minute jobs collided with each other and with the
-- 10-minute job, producing "job startup timeout" (pg_cron could not start the
-- run within its 10s window because the runner was saturated):
--
--   job  8  incentive-detect-pending-invoices   */15  -> 57 startup timeouts since 2026-08-30
--   job 25  auto-block-honeypot-attackers       */15  -> 60 startup timeouts since 2026-08-30
--   job 28  debt-dispatch-reminders             */10
--   job 27  debt-enqueue-reminders-hourly       0 * * * *
--
--   `*/15` and `*/10` both fire at :00 and :30 of every hour. The schedules are
--   now spread so that no two high-frequency jobs share a minute.
--
-- Also adds a retention job for `cron.job_run_details`, which had grown
-- unbounded since 2026-03-05 (7,987 rows / 1.9 MB) — the same class of
-- unbounded growth that produced the audit_logs incident.

-- ============================================================================
-- 1. Repair the daily CSP aggregation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cron_aggregate_csp_reports()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted int;
BEGIN
  WITH recent AS (
    SELECT received_at, violated_directive, blocked_uri
    FROM public.csp_reports
    WHERE received_at >= now() - interval '1 day'
  ),
  per_day AS (
    SELECT
      date_trunc('day', received_at)::date AS day,
      count(*)::int AS total_reports,
      count(DISTINCT (violated_directive, COALESCE(blocked_uri, '')))::int AS unique_violations,
      jsonb_object_agg(COALESCE(violated_directive, 'unknown'), dir_count) AS by_directive
    FROM (
      SELECT
        received_at,
        violated_directive,
        blocked_uri,
        count(*) OVER (PARTITION BY COALESCE(violated_directive, 'unknown')) AS dir_count
      FROM recent
    ) x
    GROUP BY 1
  ),
  top_dir AS (
    SELECT day, violated_directive FROM (
      SELECT
        date_trunc('day', received_at)::date AS day,
        violated_directive,
        row_number() OVER (
          PARTITION BY date_trunc('day', received_at)::date
          ORDER BY count(*) DESC, violated_directive
        ) AS rn
      FROM recent
      GROUP BY 1, 2
    ) t WHERE rn = 1
  ),
  top_uri AS (
    SELECT day, blocked_uri FROM (
      SELECT
        date_trunc('day', received_at)::date AS day,
        blocked_uri,
        row_number() OVER (
          PARTITION BY date_trunc('day', received_at)::date
          ORDER BY count(*) DESC, blocked_uri
        ) AS rn
      FROM recent
      WHERE blocked_uri IS NOT NULL
      GROUP BY 1, 2
    ) t WHERE rn = 1
  )
  INSERT INTO public.csp_reports_daily
    (day, total_reports, unique_violations, top_directive, top_blocked_uri, by_directive)
  SELECT p.day, p.total_reports, p.unique_violations, d.violated_directive, u.blocked_uri, p.by_directive
  FROM per_day p
  LEFT JOIN top_dir d ON d.day = p.day
  LEFT JOIN top_uri u ON u.day = p.day
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
$function$;

-- ============================================================================
-- 2. De-collide the high-frequency jobs (no two share a minute)
-- ============================================================================
SELECT cron.alter_job(8,  schedule => '4,19,34,49 * * * *');    -- was */15
SELECT cron.alter_job(25, schedule => '11,26,41,56 * * * *');   -- was */15
SELECT cron.alter_job(28, schedule => '7,17,27,37,47,57 * * * *'); -- was */10
SELECT cron.alter_job(27, schedule => '23 * * * *');            -- was 0 * * * *
-- The daily CSP rollup shared 02:00 with the backup-log job; move it off.
SELECT cron.alter_job(23, schedule => '10 2 * * *');            -- was 0 2 * * *

-- ============================================================================
-- 3. Bound the pg_cron history table
-- ============================================================================
-- pg_cron never prunes cron.job_run_details; it had accumulated every run
-- since 2026-03-05. Single-statement command so pg_cron can run it
-- non-atomically (a multi-statement command would be wrapped in a transaction
-- and fail, exactly like the old weekly VACUUM job).
SELECT cron.schedule(
  'cron-history-retention',
  '30 4 * * *',
  $cmd$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '30 days'$cmd$
);
