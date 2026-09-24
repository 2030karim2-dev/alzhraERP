#!/usr/bin/env node
/**
 * Tenant-scoped transfer between two Supabase projects.
 *
 * Purpose
 * -------
 * Copy ONE tenant (company) out of the production project into another project
 * — a backup/test environment or a dedicated project. The source is only ever
 * read, so the running ERP is never interrupted.
 *
 * Exactness
 * ---------
 * Payloads never pass through `JSON.parse`/`JSON.stringify`. PostgreSQL returns
 * each table as JSON *text* (`json_agg(...)::text`) and that exact text is sent
 * back verbatim, because a JavaScript round-trip silently rewrites numeric
 * literals — `5000.0000` became `5000` and `2.00` became `2` on the first run of
 * this tool. The values were still numerically equal, but a backup must be
 * faithful. Row payloads are split into chunks by scanning the raw text for
 * top-level braces, so no parsing is needed even for large tables.
 *
 * What it moves
 * -------------
 *   - the `public.companies` row of the tenant
 *   - every `public.*` table carrying a `company_id` column, filtered to it
 *   - the tenant's `auth.users` + `auth.identities`, so user ids keep their
 *     original values and every `created_by` / `user_id` reference stays valid
 *
 * How the import works
 * --------------------
 * Rows are replayed with `jsonb_populate_recordset`, which requires the target
 * schema to match. The import runs with `session_replication_role = replica`,
 * so foreign-key checks and user triggers are skipped: this is a raw copy, not
 * a re-enactment. That is deliberate — otherwise `fn_auto_post_invoice_journal`
 * and the audit triggers would fire and fabricate accounting data.
 *
 * Usage
 * -----
 *   node scripts/tenant-transfer.mjs list
 *   node scripts/tenant-transfer.mjs export --company <uuid> --out <dir>
 *   node scripts/tenant-transfer.mjs import --dir <dir> --target-ref <ref> [--replace]
 *   node scripts/tenant-transfer.mjs verify --dir <dir> --target-ref <ref>
 *
 * Environment: SOURCE_PROJECT_REF / TARGET_PROJECT_REF, SOURCE_ACCESS_TOKEN /
 * TARGET_ACCESS_TOKEN (the latter falls back to ~/.supabase/access-token).
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

const SOURCE_REF = process.env.SOURCE_PROJECT_REF || 'zzthamxjxnxzzpswllid';
const DEFAULT_TARGET = process.env.TARGET_PROJECT_REF || 'orxlyiokccaodypindye';

/**
 * Each project is addressed with its own access token: a Personal Access Token
 * is scoped to the projects it can see, and using the source token against the
 * target fails with "Missing required permission(s): database_read".
 */
const SOURCE_TOKEN = (process.env.SOURCE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN ||
  readFileSync(join(process.env.USERPROFILE || '', '.supabase', 'access-token'), 'utf8')).trim();
const TARGET_TOKEN = (process.env.TARGET_ACCESS_TOKEN || SOURCE_TOKEN).trim();
const tokenForRef = (ref) => (ref === SOURCE_REF ? SOURCE_TOKEN : TARGET_TOKEN);

/** Platform telemetry tables — not worth moving into a tenant copy. */
const DEFAULT_SKIP = new Set(['csp_reports', 'api_rate_limits', 'ai_part_lookup_cache', 'part_catalog_cache']);

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) {
      out._.push(argv[i]);
      continue;
    }
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

async function sql(ref, query, { attempts = 5 } = {}) {
  const token = tokenForRef(ref);
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(280000),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text.slice(0, 300));
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  throw lastErr;
}

/** public tables carrying company_id. */
async function tenantTables(ref) {
  const rows = await sql(
    ref,
    `SELECT c.relname AS tbl
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r'
        AND EXISTS (SELECT 1 FROM pg_attribute a
                     WHERE a.attrelid=c.oid AND a.attname='company_id' AND NOT a.attisdropped)
      ORDER BY c.relname`
  );
  return rows.map((r) => r.tbl).filter((t) => !DEFAULT_SKIP.has(t));
}

