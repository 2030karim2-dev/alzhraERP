import fs from 'node:fs';

const token = fs.readFileSync(process.env.USERPROFILE + '/.supabase/access-token', 'utf8').trim();
const projectRef = 'zzthamxjxnxzzpswllid';
const COMPANY_ID = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';

export async function query(sql, retries = 5) {
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
      console.log(`[retry ${attempt}/${retries}] query failed (${err.message}), retrying in 1.5s...`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

async function main() {
  const v_base_currency = 'SAR';
  const res = await query(`
    SELECT 
      a.code,
      a.name_ar,
      a.type,
      a.currency_code,
      ROUND((SUM(l.debit_amount) - SUM(l.credit_amount))::numeric, 2) AS balance_sar,
      ROUND((SUM(l.debit_amount))::numeric, 2) AS total_debit_sar,
      ROUND((SUM(l.credit_amount))::numeric, 2) AS total_credit_sar,
      ROUND((
        CASE 
          WHEN a.currency_code = '${v_base_currency}' OR a.currency_code IS NULL THEN
            SUM(l.debit_amount) - SUM(l.credit_amount)
          ELSE
            SUM(
              CASE 
                WHEN l.debit_amount >= l.credit_amount THEN
                  CASE WHEN l.foreign_amount > 0 THEN l.foreign_amount ELSE (l.debit_amount - l.credit_amount) * (CASE WHEN COALESCE(l.exchange_rate,1) > 1 THEN l.exchange_rate ELSE 410 END) END
                ELSE
                  CASE WHEN l.foreign_amount > 0 THEN -l.foreign_amount ELSE (l.debit_amount - l.credit_amount) * (CASE WHEN COALESCE(l.exchange_rate,1) > 1 THEN l.exchange_rate ELSE 410 END) END
              END
            )
        END
      )::numeric, 2) AS foreign_balance
    FROM public.journal_entry_lines l
    JOIN public.journal_entries j ON j.id = l.journal_entry_id 
         AND j.company_id = '${COMPANY_ID}' 
         AND j.status = 'posted' 
         AND j.deleted_at IS NULL
    JOIN public.accounts a ON a.id = l.account_id 
         AND a.company_id = '${COMPANY_ID}'
    WHERE l.company_id = '${COMPANY_ID}'
      AND l.deleted_at IS NULL
    GROUP BY a.code, a.name_ar, a.type, a.currency_code
    ORDER BY a.code;
  `);

  console.log('=== BALANCES CALCULATED BY report_account_balances LOGIC ===');
  console.table(res);
}

main().catch(console.error);
