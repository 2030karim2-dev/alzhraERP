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
  console.log('--- Sample 5 Sales Returns ---');
  const returnsSample = await query(`
    SELECT r.id, r.invoice_number, r.issue_date, r.total_amount, r.paid_amount, r.status,
           r.payment_method, r.currency_code, r.exchange_rate, r.party_id, r.reference_invoice_id,
           p.name as party_name
    FROM public.invoices r
    LEFT JOIN public.parties p ON r.party_id = p.id
    WHERE r.type = 'sale_return' AND r.deleted_at IS NULL
    LIMIT 5;
  `);
  console.log(JSON.stringify(returnsSample, null, 2));

  console.log('--- Sample 5 Items of Sales Returns ---');
  const returnItems = await query(`
    SELECT ii.id, ii.invoice_id, ii.product_id, ii.quantity, ii.unit_price, ii.total, ii.cost_price,
           pr.name_ar, pr.sku
    FROM public.invoice_items ii
    JOIN public.invoices r ON ii.invoice_id = r.id
    LEFT JOIN public.products pr ON ii.product_id = pr.id
    WHERE r.type = 'sale_return' AND r.deleted_at IS NULL
    LIMIT 5;
  `);
  console.log(JSON.stringify(returnItems, null, 2));

  console.log('--- Sample 5 Payments ---');
  const paymentsSample = await query(`
    SELECT id, payment_number, amount, payment_type, payment_method, party_id, reference_id, reference_type, status, created_at
    FROM public.payments
    WHERE deleted_at IS NULL
    LIMIT 5;
  `);
  console.log(JSON.stringify(paymentsSample, null, 2));

  console.log('--- Stock check: Are there any negative quantities in product_stock? ---');
  const negStock = await query(`
    SELECT count(*) as neg_stock_count, min(quantity) as min_qty
    FROM public.product_stock
    WHERE quantity < 0;
  `);
  console.log(JSON.stringify(negStock, null, 2));

  console.log('--- Stock check: Are there products with multiple stock rows in the same warehouse? ---');
  const dupStock = await query(`
    SELECT company_id, product_id, warehouse_id, count(*)
    FROM public.product_stock
    GROUP BY company_id, product_id, warehouse_id
    HAVING count(*) > 1;
  `);
  console.log(JSON.stringify(dupStock, null, 2));
}

run().catch(console.error);