/** Insertable (non-generated) columns, in ordinal order. */
async function insertableColumns(ref, schema, rel) {
  const rows = await sql(
    ref,
    `SELECT a.attname FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='${schema}' AND c.relname='${rel}'
        AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = ''
      ORDER BY a.attnum`
  );
  return rows.map((r) => r.attname);
}

/**
 * Splits a JSON array *text* into chunk texts by counting braces and honouring
 * string literals and escapes. Never parses numbers, so values keep their exact
 * literal form.
 */
function splitJsonArrayText(raw, maxChars = 400000) {
  if (raw.length <= maxChars) return [raw];
  const chunks = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}' || ch === ']') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        const piece = raw.slice(start, i + 1);
        if (chunks.length === 0) chunks.push(piece);
        else if (chunks[chunks.length - 1].length + piece.length + 1 > maxChars) chunks.push(piece);
        else chunks[chunks.length - 1] = `${chunks[chunks.length - 1].slice(0, -1)},${piece.slice(1)}`;
        start = -1;
      }
    }
  }
  return chunks;
}

const CMD = process.argv[2];
const a = args(process.argv.slice(3));

async function cmdList() {
  const companies = await sql(SOURCE_REF, 'SELECT id, name_ar FROM public.companies ORDER BY created_at');
  console.log('\ntenants in the source project:');
  for (const c of companies) console.log(`  ${c.id}  ${c.name_ar}`);
  const tables = await tenantTables(SOURCE_REF);
  console.log(`\n${tables.length} tenant-scoped public tables carry company_id.`);
}

