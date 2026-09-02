#!/usr/bin/env node
/**
 * Apply pending Supabase migrations via the Management API.
 *
 * Generic + idempotent: scans `supabase/migrations/*.sql` (sorted by version),
 * applies ONLY files whose version is not yet recorded in
 * `supabase_migrations.schema_migrations`, and records each successful apply.
 *
 * The Personal Access Token (PAT) is read from process.env.SUPABASE_ACCESS_TOKEN
 * only (never stored on disk).
 *
 * Usage: SUPABASE_ACCESS_TOKEN=<pat> node scripts/apply-migrations.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_REF = 'zzthamxjxnxzzpswllid';
const QUERY_ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN env var is required.');
  process.exit(1);
}

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

// Local migration files, sorted by version prefix. Only real migrations
// (14-digit version + name + .sql) are considered; README.md is ignored.
const MIGRATION_FILES = readdirSync(MIGRATIONS_DIR)
  .filter(f => /^\d{14}_.+\.sql$/.test(f))
  .sort();

async function runSql(sql) {
  const res = await fetch(QUERY_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  return { ok: res.ok, status: res.status, body };
}

// "20260819000001_baseline_schema.sql" -> { version: '20260819000001', name: 'baseline_schema' }
function parseFileName(file) {
  const base = file.replace(/\.sql$/, '');
  const sep = base.indexOf('_');
  return {
    version: sep === -1 ? base : base.slice(0, sep),
    name: sep === -1 ? base : base.slice(sep + 1),
  };
}

async function main() {
  // 1) Connectivity / auth probe.
  const probe = await runSql('SELECT 1 AS ok');
  console.log(`[probe] Management API -> ${probe.status}`);
  if (!probe.ok) {
    console.error(
      '❌ Cannot reach Management API with this token. Response:',
      JSON.stringify(probe.body).slice(0, 400)
    );
    process.exit(1);
  }

  // 2) Read the versions already recorded on the server.
  const recorded = await runSql('SELECT version FROM supabase_migrations.schema_migrations');
  if (!recorded.ok) {
    console.error(
      '❌ Cannot read supabase_migrations.schema_migrations:',
      JSON.stringify(recorded.body).slice(0, 400)
    );
    process.exit(1);
  }
  const recordedVersions = new Set((recorded.body || []).map(r => String(r.version)));
  console.log(
    `[state] ${MIGRATION_FILES.length} local files, ${recordedVersions.size} versions recorded on server.`
  );

  // 3) Apply each unrecorded migration, one file at a time, then record it.
  let applied = 0;
  let failed = 0;
  let skipped = 0;
  for (const file of MIGRATION_FILES) {
    const { version, name } = parseFileName(file);
    if (recordedVersions.has(version)) {
      skipped += 1;
      console.log(`— ${file} (already recorded, skipped)`);
      continue;
    }

    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    process.stdout.write(`▶ ${file} ... `);
    const result = await runSql(sql);
    if (!result.ok) {
      failed += 1;
      const msg =
        typeof result.body === 'object'
          ? (result.body.message ?? result.body.error ?? JSON.stringify(result.body)).slice(0, 300)
          : String(result.body).slice(0, 300);
      console.log('FAIL');
      console.log(`    ${msg}`);
      continue;
    }

    // Record the version so future runs skip it (idempotency). If the
    // bookkeeping insert fails the migration still succeeded — warn only.
    const record = await runSql(
      `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${version}', '${name}') ON CONFLICT (version) DO NOTHING;`
    );
    if (!record.ok) {
      console.log(
        `OK (warning: could not record version ${version}: ${JSON.stringify(record.body).slice(0, 200)})`
      );
    } else {
      console.log('OK');
    }
    applied += 1;
  }

  // 4) Summary.
  console.log('\n===== Summary =====');
  console.log(
    `Migrations: ${applied} applied, ${failed} failed, ${skipped} skipped (already recorded).`
  );
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('❌ Unexpected error:', err?.message ?? err);
  process.exit(1);
});
