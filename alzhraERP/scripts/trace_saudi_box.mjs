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
  console.log('=== ALL TRANSACTIONS ON SAUDI CASH BOX (101001) ===');
  const saudiBox = await query(`
    SELECT je.entry_number, je.entry_date, je.reference_type, je.reference_id, je.description,
           jel.debit_amount, jel.credit_amount, jel.foreign_amount, jel.currency_code,
           jel.description as line_desc, je.created_at
    FROM public.journal_entry_lines jel
    JOIN public.accounts a ON a.id = jel.account_id
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.company_id = '${COMPANY_ID}'
      AND a.code = '101001'
      AND jel.deleted_at IS NULL
      AND je.deleted_at IS NULL
    ORDER BY je.entry_date ASC, je.entry_number ASC;
  `);
  console.table(saudiBox);

  console.log('\n=== ALL EXPENSES POSTED ON CASH BOXES ===');
  const expLines = await query(`
    SELECT e.voucher_number, e.expense_date, e.description, e.amount, e.currency_code, e.status, e.payment_method,
           a.code as cash_account_code, a.name_ar as cash_account_name,
           je.entry_number, jel.debit_amount, jel.credit_amount
    FROM public.expenses e
    LEFT JOIN public.journal_entries je ON je.reference_id = e.id AND je.company_id = '${COMPANY_ID}'
    LEFT JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id AND jel.credit_amount > 0
    LEFT JOIN public.accounts a ON a.id = jel.account_id
    WHERE e.company_id = '${COMPANY_ID}'
    ORDER BY e.expense_date ASC, e.voucher_number ASC;
  `);
  console.log('Total expenses:', expLines.length);
  const saudiExp = expLines.filter(x => x.currency_code === 'SAR');
  console.log('Saudi Expenses:', saudiExp);
}

main().catch(console.error);
