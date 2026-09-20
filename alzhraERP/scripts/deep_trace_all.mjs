import fs from 'node:fs';

const token = fs.readFileSync(process.env.USERPROFILE + '/.supabase/access-token', 'utf8').trim();
const projectRef = 'zzthamxjxnxzzpswllid';
const COMPANY_ID = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';

export async function query(sql, retries = 3) {
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
      console.log(`[retry ${attempt}/${retries}] query failed (${err.message}), retrying in 1s...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function main() {
  console.log('=== DEEP STEP-BY-STEP AUDIT FOR AL-JAAFARI ===\n');

  // 1. ALL SALES INVOICES: Grouped by date and currency
  const salesByDate = await query(`
    SELECT issue_date, currency_code, payment_method, COUNT(*) as count,
           ROUND(SUM(total_amount)::numeric, 2) as sum_amount,
           ROUND(SUM(paid_amount)::numeric, 2) as sum_paid
    FROM public.invoices
    WHERE company_id = '${COMPANY_ID}' AND type = 'sale' AND deleted_at IS NULL
    GROUP BY issue_date, currency_code, payment_method
    ORDER BY issue_date ASC, currency_code;
  `);
  console.log('--- 1. Sales Invoices by Date & Currency ---');
  console.table(salesByDate);

  // 2. ALL PURCHASES: Detailed list
  const purchases = await query(`
    SELECT i.invoice_number, i.issue_date, i.type, i.currency_code, i.exchange_rate,
           i.total_amount, i.paid_amount, p.name as supplier_name, i.payment_method, i.status,
           i.created_at
    FROM public.invoices i
    LEFT JOIN public.parties p ON p.id = i.party_id
    WHERE i.company_id = '${COMPANY_ID}' AND i.type IN ('purchase', 'purchase_return') AND i.deleted_at IS NULL
    ORDER BY i.issue_date ASC, i.created_at ASC;
  `);
  console.log('\n--- 2. All Purchases & Returns (11 invoices) ---');
  console.table(purchases);

  // 3. ALL EXPENSES: Grouped by date, currency and status
  const expensesByDate = await query(`
    SELECT expense_date, currency_code, status, COUNT(*) as count,
           ROUND(SUM(amount)::numeric, 2) as sum_amount,
           ROUND(SUM(CASE WHEN currency_code = 'YER' THEN amount / 410 ELSE amount END)::numeric, 2) as sum_sar_equiv
    FROM public.expenses
    WHERE company_id = '${COMPANY_ID}' AND deleted_at IS NULL
    GROUP BY expense_date, currency_code, status
    ORDER BY expense_date ASC, currency_code;
  `);
  console.log('\n--- 3. Expenses by Date & Currency ---');
  console.table(expensesByDate);

  // 4. Large or Abnormal Expenses (>= 500 SAR or unusual)
  const abnormalExpenses = await query(`
    SELECT voucher_number, expense_date, description, amount, currency_code, exchange_rate, status, payment_method, created_at
    FROM public.expenses
    WHERE company_id = '${COMPANY_ID}' AND deleted_at IS NULL
      AND (
        (currency_code = 'SAR' AND amount >= 100)
        OR amount >= 100000
        OR status = 'void'
      )
    ORDER BY expense_date ASC;
  `);
  console.log('\n--- 4. Large / Void / Noticeable Expenses ---');
  console.table(abnormalExpenses);

  // 5. ALL PAYMENTS / BONDS (سندات القبض والصرف)
  const allPayments = await query(`
    SELECT p.payment_number, p.type, p.payment_date, p.amount, p.currency_code, p.exchange_rate,
           p.payment_method, p.status, pt.name as party_name, a.name_ar as account_name,
           p.notes, p.created_at
    FROM public.payments p
    LEFT JOIN public.parties pt ON pt.id = p.party_id
    LEFT JOIN public.accounts a ON a.id = p.account_id
    WHERE p.company_id = '${COMPANY_ID}' AND p.deleted_at IS NULL
    ORDER BY p.payment_date ASC, p.created_at ASC;
  `);
  console.log('\n--- 5. All Payments & Bonds ---');
  console.table(allPayments);

  // 6. Are there any other journal entries that affect cash?
  const cashMovements = await query(`
    SELECT je.entry_number, je.entry_date, je.reference_type, je.reference_id, je.description as je_desc,
           a.code as account_code, a.name_ar as account_name,
           jel.debit_amount, jel.credit_amount, jel.foreign_amount, jel.currency_code,
           je.created_at
    FROM public.journal_entry_lines jel
    JOIN public.accounts a ON a.id = jel.account_id
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.company_id = '${COMPANY_ID}'
      AND a.code IN ('101001', '101002')
      AND jel.deleted_at IS NULL
      AND je.deleted_at IS NULL
    ORDER BY je.entry_date ASC, je.entry_number ASC;
  `);
  fs.writeFileSync('scripts/cash_movements_all.json', JSON.stringify(cashMovements, null, 2));
  console.log(`\n--- 6. Total Cash Movements recorded: ${cashMovements.length} lines (saved to scripts/cash_movements_all.json) ---`);
}

main().catch(console.error);
