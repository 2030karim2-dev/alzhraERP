import fs from 'node:fs';

const token = fs.readFileSync(process.env.USERPROFILE + '/.supabase/access-token', 'utf8').trim();
const projectRef = 'zzthamxjxnxzzpswllid';
const COMPANY_ID = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';

export async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  const proc = await query(`SELECT prosrc FROM pg_proc WHERE proname = 'report_account_balances';`);
  console.log('=== DEFINITION OF report_account_balances ===');
  console.log(proc[0]?.prosrc);

  const res = await query(`
    SELECT a.code, a.name_ar, a.currency_code, r.*
    FROM report_account_balances('${COMPANY_ID}', '2026-09-20') r
    JOIN public.accounts a ON a.id = r.account_id
    ORDER BY a.code;
  `);
  console.log('\n=== RESULT OF report_account_balances ===');
  console.table(res);
}

main().catch(console.error);
