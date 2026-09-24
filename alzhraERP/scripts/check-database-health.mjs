#!/usr/bin/env node
/**
 * Database-health guard for the hosted Supabase project.
 *
 * Why this exists
 * ---------------
 * On 2026-09-24 this project was found at 2,694 MB against a 500 MB Free-plan
 * database limit (5.4x over). Two failures had gone completely unnoticed:
 *
 *   1. `public.audit_logs` had grown to 1,855 MB (69% of the whole database)
 *      because a trigger stored the full before/after row on every change and
 *      the party-statistics trigger rewrote party rows unconditionally.
 *   2. pg_cron job 5 ("weekly-vacuum-core-tables") had been failing on EVERY
 *      run since 2026-08-16 with "VACUUM cannot run inside a transaction
 *      block" - six weeks of scheduled maintenance silently lost.
 *
 * Nothing in the repo's quality gates looks at the database, so both problems
 * were only discovered when the plan limit was already exceeded. This script
 * is that missing gate.
 *
 * What it checks
 * --------------
 *   - total database size against the plan limit
 *   - audit_logs' share of the database (the historical failure mode)
 *   - index bytes vs table bytes (index bloat)
 *   - invalid indexes left behind by an interrupted REINDEX
 *   - pg_cron jobs that are FAILING (the silent-failure guard)
 *   - replication slots whose retained WAL is growing without bound
 *
 * Usage
 * -----
 *   npm run check:db:health
 *   DB_PLAN_LIMIT_MB=8192 npm run check:db:health      # Pro plan
 *
 * The token is read from $SUPABASE_ACCESS_TOKEN, falling back to
 * ~/.supabase/access-token (same convention as scripts/apply-migrations.mjs).
 *
 * Exit codes: 0 = healthy (warnings allowed), 1 = one or more hard failures.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'zzthamxjxnxzzpswllid';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const LIMIT_MB = Number(process.env.DB_PLAN_LIMIT_MB || 500);

/** Share of the database that audit_logs may occupy before it is a concern. */
const AUDIT_SHARE_WARN = 10;
const AUDIT_SHARE_FAIL = 25;
/** Index bytes may exceed table bytes by this factor before we flag bloat. */
const INDEX_HEAP_WARN = 1.5;
/** Failures of a single cron job inside the window that count as "broken". */
const CRON_FAILURES_FAIL = 2;
const CRON_WINDOW_DAYS = 7;
/** Retained WAL on a replication slot that suggests a stalled consumer. */
const RETAINED_WAL_WARN_MB = 512;

const token = (process.env.SUPABASE_ACCESS_TOKEN ||
  readFileSync(join(process.env.USERPROFILE || '', '.supabase', 'access-token'), 'utf8')).trim();

const problems = [];
const warnings = [];

const mb = (bytes) => `${(Number(bytes) / 1048576).toFixed(1)} MB`;
const pct = (part, whole) => `${((Number(part) / Number(whole)) * 100).toFixed(1)}%`;

/** Runs one SQL statement, retrying the transient 5xx the API occasionally emits. */
async function sql(query) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(120000),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  throw lastErr;
}

function report(level, message) {
  const icon = level === 'fail' ? '  x' : level === 'warn' ? '  !' : '  ok';
  console.log(`${icon} ${message}`);
  if (level === 'fail') problems.push(message);
  if (level === 'warn') warnings.push(message);
}

