#!/usr/bin/env node
/**
 * Compares the public schema of two Supabase projects and reports what exists
 * in the source but is missing (or different) in the target.
 *
 * Built for completing a partially-restored project: the target may have been
 * created from a dump rather than from this repository's migration history, so
 * we cannot assume it is complete just because it "looks" populated.
 *
 * Usage:
 *   SOURCE_ACCESS_TOKEN=... TARGET_ACCESS_TOKEN=... \
 *   node scripts/schema-diff.mjs [--source <ref>] [--target <ref>]
 *
 * Exit codes: 0 = identical, 1 = differences found.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_REF = process.env.SOURCE_PROJECT_REF || 'zzthamxjxnxzzpswllid';
const TARGET_REF = process.env.TARGET_PROJECT_REF || 'orxlyiokccaodypindye';

function tokenFor(which) {
  const explicit = process.env[which === 'source' ? 'SOURCE_ACCESS_TOKEN' : 'TARGET_ACCESS_TOKEN'];
  if (explicit) return explicit.trim();
  return readFileSync(join(process.env.USERPROFILE || '', '.supabase', 'access-token'), 'utf8').trim();
}

async function sql(ref, token, query) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(280000),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text.slice(0, 250));
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  throw lastErr;
}

/** All catalogue facets we compare, as { label, sql } pairs. */
const FACETS = [
  {
    label: 'tables',
    sql: `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r' ORDER BY 1`,
  },
  {
    label: 'columns',
    sql: `SELECT c.relname || '.' || a.attname || ':' || format_type(a.atttypid,a.atttypmod) AS name
            FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped
           ORDER BY 1`,
  },
  {
    label: 'functions',
    sql: `SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS name
            FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' ORDER BY 1`,
  },
  {
    label: 'policies',
    sql: `SELECT schemaname || '.' || tablename || '.' || policyname AS name FROM pg_policies
           WHERE schemaname='public' ORDER BY 1`,
  },
  {
    label: 'triggers',
    sql: `SELECT c.relname || '.' || t.tgname AS name
            FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY 1`,
  },
  {
    label: 'indexes',
    sql: `SELECT i.indexrelid::regclass::text AS name
            FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' ORDER BY 1`,
  },
  {
    label: 'constraints',
    sql: `SELECT con.conrelid::regclass::text || '.' || con.conname AS name
            FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
            JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' ORDER BY 1`,
  },
  {
    label: 'enum types',
    sql: `SELECT t.typname AS name FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
           WHERE n.nspname='public' AND t.typtype='e' ORDER BY 1`,
  },
  {
    label: 'views',
    sql: `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind IN ('v','m') ORDER BY 1`,
  },
  {
    label: 'RLS-enabled tables',
    sql: `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity ORDER BY 1`,
  },
];

async function main() {
  const srcToken = tokenFor('source');
  const tgtToken = tokenFor('target');
  console.log(`\n[schema-diff] ${SOURCE_REF}  ->  ${TARGET_REF}\n`);

  let totalMissing = 0;
  for (const facet of FACETS) {
    const [src, tgt] = await Promise.all([sql(SOURCE_REF, srcToken, facet.sql), sql(TARGET_REF, tgtToken, facet.sql)]);
    const srcSet = new Set(src.map((r) => r.name));
    const tgtSet = new Set(tgt.map((r) => r.name));
    const missing = [...srcSet].filter((n) => !tgtSet.has(n));
    const extra = [...tgtSet].filter((n) => !srcSet.has(n));
    totalMissing += missing.length;

    const tag = missing.length === 0 ? 'ok  ' : 'DIFF';
    console.log(`${tag} ${facet.label.padEnd(20)} source ${String(srcSet.size).padStart(5)}  target ${String(tgtSet.size).padStart(5)}  missing ${missing.length}${extra.length ? `  extra ${extra.length}` : ''}`);
    const show = (list, label, limit) => {
      for (const n of list.slice(0, limit)) console.log(`        ${label} ${n}`);
      if (list.length > limit) console.log(`        ${label} ... and ${list.length - limit} more`);
    };
    show(missing, '-', 25);
    if (extra.length) show(extra, '+', 10);
  }

  console.log(totalMissing === 0 ? '\n[schema-diff] schemas match.' : `\n[schema-diff] ${totalMissing} object(s) missing in the target.`);
  process.exit(totalMissing === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`[schema-diff] ${e?.message ?? e}`);
  process.exit(1);
});
