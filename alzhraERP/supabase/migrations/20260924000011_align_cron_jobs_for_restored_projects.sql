-- Migration: 20260924000011_align_cron_jobs_for_restored_projects.sql
-- Description: Makes the pg_cron fixes portable across projects.
--
-- WHY THIS EXISTS
--   20260924000007 and 20260924000008 hard-coded pg_cron *job ids*
--   (cron.alter_job(5, ...), cron.alter_job(8, ...)). Job ids are allocated per
--   project, so those two migrations cannot run in a project that was restored
--   from a dump rather than built by this repository's migration runner — and
--   because each migration runs in a single transaction, the whole file rolls
--   back, taking the unrelated CSP-function fix with it.
--
--   That is exactly what happened when completing the AL-JAAFARI AUTO PARTS
--   project (`orxlyiokccaodypindye`): its jobs are named `mz-job-N` with
--   different ids, `cron.alter_job` raised "Job 5 does not exist or you don't
--   own it", and 20260924000008 was lost in its entirety.
--
--   This migration is idempotent and identifies jobs by what they DO (their
--   command), never by id or name, so it behaves identically on the production
--   project and on any restored project.
--
-- It also restates the repaired `cron_aggregate_csp_reports()` for the same
-- reason: a restored project needs that fix even though 000008 could not run.

-- ============================================================================
-- 1. CSP aggregation function (restated from 20260924000008; idempotent)
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
-- 2. Fix cron jobs by COMMAND, never by id or name
-- ============================================================================
DO $align$
DECLARE
  r record;
BEGIN
  -- 2a. Weekly housekeeping: pg_cron wraps a multi-statement command in a
  --     transaction block and VACUUM refuses to run there. Replace it with a
  --     single VACUUM statement carrying a table list (executed non-atomically).
  FOR r IN
    SELECT jobid FROM cron.job
    WHERE command ILIKE '%VACUUM%'
      AND command LIKE '%;%'          -- more than one statement
  LOOP
    PERFORM cron.alter_job(
      r.jobid,
      command => 'VACUUM (ANALYZE) public.audit_logs, public.inventory_transactions, public.product_stock, public.products, public.parties, public.invoices, public.journal_entries, public.journal_entry_lines'
    );
  END LOOP;

  -- 2b. High-frequency jobs: `*/15` and `*/10` all fire at :00 and :30, which
  --     saturates the runner and produces "job startup timeout". Spread every
  --     unique minute across the hour.
  FOR r IN SELECT jobid, command FROM cron.job WHERE command ILIKE '%incentive_detect_pending_invoices%' LOOP
    PERFORM cron.alter_job(r.jobid, schedule => '4,19,34,49 * * * *');
  END LOOP;
  FOR r IN SELECT jobid, command FROM cron.job WHERE command ILIKE '%cron_auto_block_honeypot_attackers%' LOOP
    PERFORM cron.alter_job(r.jobid, schedule => '11,26,41,56 * * * *');
  END LOOP;
  FOR r IN SELECT jobid, command FROM cron.job WHERE command ILIKE '%cron_dispatch_debt_reminders%' LOOP
    PERFORM cron.alter_job(r.jobid, schedule => '7,17,27,37,47,57 * * * *');
  END LOOP;
  FOR r IN SELECT jobid, command FROM cron.job WHERE command ILIKE '%cron_enqueue_debt_reminders%' LOOP
    PERFORM cron.alter_job(r.jobid, schedule => '23 * * * *');
  END LOOP;
  -- 2c. The daily CSP rollup shared 02:00 with the backup-log job.
  FOR r IN SELECT jobid, command FROM cron.job WHERE command ILIKE '%cron_aggregate_csp_reports%' LOOP
    PERFORM cron.alter_job(r.jobid, schedule => '10 2 * * *');
  END LOOP;
END
$align$;

-- ============================================================================
-- 3. Bound the pg_cron history table (portable: scheduled by NAME)
-- ============================================================================
SELECT cron.schedule(
  'cron-history-retention',
  '30 4 * * *',
  $cmd$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '30 days'$cmd$
);
