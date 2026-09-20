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
  console.log('--- Constraints on product_stock ---');
  const cons = await query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint 
    WHERE conrelid = 'public.product_stock'::regclass;
  `);
  console.log(JSON.stringify(cons, null, 2));

  console.log('--- Indexes on product_stock ---');
  const idx = await query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'product_stock';
  `);
  console.log(JSON.stringify(idx, null, 2));

  console.log('--- Triggers on product_stock ---');
  const trg = await query(`
    SELECT tgname, proname 
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid = 'public.product_stock'::regclass AND NOT tgisinternal;
  `);
  console.log(JSON.stringify(trg, null, 2));
}

run().catch(console.error);
