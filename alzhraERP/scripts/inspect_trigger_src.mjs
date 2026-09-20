import { readFileSync } from 'node:fs';

const token = readFileSync(process.env.USERPROFILE + '/.supabase/access-token', 'utf8').trim();
const projectRef = 'zzthamxjxnxzzpswllid';

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });
  return res.json();
}

async function run() {
  const procs = await query(`
    SELECT proname, prosrc 
    FROM pg_proc 
    WHERE proname IN (
      'check_invoice_paid_status',
      'update_invoice_totals_from_items',
      'verify_invoice_item_total',
      'fn_guard_posted_invoice_immutability',
      'fn_guard_posted_invoice_items_immutability',
      'fn_validate_invoice_business_rules'
    );
  `);
  for (const p of procs) {
    console.log('=== FUNCTION: ' + p.proname + ' ===');
    console.log(p.prosrc);
  }
}

run().catch(console.error);
