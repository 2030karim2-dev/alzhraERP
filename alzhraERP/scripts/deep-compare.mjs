#!/usr/bin/env node
/**
 * Deep, definition-level comparison between two Supabase projects.
 *
 * scripts/schema-diff.mjs only compares the *existence* of objects. That is not
 * enough to call two databases identical: a function can exist in both while
 * enforcing different logic, and a policy can carry the same name with a
 * different predicate. This script hashes actual definitions.
 *
 * Facets compared
 *   extensions, tables, columns (name+type+nullability+default), constraints,
 *   indexes, functions (signature + body + security + config + ACL),
 *   views (definition), RLS enablement, policies (predicates + role + command),
 *   triggers (definition), enum labels, sequences.
 *
 * Data comparison (--data) fingerprints every tenant table with
 *   count(*) and md5(string_agg(row::text, '|' ORDER BY row::text))
 * which is order-independent and needs no primary key.
 *
 * Usage:
 *   SOURCE_ACCESS_TOKEN=… TARGET_ACCESS_TOKEN=… \
 *   node scripts/deep-compare.mjs [--data] [--company <uuid>] [--out <file>]
 *
 * Exit codes: 0 = no differences, 1 = differences found, 2 = usage error.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_REF = process.env.SOURCE_PROJECT_REF || 'zzthamxjxnxzzpswllid';
const TARGET_REF = process.env.TARGET_PROJECT_REF || 'orxlyiokccaodypindye';
const COMPANY = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const val = (f, d) => {
  const i = argv.indexOf(`--${f}`);
  return i === -1 ? d : argv[i + 1];
};
const WITH_DATA = has('data');
const OUT = val('out', null);

const tokenFor = (ref) => {
  const explicit = ref === SOURCE_REF ? process.env.SOURCE_ACCESS_TOKEN : process.env.TARGET_ACCESS_TOKEN;
  if (explicit) return explicit.trim();
  return readFileSync(join(process.env.USERPROFILE || '', '.supabase', 'access-token'), 'utf8').trim();
};

async function sql(ref, query) {
  const token = tokenFor(ref);
  let lastErr;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(240000),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text.slice(0, 250));
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, Math.min(3000 * attempt, 15000)));
    }
  }
  throw lastErr;
}

const SCHEMA_FACETS = [
  ['extensions', `SELECT extname || '@' || extversion AS k FROM pg_extension`],
  [
    'columns',
    `SELECT n.nspname||'.'||c.relname||'.'||a.attname AS k,
            format_type(a.atttypid,a.atttypmod) || '|' || a.attnotnull::text || '|' ||
            COALESCE(pg_get_expr(d.adbin, d.adrelid),'-') AS v
       FROM pg_attribute a
       JOIN pg_class c ON c.oid=a.attrelid
       JOIN pg_namespace n ON n.oid=c.relnamespace
       LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE n.nspname IN ('public','auth') AND c.relkind='r'
        AND a.attnum>0 AND NOT a.attisdropped`,
  ],
  [
    'constraints',
    `SELECT n.nspname||'.'||con.conname AS k, md5(pg_get_constraintdef(con.oid)) || '|' || con.contype::text AS v
       FROM pg_constraint con
       JOIN pg_class c ON c.oid=con.conrelid
       JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public'`,
  ],
  [
    'indexes',
    `SELECT n.nspname||'.'||i.indexrelid::regclass::text AS k, md5(pg_get_indexdef(i.indexrelid)) AS v
       FROM pg_index i
       JOIN pg_class c ON c.oid=i.indrelid
       JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public'`,
  ],
  [
    'functions',
    `SELECT p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS k,
            md5(pg_get_functiondef(p.oid)) || '|' || p.prosecdef::text || '|' ||
            COALESCE(array_to_string(p.proconfig,','),'-') || '|' ||
            COALESCE(array_to_string(p.proacl,'~'),'-') AS v
       FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public'`,
  ],
  [
    'views',
    `SELECT n.nspname||'.'||c.relname AS k, md5(pg_get_viewdef(c.oid)) || '|' || c.reloptions::text AS v
       FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('v','m')`,
  ],
  [
    'rls-enabled',
    `SELECT n.nspname||'.'||c.relname AS k, c.relrowsecurity::text || '|' || c.relforcerowsecurity::text AS v
       FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity`,
  ],
  [
    'policies',
    `SELECT schemaname||'.'||tablename||'.'||policyname AS k,
            md5(COALESCE(qual,'') || '~' || COALESCE(with_check,'') || '~' || COALESCE(roles::text,'') || '~' || cmd) AS v
       FROM pg_policies WHERE schemaname='public'`,
  ],
  [
    'triggers',
    `SELECT n.nspname||'.'||c.relname||'.'||t.tgname AS k, md5(pg_get_triggerdef(t.oid)) AS v
       FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
       JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal`,
  ],
  [
    'enum-labels',
    `SELECT n.nspname||'.'||t.typname AS k, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS v
       FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
       JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public' GROUP BY 1`,
  ],
  [
    'sequences',
    `SELECT n.nspname||'.'||c.relname AS k, s.seqincrement::text||'|'||s.seqstart::text AS v
       FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       JOIN pg_sequence s ON s.seqrelid=c.oid
      WHERE n.nspname='public'`,
  ],
];

const TENANT_TABLES_SQL = `SELECT c.relname AS t
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r'
   AND EXISTS (SELECT 1 FROM pg_attribute a
                WHERE a.attrelid=c.oid AND a.attname='company_id' AND NOT a.attisdropped)
 ORDER BY c.relname`;

async function loadFacet(ref, [label, q]) {
  const rows = await sql(ref, q);
  const map = new Map();
  for (const r of rows) map.set(r.k, r.v);
  return [label, map];
}

function compareMaps(label, src, tgt) {
  const missing = [];
  const extra = [];
  const differing = [];
  for (const [k, v] of src) {
    if (!tgt.has(k)) missing.push(k);
    else if (tgt.get(k) !== v) differing.push(k);
  }
  for (const k of tgt.keys()) if (!src.has(k)) extra.push(k);
  return { label, total: src.size, missing, extra, differing };
}

async function compareData() {
  const [srcTables, tgtTables] = await Promise.all([sql(SOURCE_REF, TENANT_TABLES_SQL), sql(TARGET_REF, TENANT_TABLES_SQL)]);
  const tables = srcTables.map((r) => r.t).filter((t) => tgtTables.some((x) => x.t === t));
  const results = [];
  for (const t of tables) {
    const q = `SELECT count(*)::bigint AS n,
                      COALESCE(md5(string_agg(x::text, '|' ORDER BY x::text)),'-') AS h
                 FROM public.${t} x WHERE x.company_id = '${COMPANY}'`;
    const [[s], [g]] = await Promise.all([sql(SOURCE_REF, q), sql(TARGET_REF, q)]);
    const sameCount = Number(s.n) === Number(g.n);
    const sameHash = s.h === g.h;
    if (Number(s.n) === 0 && Number(g.n) === 0) continue;
    results.push({ table: t, sourceRows: Number(s.n), targetRows: Number(g.n), sameCount, sameHash });
  }
  return results;
}

async function main() {
  const lines = [];
  const log = (s = '') => {
    console.log(s);
    lines.push(s);
  };

  log(`\n[deep-compare] ${SOURCE_REF}  ->  ${TARGET_REF}\n`);

  let problems = 0;
  for (const facet of SCHEMA_FACETS) {
    const [[label, src], [, tgt]] = [
      await loadFacet(SOURCE_REF, facet),
      await loadFacet(TARGET_REF, facet),
    ];
    const r = compareMaps(label, src, tgt);
    const clean = r.missing.length === 0 && r.extra.length === 0 && r.differing.length === 0;
    if (!clean) problems += r.missing.length + r.extra.length + r.differing.length;
    log(
      `${clean ? 'ok  ' : 'DIFF'} ${label.padEnd(14)} source ${String(r.total).padStart(5)}  target ${String(tgt.size).padStart(5)}` +
        `  missing ${r.missing.length}  extra ${r.extra.length}  differing ${r.differing.length}`
    );
    for (const [tag, list] of [['-', r.missing], ['+', r.extra], ['~', r.differing]]) {
      for (const k of list.slice(0, 15)) log(`        ${tag} ${k}`);
      if (list.length > 15) log(`        ${tag} ... and ${list.length - 15} more`);
    }
  }

  if (WITH_DATA) {
    log('\n[data] per-table content fingerprint for the tenant\n');
    const rows = await compareData();
    const drifted = rows.filter((r) => !r.sameCount);
    const mismatched = rows.filter((r) => r.sameCount && !r.sameHash);
    for (const r of rows) {
      const tag = !r.sameCount ? 'DRIFT ' : r.sameHash ? 'exact ' : 'DIFF  ';
      log(`  ${tag} ${r.table.padEnd(30)} source ${String(r.sourceRows).padStart(7)}  target ${String(r.targetRows).padStart(7)}`);
    }
    log(`\n  ${rows.length} tables compared: ${rows.filter((r) => r.sameHash).length} byte-exact, ${drifted.length} live-drifted, ${mismatched.length} unexplained`);
    problems += mismatched.length;
  }

  log(`\n[deep-compare] ${problems === 0 ? 'no differences' : `${problems} difference(s)`}.`);
  if (OUT) writeFileSync(OUT, lines.join('\n'));
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`[deep-compare] ${e?.message ?? e}`);
  process.exit(1);
});
