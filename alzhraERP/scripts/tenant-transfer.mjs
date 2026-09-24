#!/usr/bin/env node
/**
 * Tenant-scoped transfer between two Supabase projects.
 *
 * Purpose
 * -------
 * Copy ONE tenant (company) out of the production project into another project
 * — either a backup/test environment or a dedicated project. The source is only
 * ever read, so the running ERP is never interrupted.
 *
 * What it moves
 * -------------
 *   - the `public.companies` row of the tenant
 *   - every `public.*` table that carries a `company_id` column, filtered to
 *     that company
 *   - the tenant's `auth.users` + `auth.identities` rows, so migrated users keep
 *     their existing user ids (every `created_by` / `updated_by` / `user_id`
 *     reference stays valid) and can sign in with their current password
 *
 * How the import works
 * --------------------
 * Rows are replayed with `jsonb_populate_recordset`, which requires the target
 * schema to be identical (build it first with
 * `SUPABASE_PROJECT_REF=<target> node scripts/apply-migrations.mjs`).
 * The import transaction runs with `session_replication_role = replica`, so
 * foreign-key checks and user triggers are skipped: this is a raw copy, not a
 * re-enactment. That matters — otherwise `fn_auto_post_invoice_journal` and the
 * audit triggers would fire and fabricate accounting data in the new project.
 *
 * Usage
 * -----
 *   node scripts/tenant-transfer.mjs list
 *   node scripts/tenant-transfer.mjs export --company <uuid> --out .tenant-xfer
 *   node scripts/tenant-transfer.mjs import --dir .tenant-xfer --target-ref <ref>
 *   node scripts/tenant-transfer.mjs verify --company <uuid> --dir .tenant-xfer --target-ref <ref>
 *
 * The access token is read from $SUPABASE_ACCESS_TOKEN, falling back to
 * ~/.supabase/access-token.
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

const SOURCE_REF = process.env.SOURCE_PROJECT_REF || 'zzthamxjxnxzzpswllid';

/**
 * Each project is addressed with its own access token: a Personal Access Token
 * is scoped to the projects it can see, and using the source's token against the
 * target fails with "Missing required permission(s): database_read".
 */
const SOURCE_TOKEN = (process.env.SOURCE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN ||
  readFileSync(join(process.env.USERPROFILE || '', '.supabase', 'access-token'), 'utf8')).trim();
const TARGET_TOKEN = (process.env.TARGET_ACCESS_TOKEN || SOURCE_TOKEN).trim();
const tokenForRef = (ref) => (ref === SOURCE_REF ? SOURCE_TOKEN : TARGET_TOKEN);

/** Tables that are pure telemetry for the source platform; not worth moving. */
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
    // A bare flag (no value, or followed by another flag) is boolean true.
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

/** public tables carrying company_id, with their row count for a tenant. */
async function tenantTables(ref, company) {
  const rows = await sql(
    ref,
    `SELECT c.relname AS tbl
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND EXISTS (SELECT 1 FROM pg_attribute a
                     WHERE a.attrelid = c.oid AND a.attname = 'company_id' AND NOT a.attisdropped)
      ORDER BY c.relname`
  );
  return rows.map((r) => r.tbl).filter((t) => !DEFAULT_SKIP.has(t));
}

/** Insertable (non-generated) columns, in ordinal order. */
async function insertableColumns(ref, table) {
  const rows = await sql(
    ref,
    `SELECT a.attname
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = '${table}'
        AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = ''
      ORDER BY a.attnum`
  );
  return rows.map((r) => r.attname);
}

const CMD = process.argv[2];
const a = args(process.argv.slice(3));

async function cmdList() {
  const companies = await sql(SOURCE_REF, 'SELECT id, name_ar FROM public.companies ORDER BY created_at');
  console.log('\ntenants in the source project:');
  for (const c of companies) console.log(`  ${c.id}  ${c.name_ar}`);

  const tables = await tenantTables(SOURCE_REF, null);
  console.log(`\n${tables.length} tenant-scoped public tables will be copied (company_id filter).`);
}

