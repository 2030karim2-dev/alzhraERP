-- Migration: 20260924000007_fix_weekly_vacuum_cron_job.sql
-- Description: Repairs pg_cron job 5 ("weekly-vacuum-core-tables"), which had
--              been failing on EVERY run since at least 2026-08-16.
--
-- Root cause: pg_cron executes a multi-statement command inside a transaction
-- block, and PostgreSQL refuses to run VACUUM there:
--
--   ERROR: VACUUM cannot run inside a transaction block
--
-- Evidence from cron.job_run_details (job 5, weekly at 02:00 Sunday):
--   2026-08-16 02:00  failed
--   2026-08-23 02:00  failed
--   2026-08-30 02:00  failed
--   2026-09-06 02:00  failed
--   2026-09-13 02:00  failed
--   2026-09-20 02:00  failed
--
-- Fix: a SINGLE VACUUM statement that takes a table list is executed
-- non-atomically by pg_cron and therefore succeeds. Verified on 2026-09-24:
-- a one-statement `VACUUM (FULL, ANALYZE) public.invoices` job reported
-- status = succeeded with return_message = 'VACUUM'.
--
-- The table list and the schedule are otherwise unchanged.

SELECT cron.alter_job(
  5,
  command => 'VACUUM (ANALYZE) public.audit_logs, public.inventory_transactions, public.product_stock, public.products, public.parties, public.invoices, public.journal_entries, public.journal_entry_lines'
);
