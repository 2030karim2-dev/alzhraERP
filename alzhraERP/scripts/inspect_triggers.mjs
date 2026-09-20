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
  console.log('--- Triggers on invoices ---');
  const trgInvoices = await query(`
    SELECT trg.tgname, p.proname,
           CASE trg.tgtype::integer & 66
             WHEN 2 THEN 'BEFORE'
             WHEN 64 THEN 'INSTEAD OF'
             ELSE 'AFTER'
           END as timing,
           CASE trg.tgtype::integer & 28
             WHEN 4 THEN 'INSERT'
             WHEN 8 THEN 'DELETE'
             WHEN 16 THEN 'UPDATE'
             WHEN 20 THEN 'INSERT OR UPDATE'
             WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
             ELSE 'OTHER'
           END as events
    FROM pg_trigger trg
    JOIN pg_class c ON trg.tgrelid = c.oid
    JOIN pg_proc p ON trg.tgfoid = p.oid
    WHERE c.relname = 'invoices' AND NOT trg.tgisinternal
    ORDER BY trg.tgname;
  `);
  console.log(JSON.stringify(trgInvoices, null, 2));

  console.log('--- Triggers on invoice_items ---');
  const trgItems = await query(`
    SELECT trg.tgname, p.proname,
           CASE trg.tgtype::integer & 66
             WHEN 2 THEN 'BEFORE'
             WHEN 64 THEN 'INSTEAD OF'
             ELSE 'AFTER'
           END as timing,
           CASE trg.tgtype::integer & 28
             WHEN 4 THEN 'INSERT'
             WHEN 8 THEN 'DELETE'
             WHEN 16 THEN 'UPDATE'
             WHEN 20 THEN 'INSERT OR UPDATE'
             WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
             ELSE 'OTHER'
           END as events
    FROM pg_trigger trg
    JOIN pg_class c ON trg.tgrelid = c.oid
    JOIN pg_proc p ON trg.tgfoid = p.oid
    WHERE c.relname = 'invoice_items' AND NOT trg.tgisinternal
    ORDER BY trg.tgname;
  `);
  console.log(JSON.stringify(trgItems, null, 2));
}

run().catch(console.error);