async function cmdExport() {
  const company = a.company;
  const outDir = a.out || '.tenant-transfer';
  if (!company) throw new Error('--company <uuid> is required');
  mkdirSync(outDir, { recursive: true });

  const [comp] = await sql(SOURCE_REF, `SELECT * FROM public.companies WHERE id = '${company}'`);
  if (!comp) throw new Error(`company ${company} not found in ${SOURCE_REF}`);
  console.log(`exporting tenant: ${comp.name_ar} (${company})`);

  const manifest = { source: SOURCE_REF, company, company_name: comp.name_ar, exported_at: new Date().toISOString(), tables: {} };

  const write = (name, rows) => writeFileSync(join(outDir, `${name}.json.gz`), gzipSync(JSON.stringify(rows), { level: 9 }));

  write('companies', [comp]);
  manifest.tables.companies = 1;

  const users = await sql(
    SOURCE_REF,
    `SELECT DISTINCT user_id AS id FROM public.user_company_roles WHERE company_id = '${company}'
     UNION
     SELECT DISTINCT id FROM auth.users u
      WHERE EXISTS (SELECT 1 FROM public.user_company_roles r WHERE r.user_id = u.id AND r.company_id = '${company}')`
  );
  const userIds = users.map((u) => u.id);
  if (userIds.length) {
    const list = userIds.map((id) => `'${id}'`).join(',');
    const authUsers = await sql(SOURCE_REF, `SELECT * FROM auth.users WHERE id IN (${list})`);
    write('auth_users', authUsers);
    manifest.tables.auth_users = authUsers.length;
    try {
      const ids = await sql(SOURCE_REF, `SELECT * FROM auth.identities WHERE user_id IN (${list})`);
      write('auth_identities', ids);
      manifest.tables.auth_identities = ids.length;
    } catch (e) {
      console.log(`  (auth.identities skipped: ${String(e.message).slice(0, 80)})`);
    }
  }

  const tables = await tenantTables(SOURCE_REF, company);
  let total = 0;
  for (const t of tables) {
    const [row] = await sql(
      SOURCE_REF,
      `SELECT COALESCE(json_agg(x), '[]'::json) AS j, count(*)::int AS n
         FROM (SELECT * FROM public.${t} WHERE company_id = '${company}') x`
    );
    write(t, row.j);
    manifest.tables[t] = row.n;
    total += row.n;
    console.log(`  ${t.padEnd(34)} ${String(row.n).padStart(7)}`);
  }

  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nDONE: ${total} tenant rows + ${manifest.tables.auth_users ?? 0} auth users -> ${outDir}`);
}

async function cmdImport() {
  const dir = a.dir || '.tenant-transfer';
  const target = a['target-ref'] || process.env.TARGET_PROJECT_REF;
  const replace = a.replace === true || a.replace === 'true';
  if (!target) throw new Error('--target-ref <ref> is required');
  // Fail closed: replace mode deletes the tenant's rows in the target before
  // re-inserting them, so it must name that target on the command line. A
  // TARGET_PROJECT_REF inherited from an earlier session is not good enough.
  if (replace && !a['target-ref']) {
    throw new Error('--replace requires an explicit --target-ref flag (env var alone is not accepted)');
  }
  if (target === SOURCE_REF) throw new Error('target must differ from the source project');

  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const read = (name) => JSON.parse(gunzipSync(readFileSync(join(dir, `${name}.json.gz`))).toString('utf8'));

  console.log(`importing "${manifest.company_name}" into ${target}${replace ? '  (REPLACE: existing tenant rows are deleted first)' : ''}`);

  // auth users first: public rows reference auth.users(id).
  // They are inserted with ON CONFLICT DO NOTHING even in replace mode, so an
  // existing working login in the target is never overwritten.
  for (const name of ['auth_users', 'auth_identities']) {
    if (!manifest.tables[name]) continue;
    const rows = read(name);
    if (!rows.length) continue;
    const schema = name === 'auth_users' ? 'auth' : 'auth';
    const rel = name === 'auth_users' ? 'users' : 'identities';
    const cols = await sql(target, `SELECT a.attname FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='${schema}' AND c.relname='${rel}'
         AND a.attnum>0 AND NOT a.attisdropped AND a.attgenerated='' ORDER BY a.attnum`);
    const colNames = cols.map((c) => c.attname).filter((c) => c in rows[0]);
    const insertable = rows.map((r) => Object.fromEntries(colNames.map((c) => [c, r[c]])));
    await insertRows(target, `${schema}.${rel}`, colNames, insertable);
    console.log(`  ${(schema + '.' + rel).padEnd(24)} ${insertable.length} rows`);
  }

  if (replace) {
    // Delete this tenant's rows everywhere, with FK checks and triggers off, so
    // the target becomes an exact mirror of the source rather than a union of
    // the two. Everything deleted is re-inserted from the fresh export.
    const tables = Object.keys(manifest.tables).filter((t) => t !== 'auth_users' && t !== 'auth_identities');
    const deletions = tables
      // `companies` is the tenant root: it carries `id`, not `company_id`.
      .map((t) => (t === 'companies'
        ? `DELETE FROM public.companies WHERE id = '${manifest.company}';`
        : `DELETE FROM public.${t} WHERE company_id = '${manifest.company}';`))
      .join('\n');
    await sql(target, `SET session_replication_role = replica;\n${deletions}\nSET session_replication_role = DEFAULT;`);
    console.log(`  cleared existing tenant rows in ${tables.length} tables`);
  }

  for (const [t, expected] of Object.entries(manifest.tables)) {
    if (t === 'auth_users' || t === 'auth_identities') continue;
    const rows = read(t);
    if (!rows.length) {
      console.log(`  public.${t.padEnd(30)} 0 rows (skipped)`);
      continue;
    }
    const cols = await insertableColumns(target, t).then((cs) => cs.filter((c) => c in rows[0]));
    await insertRows(target, `public.${t}`, cols, rows, { replace });
    console.log(`  public.${t.padEnd(30)} ${rows.length} rows`);
  }
  console.log('\nDONE. Run `verify` to compare row counts against the source manifest.');
}

async function insertRows(ref, qualifiedTable, columns, rows, { replace = false } = {}) {
  // Chunked so a single request stays well inside the API limit.
  const CHUNK = 400;
  const colList = columns.join(', ');
  // In replace mode the tenant was cleared first, so a plain INSERT is correct —
  // and it is also required: `ON CONFLICT DO NOTHING` is rejected on tables that
  // carry a DEFERRABLE unique constraint ("ON CONFLICT does not support
  // deferrable unique constraints/exclusion constraints as arbiters"), which
  // `invoices` and others do.
  const conflict = replace ? '' : 'ON CONFLICT DO NOTHING';
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const payload = JSON.stringify(slice).replace(/'/g, "''");
    await sql(
      ref,
      `SET session_replication_role = replica;
       INSERT INTO ${qualifiedTable} (${colList})
       SELECT ${colList} FROM jsonb_populate_recordset(NULL::${qualifiedTable}, '${payload}'::jsonb)
       ${conflict};
       SET session_replication_role = DEFAULT;`
    );
  }
}

async function cmdVerify() {
  const dir = a.dir || '.tenant-transfer';
  const target = a['target-ref'] || process.env.TARGET_PROJECT_REF;
  if (!target) throw new Error('--target-ref <ref> is required');
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));

  let bad = 0;
  for (const [t, expected] of Object.entries(manifest.tables)) {
    if (t === 'auth_users' || t === 'auth_identities') continue;
    // `companies` is the tenant root and carries `id`, not `company_id`.
    const where = t === 'companies'
      ? `id = '${manifest.company}'`
      : `company_id = '${manifest.company}'`;
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
