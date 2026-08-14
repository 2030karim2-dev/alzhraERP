#!/usr/bin/env node
/**
 * Verify the two previously-failing queries now succeed:
 *  1. vin_analyses ordered by updated_at
 *  2. get_debt_today_tasks RPC
 *
 * Usage: SUPABASE_ACCESS_TOKEN=<pat> node scripts/verify-fixes.mjs
 */
const PROJECT_REF = 'zzthamxjxnxzzpswllid';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const COMPANY_ID = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c'; // from the reported console logs

async function run(query) {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
    return { ok: res.ok, status: res.status, body };
}

async function main() {
    // 1) The exact query shape the app fires for vin_analyses.
    const q1 = `
      SELECT id, updated_at IS NOT NULL AS has_updated_at
      FROM public.vin_analyses
      WHERE company_id = '${COMPANY_ID}'
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 5;`;
    const r1 = await run(q1);
    console.log(`[1] vin_analyses ordered by updated_at -> ${r1.status} ${r1.ok ? 'OK' : ''}`);
    if (!r1.ok) console.log('    ', JSON.stringify(r1.body).slice(0, 300));
    else console.log(`    rows returned: ${Array.isArray(r1.body) ? r1.body.length : 'n/a'}`);

    // 2) The RPC call the app makes for today's debt tasks.
    const q2 = `SELECT * FROM public.get_debt_today_tasks('${COMPANY_ID}');`;
    const r2 = await run(q2);
    console.log(`[2] get_debt_today_tasks RPC -> ${r2.status} ${r2.ok ? 'OK' : ''}`);
    if (!r2.ok) console.log('    ', JSON.stringify(r2.body).slice(0, 300));
    else console.log(`    rows returned: ${Array.isArray(r2.body) ? r2.body.length : 'n/a'}`);
}

main().catch((e) => { console.error('❌', e?.message ?? e); process.exit(1); });
