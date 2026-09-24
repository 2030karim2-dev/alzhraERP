#!/usr/bin/env node
/**
 * Applies an explicit range of this repository's migrations to a TARGET project.
 *
 * Why not scripts/apply-migrations.mjs?
 *   That script relies on `supabase_migrations.schema_migrations` to decide what
 *   to run, which assumes the target was built by the same runner. A project
 *   restored from a dump has no ledger at all, and two files here share the same
 *   version prefix (`20260924000001_debt_channel_key_privacy` and
 *   `20260924000001_harden_statements_and_detailed_party_ledger`), so a
 *   version-keyed ledger can only ever record one of them.
 *
 * This script therefore applies an explicit, ordered file list, reports every
 * failure individually (each file runs in its own transaction, so one failure
 * never affects another), and only at the end seeds the ledger so the target is
 * consistent for future runs.
 *
 * Usage:
 *   TARGET_PROJECT_REF=<ref> TARGET_ACCESS_TOKEN=<pat> \
 *   node scripts/apply-migration-range.mjs --from 20260923000001 [--to 20260924000010] [--apply]
 *
 * Without --apply it is a dry run that only lists what would be executed.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'supabase', 'migrations');
const TARGET_REF = process.env.TARGET_PROJECT_REF;
const token = process.env.TARGET_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
if (!TARGET_REF || !token) {
  console.error('TARGET_PROJECT_REF and TARGET_ACCESS_TOKEN are required.');
  process.exit(2);
}

const argv = process.argv.slice(2);
const val = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? dflt : argv[i + 1];
};
const FROM = val('from', '00000000000000');
const TO = val('to', '99999999999999');
const APPLY = argv.includes('--apply');

async function sql(query, { attempts = 4 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${TARGET_REF}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(280000),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text.slice(0, 400));
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  throw lastErr;
}

const parse = (file) => {
  const base = file.replace(/\.sql$/, '');
  const sep = base.indexOf('_');
  return { version: base.slice(0, sep), name: base.slice(sep + 1) };
};

const ALL = readdirSync(MIGRATIONS_DIR)
  .filter((f) => /^\d{14}_.+\.sql$/.test(f))
  .sort();

const SELECTED = ALL.filter((f) => parse(f).version >= FROM && parse(f).version <= TO);

console.log(`\n[apply-range] target ${TARGET_REF}`);
console.log(`[apply-range] ${SELECTED.length} file(s) in range ${FROM}..${TO}${APPLY ? '' : '  (DRY RUN)'}\n`);

let ok = 0;
let failed = 0;
for (const file of SELECTED) {
  if (!APPLY) {
    console.log(`  would apply ${file}`);
    continue;
  }
  const body = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
  try {
    await sql(body);
    ok += 1;
    console.log(`  ok   ${file}`);
  } catch (e) {
    failed += 1;
    console.log(`  FAIL ${file}`);
    console.log(`       ${String(e.message).replace(/\s+/g, ' ').slice(0, 240)}`);
  }
}

if (APPLY) {
  // Seed the ledger so future runs of apply-migrations.mjs treat the whole
  // repository history as applied for this project.
  const values = ALL.map((f) => {
    const { version, name } = parse(f);
    return `('${version}','${name.replace(/'/g, "''")}')`;
  }).join(',');
  await sql(
    `CREATE SCHEMA IF NOT EXISTS supabase_migrations;
     CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
       version text PRIMARY KEY, name text, statements text[], created_at timestamptz DEFAULT now());
     INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ${values}
     ON CONFLICT (version) DO NOTHING;`
  );
  console.log(`\n[apply-range] applied ${ok}, failed ${failed}; ledger seeded with ${ALL.length} versions.`);
}

process.exit(failed > 0 ? 1 : 0);
