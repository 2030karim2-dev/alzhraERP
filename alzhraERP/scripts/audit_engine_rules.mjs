import fs from 'node:fs';

const token = fs.readFileSync(process.env.USERPROFILE + '/.supabase/access-token', 'utf8').trim();
const projectRef = 'zzthamxjxnxzzpswllid';
const COMPANY_ID = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';

async function query(sql, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`[retry ${attempt}/${retries}] (${err.message}), retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function main() {
  console.log('--- 1. TRIGGERS ON CORE FINANCIAL TABLES ---');
  const triggers = await query(`
    SELECT event_object_table, trigger_name, action_statement
    FROM information_schema.triggers
    WHERE event_object_table IN ('invoices', 'expenses', 'payments', 'journal_entries', 'journal_entry_lines')
    ORDER BY event_object_table, trigger_name;
  `);
  console.table(triggers);

  console.log('\n--- 2. CASH ACCOUNTS IN AL-JAAFARI ---');
  const accounts = await query(`
    SELECT id, code, name_ar, currency_code, parent_id, allow_posting, is_system
    FROM public.accounts
    WHERE company_id = '${COMPANY_ID}' AND (code LIKE '1010%' OR code = '1010')
    ORDER BY code;
  `);
  console.table(accounts);

  console.log('\n--- 3. HOW ARE INVOICE JOURNAL ENTRIES POSTED? ---');
  const sampleEntries = await query(`
    SELECT je.id, je.entry_number, je.entry_date, je.reference_type, je.reference_id, je.description,
           jel.account_id, a.code as acc_code, a.name_ar as acc_name, jel.debit, jel.credit,
           jel.currency_code, jel.foreign_amount, jel.exchange_rate
    FROM public.journal_entries je
    JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
    JOIN public.accounts a ON a.id = jel.account_id
    WHERE je.company_id = '${COMPANY_ID}' AND je.reference_type IN ('invoice', 'expense', 'payment')
    ORDER BY je.entry_date DESC, je.id DESC, jel.id ASC
    LIMIT 25;
  `);
  console.table(sampleEntries);
}

main().catch(console.error);
