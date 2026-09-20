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
  console.log('--- 3 Math Mismatched Invoices ---');
  const math3 = await query(`
    SELECT id, invoice_number, type, status, total_amount, subtotal, tax_amount, discount_amount,
           (coalesce(subtotal, 0) + coalesce(tax_amount, 0) - coalesce(discount_amount, 0)) as calculated_total,
           currency_code, created_at
    FROM public.invoices
    WHERE deleted_at IS NULL
      AND abs(total_amount - (coalesce(subtotal, 0) + coalesce(tax_amount, 0) - coalesce(discount_amount, 0))) > 0.01;
  `);
  console.log(JSON.stringify(math3, null, 2));

  console.log('--- 16 Invoices Missing Journal Entries ---');
  const missingJe = await query(`
    SELECT inv.id, inv.invoice_number, inv.type, inv.status, inv.total_amount, inv.created_at, inv.notes
    FROM public.invoices inv
    WHERE inv.type = 'sale'
      AND inv.status IN ('posted', 'paid', 'partially_paid')
      AND inv.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.reference_id = inv.id AND je.deleted_at IS NULL
      )
    LIMIT 25;
  `);
  console.log(JSON.stringify(missingJe, null, 2));

  console.log('--- Sample of 1,710 Fully Paid but Status Posted Invoices ---');
  const samplePostedPaid = await query(`
    SELECT id, invoice_number, payment_method, total_amount, paid_amount, advance_payment, status, created_at
    FROM public.invoices
    WHERE deleted_at IS NULL AND type = 'sale' AND status = 'posted' AND paid_amount >= total_amount
    LIMIT 10;
  `);
  console.log(JSON.stringify(samplePostedPaid, null, 2));

  console.log('--- Total Count and Distribution of Payments & Allocations ---');
  const paymentStats = await query(`
    SELECT 
      (SELECT count(*) FROM public.payments WHERE deleted_at IS NULL) as total_payments,
      (SELECT count(*) FROM public.payment_allocations WHERE deleted_at IS NULL) as total_allocations,
      (SELECT count(*) FROM public.payment_allocations pa 
       JOIN public.invoices inv ON pa.invoice_id = inv.id 
       WHERE inv.status = 'posted' AND inv.paid_amount >= inv.total_amount) as allocations_on_posted_invoices;
  `);
  console.log(JSON.stringify(paymentStats, null, 2));
}

run().catch(console.error);
