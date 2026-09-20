import fs from 'node:fs';

const token = fs.readFileSync(process.env.USERPROFILE + '/.supabase/access-token', 'utf8').trim();
const projectRef = 'zzthamxjxnxzzpswllid';
const COMPANY_ID = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';

async function query(sql) {
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
  const sales = await query(`
    SELECT issue_date, currency_code, payment_method, COUNT(*) as count,
           ROUND(SUM(total_amount)::numeric, 2) as sum_amount,
           ROUND(SUM(paid_amount)::numeric, 2) as sum_paid,
           ROUND(SUM(CASE WHEN currency_code = 'YER' THEN total_amount / 410 ELSE total_amount END)::numeric, 2) as sum_sar
    FROM public.invoices
    WHERE company_id = '${COMPANY_ID}' AND type = 'sale' AND deleted_at IS NULL
    GROUP BY issue_date, currency_code, payment_method
    ORDER BY issue_date ASC, currency_code;
  `);
  console.log('SALES BY DATE:');
  console.table(sales);

  const purchases = await query(`
    SELECT invoice_number, issue_date, type, currency_code, total_amount, paid_amount, payment_method, status
    FROM public.invoices
    WHERE company_id = '${COMPANY_ID}' AND type IN ('purchase', 'purchase_return') AND deleted_at IS NULL
    ORDER BY issue_date ASC;
  `);
  console.log('\nPURCHASES:');
  console.table(purchases);
}

main().catch(console.error);
