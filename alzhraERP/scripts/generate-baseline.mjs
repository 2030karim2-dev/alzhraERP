// scripts/generate-baseline.mjs
// ============================================================================
// Baseline Migration Generator — captures the CURRENT live database schema so
// version control can reproduce the production state.
//
// Usage:
//   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   (or set in shell)
//   $env:SUPABASE_REF = "zzthamxjxnxzzpswllid"
//   node scripts/generate-baseline.mjs
//
// Output (written under supabase/migrations/):
//   20260818000002_baseline_schema.sql            — extensions, enums, sequences,
//                                                   tables, constraints, indexes
//   20260818000003_baseline_functions.sql         — all public functions
//   20260818000004_baseline_triggers_policies.sql — triggers, RLS policies, views
//
// NOTE: best-effort schema-only baseline. Does NOT copy data, ownership grants,
// or objects owned by Supabase-managed schemas (auth/storage/vault…).
// ============================================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_REF || 'zzthamxjxnxzzpswllid';
if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN env var is required');
  process.exit(1);
}

const OUT_DIR = path.resolve('supabase/migrations');
mkdirSync(OUT_DIR, { recursive: true });

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return res.json();
}

const q = (s) => s.replace(/\s+/g, ' ').trim();

// ── 1. Extensions ────────────────────────────────────────────────────────────
async function genExtensions() {
  const r = await runQuery(q(`
    SELECT e.extname, n.nspname AS schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname <> 'plpgsql'
    ORDER BY e.extname;
  `));
  const lines = r.map((x) =>
    `CREATE EXTENSION IF NOT EXISTS "${x.extname}" WITH SCHEMA "${x.schema === 'public' ? 'public' : 'extensions'}";`);
  return ['-- Extensions', ...lines, ''].join('\n');
}

// ── 2. Enum types ────────────────────────────────────────────────────────────
async function genEnums() {
  const r = await runQuery(q(`
    SELECT t.typname,
           (SELECT string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder)
            FROM pg_enum e WHERE e.enumtypid = t.oid) AS labels,
           n.nspname AS schema
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e'
      AND n.nspname NOT IN ('pg_catalog','information_schema')
    ORDER BY n.nspname, t.typname;
  `));
  const lines = r.map((x) => `CREATE TYPE ${x.schema}.${x.typname} AS ENUM (${x.labels});`);
  return ['-- Enum types', ...lines, ''].join('\n');
}

// ── 3. Sequences ─────────────────────────────────────────────────────────────
async function genSequences() {
  const r = await runQuery(q(`
    SELECT s.schemaname, s.sequencename, s.data_type,
           s.start_value, s.min_value, s.max_value, s.increment_by, s.cycle
    FROM pg_sequences s
    WHERE s.schemaname NOT IN ('pg_catalog','information_schema')
    ORDER BY s.schemaname, s.sequencename;
  `));
  const lines = r.map((x) => [
    `CREATE SEQUENCE ${x.schemaname}.${x.sequencename}`,
    `    AS ${x.data_type}`,
    `    START WITH ${x.start_value}`,
    `    INCREMENT BY ${x.increment_by}`,
    `    MINVALUE ${x.min_value}`,
    `    MAXVALUE ${x.max_value}`,
    x.cycle ? '    CYCLE' : '    NO CYCLE',
    ';',
  ].join('\n'));
  return ['-- Sequences', ...lines, ''].join('\n');
}

export { runQuery, q, REF, OUT_DIR };

// ── 4. Tables (columns + primary keys) ───────────────────────────────────────
async function genTables() {
  const tables = await runQuery(q(`
    SELECT schemaname, tablename FROM pg_tables
    WHERE schemaname = 'public' ORDER BY tablename;
  `));
  const cols = await runQuery(q(`
    SELECT c.relname AS table_name,
           a.attname AS column_name,
           format_type(a.atttypid, a.atttypmod) AS data_type,
           a.attnotnull AS not_null,
           pg_get_expr(ad.adbin, ad.adrelid) AS default_expr
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
    WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY c.relname, a.attnum;
  `));
  const pks = await runQuery(q(`
    SELECT c.relname AS table_name, con.conname,
           (SELECT string_agg(a.attname, ', ' ORDER BY k.ordinality)
            FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ordinality)
            JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum) AS cols
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.contype = 'p' AND n.nspname = 'public'
    ORDER BY c.relname;
  `));

  const colByTable = new Map();
  for (const c of cols) {
    if (!colByTable.has(c.table_name)) colByTable.set(c.table_name, []);
    const parts = [`    ${c.column_name} ${c.data_type}`];
    if (c.not_null) parts.push('NOT NULL');
    if (c.default_expr) parts.push(`DEFAULT ${c.default_expr}`);
    colByTable.get(c.table_name).push(parts.join(' '));
  }
  const pkByTable = new Map(pks.map((p) => [p.table_name, p]));

  const out = ['-- Tables'];
  for (const t of tables) {
    const body = [...(colByTable.get(t.tablename) || [])];
    const pk = pkByTable.get(t.tablename);
    if (pk) body.push(`CONSTRAINT ${pk.conname} PRIMARY KEY (${pk.cols})`);
    out.push(`CREATE TABLE public.${t.tablename} (\n${body.join(',\n')}\n);`);
  }
  return out.join('\n\n') + '\n';
}

