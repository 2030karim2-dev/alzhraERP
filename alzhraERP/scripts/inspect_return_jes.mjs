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
  console.log('--- Journal Entries of Credit Sales Returns ---');
  const returnJes = await query(`
    SELECT r.invoice_number, r.payment_method, r.total_amount,
           je.id as je_id, je.description as je_desc,
           jel.account_id, acc.code as acc_code, acc.name_ar as acc_name,
           jel.debit_amount, jel.credit_amount, jel.party_id, jel.description as line_desc
    FROM public.invoices r
    JOIN public.journal_entries je ON je.reference_id = r.id AND je.deleted_at IS NULL
    JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
    LEFT JOIN public.accounts acc ON jel.account_id = acc.id
    WHERE r.type = 'sale_return' AND r.invoice_number IN ('مردود مبيع:62', 'مردود مبيع:63', 'مردود مبيع:64', 'مردود مبيع:65')
    ORDER BY r.invoice_number, jel.debit_amount DESC;
  `);
  console.log(JSON.stringify(returnJes, null, 2));
}

run().catch(console.error);