async function main() {
  console.log(`\n[database-health] project ${PROJECT_REF} — plan limit ${LIMIT_MB} MB\n`);

  // ---- 1. total size vs plan limit --------------------------------------
  const [{ b: dbBytes }] = await sql('SELECT pg_database_size(current_database()) AS b');
  const usedPct = (Number(dbBytes) / (LIMIT_MB * 1048576)) * 100;
  const sizeLine = `database size ${mb(dbBytes)} of ${LIMIT_MB} MB limit (${usedPct.toFixed(1)}%)`;
  if (usedPct >= 95) report('fail', `${sizeLine} — at/over the plan limit`);
  else if (usedPct >= 80) report('warn', `${sizeLine} — little headroom left`);
  else report('ok', sizeLine);

  // ---- 2. audit_logs share (the historical failure mode) ----------------
  const [sizes] = await sql(`
    SELECT
      (SELECT pg_total_relation_size('public.audit_logs'))                       AS audit_bytes,
      (SELECT COALESCE(sum(pg_relation_size(c.oid)),0) FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r')                          AS heap_bytes,
      (SELECT COALESCE(sum(pg_indexes_size(c.oid)),0) FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r')                          AS index_bytes`);
  const auditShare = (Number(sizes.audit_bytes) / Number(dbBytes)) * 100;
  const auditLine = `audit_logs ${mb(sizes.audit_bytes)} = ${auditShare.toFixed(1)}% of the database`;
  if (auditShare >= AUDIT_SHARE_FAIL) report('fail', `${auditLine} — runaway log growth, prune it`);
  else if (auditShare >= AUDIT_SHARE_WARN) report('warn', `${auditLine} — watch this`);
  else report('ok', auditLine);

  // ---- 3. index bloat ---------------------------------------------------
  const ratio = Number(sizes.index_bytes) / Number(sizes.heap_bytes || 1);
  const idxLine = `indexes ${mb(sizes.index_bytes)} vs tables ${mb(sizes.heap_bytes)} (ratio ${ratio.toFixed(2)}x)`;
  if (ratio >= INDEX_HEAP_WARN) report('warn', `${idxLine} — REINDEX is likely due`);
  else report('ok', idxLine);

  // ---- 4. invalid indexes (interrupted REINDEX) -------------------------
  const [{ n: invalid }] = await sql('SELECT count(*) AS n FROM pg_index WHERE NOT indisvalid');
  if (Number(invalid) > 0) report('fail', `${invalid} invalid index(es) — an interrupted REINDEX must be rerun`);
  else report('ok', 'no invalid indexes');

  // ---- 5. failing pg_cron jobs (the silent-failure guard) ---------------
  // A job is only treated as a HARD failure when its MOST RECENT run failed —
  // i.e. it is broken right now. Jobs that failed in the window but have since
  // run successfully are reported as warnings, so a historical failure that has
  // already been fixed cannot turn this check into permanent noise.
  const cron = await sql(`
    WITH last_run AS (
      SELECT DISTINCT ON (d.jobid)
             d.jobid, j.jobname, j.active AS job_active,
             d.status, d.start_time, d.return_message
        FROM cron.job_run_details d
        JOIN cron.job j ON j.jobid = d.jobid
       ORDER BY d.jobid, d.start_time DESC
    ),
    window_failures AS (
      SELECT jobid, count(*) AS failures, min(return_message) AS sample_error
        FROM cron.job_run_details
       WHERE status = 'failed'
         AND start_time > now() - interval '${CRON_WINDOW_DAYS} days'
       GROUP BY jobid
    )
    SELECT l.jobid, l.jobname, l.status AS last_status, l.start_time AS last_run,
           l.return_message AS last_error, l.job_active,
           COALESCE(w.failures, 0) AS failures_7d,
           w.sample_error
      FROM last_run l
      LEFT JOIN window_failures w ON w.jobid = l.jobid
     WHERE l.status = 'failed' OR COALESCE(w.failures, 0) > 0
     ORDER BY (l.status = 'failed') DESC, COALESCE(w.failures, 0) DESC`);

  const broken = cron.filter((r) => r.last_status === 'failed' && r.job_active);
  const recovered = cron.filter((r) => !(r.last_status === 'failed' && r.job_active));

  if (broken.length === 0 && recovered.length === 0) {
    report('ok', `no failing pg_cron jobs in the last ${CRON_WINDOW_DAYS} days`);
  } else {
    for (const row of broken) {
      const err = String(row.last_error ?? '').replace(/\s+/g, ' ').trim().slice(0, 90);
      report('fail', `cron job "${row.jobname}" is FAILING (last run ${row.last_run}) — ${err}`);
    }
    for (const row of recovered) {
      const err = String(row.sample_error ?? '').replace(/\s+/g, ' ').trim().slice(0, 70);
      const level = Number(row.failures_7d) >= CRON_FAILURES_FAIL ? 'warn' : 'ok';
      report(level, `cron job "${row.jobname}" recovered — ${row.failures_7d} failure(s) in ${CRON_WINDOW_DAYS}d, latest run OK (${err})`);
    }
  }

  // ---- 6. replication slots with unbounded retained WAL ------------------
  const slots = await sql(`
    SELECT slot_name, active,
           pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
      FROM pg_replication_slots`);
  const stuck = slots.filter((s) => Number(s.retained_bytes) > RETAINED_WAL_WARN_MB * 1048576);
  if (stuck.length === 0) {
    report('ok', `${slots.length} replication slot(s), retained WAL within bounds`);
  } else {
    for (const s of stuck) report('warn', `slot ${s.slot_name} retaining ${mb(s.retained_bytes)} of WAL`);
  }

  // ---- 7. biggest tables, for context ----------------------------------
  const top = await sql(`
    SELECT c.relname AS tbl, pg_total_relation_size(c.oid) AS b
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 8`);
  console.log('\n  largest tables:');
  for (const t of top) console.log(`      ${String(t.tbl).padEnd(30)} ${mb(t.b).padStart(10)}`);

  // ---- summary ---------------------------------------------------------
  console.log('');
  if (problems.length > 0) {
    console.log(`[database-health] FAILED — ${problems.length} problem(s), ${warnings.length} warning(s).`);
    console.log('  Remediation playbook: docs/database-size-audit-2026-09-24.md');
    process.exit(1);
  }
  console.log(`[database-health] OK — ${warnings.length} warning(s).`);
}

main().catch((err) => {
  console.error(`[database-health] could not run: ${err?.message ?? err}`);
  process.exit(1);
});
