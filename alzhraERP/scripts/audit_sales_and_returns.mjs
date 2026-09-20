import { writeFileSync } from 'node:fs';

const token = (await import('node:fs')).readFileSync(process.env.USERPROFILE + '/.supabase/access-token', 'utf8').trim();
const projectRef = 'zzthamxjxnxzzpswllid';

async function query(sql) {
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

async function runAudit() {
  const results = {};

  console.log('--- 1. INVOICE COUNTS BY TYPE AND STATUS ---');
  results.invoice_counts = await query(`
    SELECT type, status, count(*), 
           round(sum(total_amount), 2) as total_val, 
           round(sum(paid_amount), 2) as total_paid
    FROM public.invoices
    WHERE deleted_at IS NULL
    GROUP BY type, status
    ORDER BY type, status;
  `);
  console.log('1 done');

  console.log('--- 2. INVOICE MATH MISMATCHES (total_amount vs subtotal+tax-discount) ---');
  results.invoice_math_mismatch = await query(`
    SELECT count(*) as count,
           round(sum(abs(total_amount - (coalesce(subtotal, 0) + coalesce(tax_amount, 0) - coalesce(discount_amount, 0)))), 2) as total_diff
    FROM public.invoices
    WHERE deleted_at IS NULL
      AND abs(total_amount - (coalesce(subtotal, 0) + coalesce(tax_amount, 0) - coalesce(discount_amount, 0))) > 0.01;
  `);
  console.log('2 done:', results.invoice_math_mismatch);


  console.log('--- 3. INVOICE ITEMS SUM VS INVOICE SUBTOTAL MISMATCH ---');
  results.items_sum_vs_subtotal = await query(`
    WITH item_sums AS (
      SELECT invoice_id, 
             sum(quantity * unit_price - coalesce(discount_amount, 0)) as calculated_subtotal,
             sum(coalesce(tax_amount, 0)) as calculated_tax,
             sum(total) as line_totals_sum
      FROM public.invoice_items
      GROUP BY invoice_id
    )
    SELECT count(*) as mismatch_count
    FROM public.invoices inv
    JOIN item_sums it ON inv.id = it.invoice_id
    WHERE inv.deleted_at IS NULL
      AND (abs(coalesce(inv.subtotal, inv.total_amount) - it.calculated_subtotal) > 0.05
           OR abs(it.line_totals_sum - it.calculated_subtotal) > 0.05);
  `);

  console.log('--- 4. INVOICES STATUS VS PAID_AMOUNT ANOMALIES ---');
  results.status_vs_paid = await query(`
    SELECT status, count(*) as count,
           count(*) FILTER (WHERE paid_amount = 0) as paid_zero,
           count(*) FILTER (WHERE paid_amount > 0 AND paid_amount < total_amount) as paid_partial,
           count(*) FILTER (WHERE paid_amount >= total_amount) as paid_full,
           count(*) FILTER (WHERE paid_amount > total_amount) as overpaid
    FROM public.invoices
    WHERE deleted_at IS NULL AND type = 'sale'
    GROUP BY status;
  `);

  console.log('--- 5. SALES RETURNS INTEGRITY CHECKS ---');
  // 5a. Returns without reference invoice
  results.returns_without_ref = await query(`
    SELECT count(*) as returns_without_ref_count
    FROM public.invoices
    WHERE type IN ('sale_return', 'return_sale')
      AND deleted_at IS NULL
      AND reference_invoice_id IS NULL;
  `);

  // 5b. Returns referencing non-existent or wrong-company or wrong-type invoices
  results.returns_invalid_ref = await query(`
    SELECT r.id, r.invoice_number, r.reference_invoice_id, 
           orig.invoice_number as orig_number, orig.type as orig_type,
           r.company_id as ret_company, orig.company_id as orig_company
    FROM public.invoices r
    LEFT JOIN public.invoices orig ON r.reference_invoice_id = orig.id
    WHERE r.type IN ('sale_return', 'return_sale')
      AND r.deleted_at IS NULL
      AND r.reference_invoice_id IS NOT NULL
      AND (orig.id IS NULL OR orig.company_id <> r.company_id OR orig.type NOT IN ('sale'));
  `);

  // 5c. Returns where return quantity > original sold quantity!
  results.returns_exceeding_sold_qty = await query(`
    WITH return_lines AS (
      SELECT r.reference_invoice_id,
             ri.product_id,
             sum(ri.quantity) as returned_qty
      FROM public.invoices r
      JOIN public.invoice_items ri ON r.id = ri.invoice_id
      WHERE r.type IN ('sale_return', 'return_sale')
        AND r.deleted_at IS NULL
        AND r.status NOT IN ('cancelled', 'void')
        AND r.reference_invoice_id IS NOT NULL
      GROUP BY r.reference_invoice_id, ri.product_id
    ),
    orig_lines AS (
      SELECT oi.invoice_id,
             oi.product_id,
             sum(oi.quantity) as sold_qty
      FROM public.invoice_items oi
      GROUP BY oi.invoice_id, oi.product_id
    )
    SELECT ret.reference_invoice_id, ret.product_id,
           ret.returned_qty, coalesce(orig.sold_qty, 0) as orig_sold_qty,
           (ret.returned_qty - coalesce(orig.sold_qty, 0)) as excess_qty
    FROM return_lines ret
    LEFT JOIN orig_lines orig ON ret.reference_invoice_id = orig.invoice_id AND ret.product_id = orig.product_id
    WHERE ret.returned_qty > coalesce(orig.sold_qty, 0);
  `);

  // 5d. Returns where returned item was never in original invoice
  results.returns_unrelated_products = await query(`
    SELECT r.id as return_id, r.invoice_number, ri.product_id, r.reference_invoice_id
    FROM public.invoices r
    JOIN public.invoice_items ri ON r.id = ri.invoice_id
    WHERE r.type IN ('sale_return', 'return_sale')
      AND r.deleted_at IS NULL
      AND r.status NOT IN ('cancelled', 'void')
      AND r.reference_invoice_id IS NOT NULL
      AND ri.product_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.invoice_items oi
        WHERE oi.invoice_id = r.reference_invoice_id
          AND oi.product_id = ri.product_id
      );
  `);

  // 5e. Returns with currency mismatch against original invoice
  results.returns_currency_mismatch = await query(`
    SELECT r.id, r.invoice_number, r.currency_code as ret_curr, r.exchange_rate as ret_rate,
           orig.invoice_number as orig_number, orig.currency_code as orig_curr, orig.exchange_rate as orig_rate
    FROM public.invoices r
    JOIN public.invoices orig ON r.reference_invoice_id = orig.id
    WHERE r.type IN ('sale_return', 'return_sale')
      AND r.deleted_at IS NULL
      AND (r.currency_code <> orig.currency_code OR abs(r.exchange_rate - orig.exchange_rate) > 0.01);
  `);

  // 5f. Returns where unit price != original sale unit price
  results.returns_price_mismatch = await query(`
    SELECT r.invoice_number, ri.product_id, ri.unit_price as ret_price,
           oi.unit_price as orig_price, oi.quantity as orig_qty, ri.quantity as ret_qty
    FROM public.invoices r
    JOIN public.invoice_items ri ON r.id = ri.invoice_id
    JOIN public.invoice_items oi ON r.reference_invoice_id = oi.invoice_id AND ri.product_id = oi.product_id
    WHERE r.type IN ('sale_return', 'return_sale')
      AND r.deleted_at IS NULL
      AND r.reference_invoice_id IS NOT NULL
      AND abs(ri.unit_price - oi.unit_price) > 0.01;
  `);

  console.log('--- 6. INVENTORY MOVEMENTS AUDIT ---');
  // 6a. Posted sales invoices without inventory transaction
  results.sales_without_inventory_tx = await query(`
    SELECT count(*) as sales_missing_inv_tx
    FROM public.invoices inv
    WHERE inv.type = 'sale'
      AND inv.status IN ('posted', 'paid', 'partially_paid')
      AND inv.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.inventory_transactions it
        WHERE it.reference_id = inv.id
      )
      AND EXISTS (
        SELECT 1 FROM public.invoice_items ii
        WHERE ii.invoice_id = inv.id AND ii.product_id IS NOT NULL
      );
  `);

  // 6b. Posted returns without inventory transaction
  results.returns_without_inventory_tx = await query(`
    SELECT count(*) as returns_missing_inv_tx
    FROM public.invoices inv
    WHERE inv.type IN ('sale_return', 'return_sale')
      AND inv.status IN ('posted', 'paid')
      AND inv.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.inventory_transactions it
        WHERE it.reference_id = inv.id
      )
      AND EXISTS (
        SELECT 1 FROM public.invoice_items ii
        WHERE ii.invoice_id = inv.id AND ii.product_id IS NOT NULL
      );
  `);

  // 6c. Inventory transaction quantity sign anomalies
  results.inv_tx_sign_anomalies = await query(`
    SELECT transaction_type, reference_type, 
           count(*) as count,
           count(*) FILTER (WHERE quantity > 0) as pos_count,
           count(*) FILTER (WHERE quantity < 0) as neg_count,
           count(*) FILTER (WHERE quantity = 0) as zero_count
    FROM public.inventory_transactions
    WHERE reference_type IN ('sales_invoice', 'sale_return', 'purchase_invoice', 'purchase_return')
    GROUP BY transaction_type, reference_type;
  `);

  console.log('--- 7. GL JOURNAL POSTING AUDIT ---');
  // 7a. Posted sales invoices without journal entries
  results.sales_without_je = await query(`
    SELECT count(*) as sales_missing_je
    FROM public.invoices inv
    WHERE inv.type = 'sale'
      AND inv.status IN ('posted', 'paid', 'partially_paid')
      AND inv.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.reference_id = inv.id AND je.deleted_at IS NULL
      );
  `);

  // 7b. Posted returns without journal entries
  results.returns_without_je = await query(`
    SELECT count(*) as returns_missing_je
    FROM public.invoices inv
    WHERE inv.type IN ('sale_return', 'return_sale')
      AND inv.status IN ('posted', 'paid')
      AND inv.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.reference_id = inv.id AND je.deleted_at IS NULL
      );
  `);

  // 7c. Unbalanced journal entries for sales and returns
  results.unbalanced_je = await query(`
    SELECT je.id, je.reference_id, je.reference_type,
           round(sum(coalesce(jel.debit_amount, 0)), 4) as total_debit,
           round(sum(coalesce(jel.credit_amount, 0)), 4) as total_credit,
           round(abs(sum(coalesce(jel.debit_amount, 0)) - sum(coalesce(jel.credit_amount, 0))), 4) as diff
    FROM public.journal_entries je
    JOIN public.journal_entry_lines jel ON je.id = jel.journal_entry_id
    WHERE je.deleted_at IS NULL
      AND je.reference_type IN ('sales_invoice', 'sales_return', 'purchase_invoice', 'purchase_return')
    GROUP BY je.id, je.reference_id, je.reference_type
    HAVING abs(sum(coalesce(jel.debit_amount, 0)) - sum(coalesce(jel.credit_amount, 0))) > 0.01;
  `);

  // 7d. Journal entries with wrong sign / both debit and credit
  results.je_line_abnormalities = await query(`
    SELECT count(*) as abnormal_lines_count
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE je.deleted_at IS NULL
      AND (
        (jel.debit_amount > 0 AND jel.credit_amount > 0)
        OR (jel.debit_amount = 0 AND jel.credit_amount = 0)
        OR (jel.debit_amount < 0 OR jel.credit_amount < 0)
      );
  `);

  console.log('--- 8. MULTI-TENANT & BRANCH ISOLATION AUDIT ---');
  // 8a. Invoices where branch_id belongs to another company
  results.cross_company_branches = await query(`
    SELECT inv.id, inv.invoice_number, inv.company_id, inv.branch_id, b.company_id as branch_company_id
    FROM public.invoices inv
    JOIN public.branches b ON inv.branch_id = b.id
    WHERE inv.company_id <> b.company_id;
  `);

  // 8b. Invoices where party_id belongs to another company
  results.cross_company_parties = await query(`
    SELECT inv.id, inv.invoice_number, inv.company_id, inv.party_id, p.company_id as party_company_id
    FROM public.invoices inv
    JOIN public.parties p ON inv.party_id = p.id
    WHERE inv.company_id <> p.company_id;
  `);

  // 8c. Invoice items where product_id belongs to another company
  results.cross_company_products = await query(`
    SELECT ii.id, ii.invoice_id, ii.company_id, ii.product_id, p.company_id as prod_company_id
    FROM public.invoice_items ii
    JOIN public.products p ON ii.product_id = p.id
    WHERE ii.company_id <> p.company_id;
  `);

  // 8d. Invoices referencing an invoice of another company
  results.cross_company_reference_invoices = await query(`
    SELECT inv.id, inv.invoice_number, inv.company_id, inv.reference_invoice_id, ref.company_id as ref_company_id
    FROM public.invoices inv
    JOIN public.invoices ref ON inv.reference_invoice_id = ref.id
    WHERE inv.company_id <> ref.company_id;
  `);

  console.log('--- 9. DUPLICATE INVOICE NUMBERS ---');
  results.duplicate_numbers = await query(`
    SELECT company_id, invoice_number, count(*) as count
    FROM public.invoices
    WHERE deleted_at IS NULL
    GROUP BY company_id, invoice_number
    HAVING count(*) > 1;
  `);

  console.log('--- 10. TRIGGERS AND CONSTRAINTS AUDIT ---');
  results.triggers = await query(`
    SELECT tgname, relname, proname
    FROM pg_trigger trg
    JOIN pg_class c ON trg.tgrelid = c.oid
    JOIN pg_proc p ON trg.tgfoid = p.oid
    WHERE c.relname IN ('invoices', 'invoice_items', 'payment_allocations')
    ORDER BY c.relname, tgname;
  `);

  results.constraints = await query(`
    SELECT conname, contype, relname
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    WHERE c.relname IN ('invoices', 'invoice_items', 'payment_allocations')
    ORDER BY c.relname, contype, conname;
  `);

  writeFileSync('sales_returns_audit_raw.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('Audit complete. Results saved to sales_returns_audit_raw.json');
}

runAudit().catch(console.error);