// ── 5. Non-PK constraints (FK / unique / check) ──────────────────────────────
async function genConstraints() {
  const r = await runQuery(q(`
    SELECT c.relname AS table_name, con.conname, con.contype, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.contype IN ('f','u','c') AND n.nspname = 'public'
    ORDER BY con.contype, c.relname, con.conname;
  `));
  const out = ['-- Constraints (FK / unique / check)'];
  for (const x of r) out.push(`ALTER TABLE public.${x.table_name} ADD CONSTRAINT ${x.conname} ${x.def};`);
  return out.join('\n') + '\n';
}

// ── 6. Indexes ───────────────────────────────────────────────────────────────
async function genIndexes() {
  const r = await runQuery(q(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' ORDER BY indexname;
  `));
  const out = ['-- Indexes'];
  for (const x of r) out.push(`${x.indexdef};`);
  return out.join('\n') + '\n';
}

// ── 7. Functions (exact definitions) ─────────────────────────────────────────
async function genFunctions() {
  const r = await runQuery(q(`
    SELECT p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `));
  const out = ['-- Functions'];
  for (const x of r) {
    out.push(`-- ===== ${x.proname} =====`);
    out.push(x.def.trim());
  }
  return out.join('\n\n') + '\n';
}


// ── 8. Views ─────────────────────────────────────────────────────────────────
async function genViews() {
  const r = await runQuery(q(`
    SELECT schemaname, viewname, pg_get_viewdef(('"' || schemaname || '".' || quote_ident(viewname))::regclass, true) AS def
    FROM pg_views
    WHERE schemaname = 'public'
    ORDER BY viewname;
  `));
  const out = ['-- Views'];
  for (const x of r) {
    out.push(`CREATE OR REPLACE VIEW public.${x.viewname} AS\n${x.def.trim()};`);
  }
  return out.join('\n\n') + '\n';
}

// ── 9. Triggers (exact definitions) ──────────────────────────────────────────
async function genTriggers() {
  const r = await runQuery(q(`
    SELECT t.tgname, pg_get_triggerdef(t.oid) AS def
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname = 'public'
    ORDER BY t.tgname;
  `));
  const out = ['-- Triggers'];
  for (const x of r) {
    out.push(`${x.def.trim()};`);
  }
  return out.join('\n\n') + '\n';
}

// ── 10. RLS policies ─────────────────────────────────────────────────────────
async function genPolicies() {
  const r = await runQuery(q(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd,
           qual AS using_expr,
           with_check AS check_expr
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `));
  const out = ['-- RLS policies'];
  const enabledTables = new Set();
  for (const x of r) {
    if (!enabledTables.has(x.tablename)) {
      out.push(`ALTER TABLE public.${x.tablename} ENABLE ROW LEVEL SECURITY;`);
      enabledTables.add(x.tablename);
    }
    const cmd = x.cmd.toUpperCase();
    // roles is a name[]: normalize "{a,b}" / ["a","b"] / "public" -> "a, b"
    let roles = Array.isArray(x.roles) ? x.roles.join(', ') : String(x.roles || 'public');
    roles = roles.replace(/^\{|\}$/g, '');
    const using = x.using_expr ? ` USING (${x.using_expr})` : '';
    const check = x.check_expr ? ` WITH CHECK (${x.check_expr})` : '';
    out.push(`CREATE POLICY "${x.policyname}" ON public.${x.tablename} FOR ${cmd} TO ${roles}${using}${check};`);
  }
  return out.join('\n') + '\n';
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('Baseline generator started…');
const [ext, enums, seqs, tables, constraints, indexes] = await Promise.all([
  genExtensions(), genEnums(), genSequences(), genTables(), genConstraints(), genIndexes(),
]);
writeFileSync(path.join(OUT_DIR, '20260818000002_baseline_schema.sql'),
  `-- ============================================================\n` +
  `-- BASELINE: current live schema (extensions/enums/sequences/tables/constraints/indexes)\n` +
  `-- Generated 2026-08-18 from project ${REF} (schema-only).\n` +
  `-- ============================================================\n\n` +
  `${ext}\n${enums}\n${seqs}\n${tables}\n${constraints}\n${indexes}\n`, 'utf8');
console.log('✓ 20260818000002_baseline_schema.sql');

const fn = await genFunctions();
writeFileSync(path.join(OUT_DIR, '20260818000003_baseline_functions.sql'),
  `-- ============================================================\n` +
  `-- BASELINE: all public functions (exact definitions)\n` +
  `-- Generated 2026-08-18 from project ${REF} (schema-only).\n` +
  `-- ============================================================\n\n` +
  `${fn}\n`, 'utf8');
console.log('✓ 20260818000003_baseline_functions.sql');

const [views, triggers, policies] = await Promise.all([genViews(), genTriggers(), genPolicies()]);
writeFileSync(path.join(OUT_DIR, '20260818000004_baseline_triggers_policies.sql'),
  `-- ============================================================\n` +
  `-- BASELINE: views + triggers + RLS policies\n` +
  `-- Generated 2026-08-18 from project ${REF} (schema-only).\n` +
  `-- ============================================================\n\n` +
  `${views}\n${triggers}\n${policies}\n`, 'utf8');
console.log('✓ 20260818000004_baseline_triggers_policies.sql');
console.log('Baseline generation complete.');

