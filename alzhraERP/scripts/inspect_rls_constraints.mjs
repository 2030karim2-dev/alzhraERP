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
  console.log('--- RLS Policies on invoices ---');
  const polInvoices = await query(`
    SELECT polname, polcmd, polroles, polqual, polwithcheck
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    WHERE c.relname = 'invoices';
  `);
  console.log(JSON.stringify(polInvoices, null, 2));

  console.log('--- RLS Policies on invoice_items ---');
  const polItems = await query(`
    SELECT polname, polcmd, polroles, polqual, polwithcheck
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    WHERE c.relname = 'invoice_items';
  `);
  console.log(JSON.stringify(polItems, null, 2));

  console.log('--- Constraints on invoices ---');
  const conInvoices = await query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'public.invoices'::regclass;
  `);
  console.log(JSON.stringify(conInvoices, null, 2));

  console.log('--- Constraints on invoice_items ---');
  const conItems = await query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'public.invoice_items'::regclass;
  `);
  console.log(JSON.stringify(conItems, null, 2));
}

run().catch(console.error);
