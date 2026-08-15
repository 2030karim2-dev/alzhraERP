#!/usr/bin/env node
/**
 * Apply pending Supabase migrations via the Management API.
 *
 * The Personal Access Token (PAT) is read from process.env.SUPABASE_ACCESS_TOKEN
 * only (never stored on disk).
 *
 * Usage: SUPABASE_ACCESS_TOKEN=<pat> node scripts/apply-migrations.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_REF = 'zzthamxjxnxzzpswllid';
const QUERY_ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
    console.error('❌ SUPABASE_ACCESS_TOKEN env var is required.');
    process.exit(1);
}

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

// The 2026-08-14 migrations are the ones missing on the server.
const FILES = [
    '20260814000001_create_ai_request_log.sql',
    '20260814000001_fix_vin_rpc_security.sql',
    '20260814000002_create_vehicles_catalog.sql',
    '20260814000003_harden_vehicle_products_policy.sql',
    '20260814000004_add_vin_parts_rpc.sql',
    '20260814000005_vin_analyses_updated_at.sql',
    '20260814000006_create_debt_module.sql',
    '20260815000001_add_commission_permissions.sql',
];

async function runSql(sql) {
    const res = await fetch(QUERY_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
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

async function main() {
    // 1) Connectivity / auth probe.
    const probe = await runSql('SELECT 1 AS ok');
    console.log(`[probe] Management API -> ${probe.status}`);
    if (!probe.ok) {
        console.error('❌ Cannot reach Management API with this token. Response:', JSON.stringify(probe.body).slice(0, 400));
        process.exit(1);
    }

    // 2) Check whether the debt RPC already exists (idempotency helper).
    const exists = await runSql(
        `SELECT count(*)::int AS c FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
         WHERE n.nspname = 'public' AND p.proname = 'get_debt_today_tasks';`
    );
    const alreadyApplied = Array.isArray(exists.body) && exists.body[0]?.c > 0;
    if (alreadyApplied) {
        console.log('ℹ️  get_debt_today_tasks already exists — migrations look applied already.');
    }

    // 3) Apply each missing migration, one file at a time.
    let applied = 0;
    let failed = 0;
    for (const file of FILES) {
        const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
        process.stdout.write(`▶ ${file} ... `);
        const result = await runSql(sql);
        if (result.ok) {
            applied += 1;
            console.log('OK');
        } else {
            failed += 1;
            const msg = typeof result.body === 'object'
                ? (result.body.message ?? result.body.error ?? JSON.stringify(result.body)).slice(0, 300)
                : String(result.body).slice(0, 300);
            console.log('FAIL');
            console.log(`    ${msg}`);
        }
    }

    // 4) Final verification.
    const verify = await runSql(
        `SELECT
           (SELECT count(*)::int FROM information_schema.columns WHERE table_name='vin_analyses' AND column_name='updated_at') AS has_updated_at,
           (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
              WHERE n.nspname='public' AND p.proname='get_debt_today_tasks') AS has_rpc;`
    );
    console.log('\n===== Summary =====');
    console.log(`Migrations: ${applied} applied, ${failed} failed`);
    if (Array.isArray(verify.body)) {
        console.log('vin_analyses.updated_at present:', verify.body[0]?.has_updated_at === 1);
        console.log('get_debt_today_tasks present:', verify.body[0]?.has_rpc === 1);
    }
}

main().catch((err) => {
    console.error('❌ Unexpected error:', err?.message ?? err);
    process.exit(1);
});