async function cmdExport() {
  const company = a.company;
  const outDir = a.out || '.tenant-transfer';
  if (!company) throw new Error('--company <uuid> is required');
  mkdirSync(outDir, { recursive: true });

  const [comp] = await sql(
    SOURCE_REF,
    `SELECT COALESCE(json_agg(x),'[]'::json)::text AS j
       FROM (SELECT * FROM public.companies WHERE id='${company}') x`
  );
  const companiesRaw = comp.j;
  if (companiesRaw === '[]') throw new Error(`company ${company} not found in ${SOURCE_REF}`);

  const writeRaw = (name, text) => writeFileSync(join(outDir, `${name}.json.gz`), gzipSync(text, { level: 9 }));
  writeRaw('companies', companiesRaw);

  const manifest = { source: SOURCE_REF, company, tables: { companies: 1 }, exported_at: new Date().toISOString() };

  const users = await sql(SOURCE_REF, `SELECT user_id AS id FROM public.user_company_roles WHERE company_id = '${company}'`);
  const userIds = users.map((u) => u.id);
  if (userIds.length) {
    const list = userIds.map((id) => `'${id}'`).join(',');
    for (const [name, rel, col] of [['auth_users', 'users', 'id'], ['auth_identities', 'identities', 'user_id']]) {
      const [r] = await sql(
        SOURCE_REF,
        `SELECT COALESCE(json_agg(x),'[]'::json)::text AS j, count(*)::int AS n
           FROM (SELECT * FROM auth.${rel} WHERE ${col} IN (${list})) x`
      );
      writeRaw(name, r.j);
      manifest.tables[name] = r.n;
    }
  }

  let total = 0;
  for (const t of await tenantTables(SOURCE_REF)) {
    const [row] = await sql(
      SOURCE_REF,
      `SELECT COALESCE(json_agg(x),'[]'::json)::text AS j, count(*)::int AS n
         FROM (SELECT * FROM public.${t} WHERE company_id = '${company}') x`
    );
    writeRaw(t, row.j);
    manifest.tables[t] = row.n;
    total += row.n;
    if (row.n > 0) console.log(`  ${t.padEnd(34)} ${String(row.n).padStart(7)}`);
  }

  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nDONE: ${total} tenant rows + ${manifest.tables.auth_users ?? 0} auth users -> ${outDir}`);
}

async function cmdImport() {
  const dir = a.dir || '.tenant-transfer';
  const target = a['target-ref'] || DEFAULT_TARGET;
  const replace = a.replace === true || a.replace === 'true';
  if (target === SOURCE_REF) throw new Error('target must differ from the source project');

  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const rawOf = (name) => gunzipSync(readFileSync(join(dir, `${name}.json.gz`))).toString('utf8');

  console.log(`importing tenant ${manifest.company} into ${target}${replace ? '  (REPLACE: existing tenant rows are deleted first)' : ''}`);

  /**
   * Replays raw JSON text. `ON CONFLICT DO NOTHING` is omitted for public tables
   * in replace mode: it is unnecessary there and is rejected outright on tables
   * carrying a DEFERRABLE unique constraint ("ON CONFLICT does not support
   * deferrable unique constraints/exclusion constraints as arbiters"), which
   * `invoices` and others do. auth.* always keeps it, because those rows may
   * legitimately already exist in the target.
   */
  const replay = async (schema, rel, raw, { alwaysConflictSafe = false } = {}) => {
    const cols = await insertableColumns(target, schema, rel);
    const colList = cols.join(', ');
    const conflict = alwaysConflictSafe || !replace ? 'ON CONFLICT DO NOTHING' : '';
    for (const chunk of splitJsonArrayText(raw)) {
      await sql(
        target,
        `SET session_replication_role = replica;
         INSERT INTO ${schema}.${rel} (${colList})
         SELECT ${colList}
           FROM jsonb_populate_recordset(NULL::${schema}.${rel}, '${chunk.replace(/'/g, "''")}'::jsonb)
         ${conflict};
         SET session_replication_role = DEFAULT;`
      );
    }
  };

  // auth first: public rows reference auth.users(id). These are never
  // overwritten, so an existing working login in the target is preserved.
  for (const [name, rel] of [['auth_users', 'users'], ['auth_identities', 'identities']]) {
    if (!manifest.tables[name]) continue;
    const raw = rawOf(name);
    if (raw === '[]') continue;
    await replay('auth', rel, raw, { alwaysConflictSafe: true });
    console.log(`  auth.${rel.padEnd(22)} ${manifest.tables[name]} rows`);
  }

  if (replace) {
    const tables = Object.keys(manifest.tables).filter((t) => t !== 'auth_users' && t !== 'auth_identities');
    // `companies` is the tenant root: it carries `id`, not `company_id`.
    const deletions = tables
      .map((t) => (t === 'companies'
        ? `DELETE FROM public.companies WHERE id = '${manifest.company}';`
        : `DELETE FROM public.${t} WHERE company_id = '${manifest.company}';`))
      .join('\n');
    await sql(target, `SET session_replication_role = replica;\n${deletions}\nSET session_replication_role = DEFAULT;`);
    console.log(`  cleared existing tenant rows in ${tables.length} tables`);
  }

  for (const [t, n] of Object.entries(manifest.tables)) {
    if (t === 'auth_users' || t === 'auth_identities' || n === 0) continue;
    await replay('public', t, rawOf(t));
    console.log(`  public.${t.padEnd(28)} ${n} rows`);
  }
  console.log('\nDONE. Run `verify` to compare row counts against the source manifest.');
}

async function cmdVerify() {
  const dir = a.dir || '.tenant-transfer';
  const target = a['target-ref'] || DEFAULT_TARGET;
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));

  let bad = 0;
  for (const [t, expected] of Object.entries(manifest.tables)) {
    if (t === 'auth_users' || t === 'auth_identities') continue;
    const where = t === 'companies' ? `id = '${manifest.company}'` : `company_id = '${manifest.company}'`;
    const [{ n }] = await sql(target, `SELECT count(*)::int AS n FROM public.${t} WHERE ${where}`);
    if (n !== expected) {
      bad += 1;
      console.log(`  MISMATCH public.${t.padEnd(30)} source ${expected}  target ${n}`);
    }
  }
  console.log(bad === 0 ? '\nVERIFY: all table counts match the source.' : `\nVERIFY: ${bad} table(s) differ.`);
  process.exit(bad === 0 ? 0 : 1);
}

const commands = { list: cmdList, export: cmdExport, import: cmdImport, verify: cmdVerify };
const run = commands[CMD];
if (!run) {
  console.error('usage: tenant-transfer.mjs <list|export|import|verify> [options]');
  process.exit(2);
}
run().catch((e) => {
  console.error(`ERROR: ${e?.message ?? e}`);
  process.exit(1);
});
