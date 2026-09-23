-- ============================================================
-- Migration: 20260924000001_harden_statements_and_detailed_party_ledger.sql
-- Description:
--   1. Deep Hardening of get_party_statement:
--      - Accepts optional date ranges (p_from_date, p_to_date) and currency filter (p_currency_code)
--      - Correct multi-currency display: uses true transaction currency amount (foreign_amount)
--        instead of converted SAR base amount with foreign currency label
--      - Pre-calculates 'Balance Brought Forward' (رصيد سابق منقول) when p_from_date is specified
--      - Partitions running balance strictly by currency (no blending of SAR and YER)
--      - Correct sign rules: customer (debit - credit), supplier (credit - debit)
--      - Enriches movements with reference_id, reference_type, payment_status,
--        paid_amount, remaining_amount, and items_count for interactive detailed statement grid
--      - Stable sorting by entry_date, created_at, line_id
--   2. Deep Hardening of get_account_ledger:
--      - Restores lost fields: journal_id, reference_type, reference_id, party_id, party_name
--      - Computes and returns foreign_balance and openingForeignBalance for foreign treasury accounts
--      - Standardized tenant authorization via fn_assert_company_access
--   3. Transaction Details Helper RPC:
--      - get_statement_transaction_details: returns line items for invoices,
--        allocations for payment bonds, and journal lines for manual journals.
-- ============================================================

-- ------------------------------------------------------------
-- 1. get_party_statement (Overload & Default Signature)
-- ------------------------------------------------------------

-- Drop older signatures to avoid parameter ambiguity
DROP FUNCTION IF EXISTS public.get_party_statement(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_party_statement(uuid, uuid, date, date, text);

CREATE OR REPLACE FUNCTION public.get_party_statement(
  p_company_id    uuid,
  p_party_id      uuid,
  p_from_date     date DEFAULT NULL::date,
  p_to_date       date DEFAULT NULL::date,
  p_currency_code text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_movements json;
  v_party_type text;
  v_base_currency text;
BEGIN
  -- Strict multi-tenant security verification
  PERFORM public.fn_assert_company_access(p_company_id);

  SELECT type INTO v_party_type
  FROM public.parties
  WHERE id = p_party_id AND company_id = p_company_id AND deleted_at IS NULL;

  IF v_party_type IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT COALESCE(base_currency, 'SAR') INTO v_base_currency
  FROM public.companies
  WHERE id = p_company_id;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.is_bf DESC, t.created_at, t.line_id), '[]'::json)
  INTO v_movements
  FROM (
    SELECT 
      sub.line_id,
      sub.entry_date,
      sub.created_at,
      sub.is_bf,
      sub.ref,
      sub.operation_type,
      sub.description,
      sub.type,
      sub.debit,
      sub.credit,
      sub.currency,
      sub.debit_base,
      sub.credit_base,
      sub.reference_id,
      sub.reference_type,
      sub.payment_status,
      sub.paid_amount,
      sub.remaining_amount,
      sub.items_count,
      SUM(
        CASE
          WHEN v_party_type = 'supplier' THEN sub.credit - sub.debit
          ELSE sub.debit - sub.credit
        END
      ) OVER (
        PARTITION BY sub.currency
        ORDER BY sub.entry_date, sub.is_bf DESC, sub.created_at, sub.line_id
        ROWS UNBOUNDED PRECEDING
      ) AS balance
    FROM (
      -- 1.1 Balance Brought Forward (رصيد ما قبل الفترة) if p_from_date is specified
      SELECT 
        'BF-' || ob_prev.currency AS line_id,
        p_from_date AS entry_date,
        '1970-01-01 00:00:00+00'::timestamptz AS created_at,
        1 AS is_bf,
        'BF' AS ref,
        'رصيد سابق' AS operation_type,
        'رصيد ما قبل تاريخ ' || to_char(p_from_date, 'YYYY-MM-DD') AS description,
        'balance_brought_forward' AS type,
        CASE 
          WHEN v_party_type = 'supplier' THEN
            CASE WHEN ob_prev.net_balance < 0 THEN ABS(ob_prev.net_balance) ELSE 0 END
          ELSE
            CASE WHEN ob_prev.net_balance > 0 THEN ob_prev.net_balance ELSE 0 END
        END AS debit,
        CASE 
          WHEN v_party_type = 'supplier' THEN
            CASE WHEN ob_prev.net_balance > 0 THEN ob_prev.net_balance ELSE 0 END
          ELSE
            CASE WHEN ob_prev.net_balance < 0 THEN ABS(ob_prev.net_balance) ELSE 0 END
        END AS credit,
        ob_prev.currency,
        0::numeric AS debit_base,
        0::numeric AS credit_base,
        NULL::uuid AS reference_id,
        'balance_brought_forward' AS reference_type,
        'settled'::text AS payment_status,
        0::numeric AS paid_amount,
        0::numeric AS remaining_amount,
        0::bigint AS items_count
      FROM (
        SELECT 
          prior_raw.currency,
          SUM(
            CASE 
              WHEN v_party_type = 'supplier' THEN prior_raw.credit - prior_raw.debit
              ELSE prior_raw.debit - prior_raw.credit
            END
          ) AS net_balance
        FROM (
          -- Prior opening balance lines
          SELECT 
            ob.currency_code AS currency,
            CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE 0 END AS debit,
            CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE 0 END AS credit
          FROM public.party_opening_balances ob
          WHERE ob.company_id = p_company_id 
            AND ob.party_id = p_party_id
            AND (p_from_date IS NOT NULL AND ob.entry_date < p_from_date)
            AND (p_currency_code IS NULL OR ob.currency_code = p_currency_code)

          UNION ALL

          -- Prior posted journal entry lines
          SELECT 
            jel.currency_code AS currency,
            CASE 
              WHEN jel.debit_amount > 0 THEN 
                COALESCE(NULLIF(jel.foreign_amount, 0), jel.debit_amount) 
              ELSE 0 
            END AS debit,
            CASE 
              WHEN jel.credit_amount > 0 THEN 
                COALESCE(NULLIF(jel.foreign_amount, 0), jel.credit_amount) 
              ELSE 0 
            END AS credit
          FROM public.journal_entry_lines jel
          JOIN public.journal_entries je ON je.id = jel.journal_entry_id
          JOIN public.accounts a ON a.id = jel.account_id
          WHERE je.company_id = p_company_id
            AND je.status = 'posted'
            AND je.deleted_at IS NULL
            AND jel.deleted_at IS NULL
            AND jel.party_id = p_party_id
            AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
            AND (p_from_date IS NOT NULL AND je.entry_date < p_from_date)
            AND (p_currency_code IS NULL OR jel.currency_code = p_currency_code)
        ) prior_raw
        GROUP BY prior_raw.currency
        HAVING SUM(
          CASE 
            WHEN v_party_type = 'supplier' THEN prior_raw.credit - prior_raw.debit
            ELSE prior_raw.debit - prior_raw.credit
          END
        ) <> 0
      ) ob_prev
      WHERE p_from_date IS NOT NULL

      UNION ALL

      -- 1.2 Opening balance lines falling within the filtered range (or all if p_from_date is null)
      SELECT 
        ob.id::text AS line_id,
        ob.entry_date,
        ob.created_at,
        0 AS is_bf,
        'OB' AS ref,
        'رصيد افتتاحي' AS operation_type,
        COALESCE(ob.notes, 'رصيد افتتاحي') AS description,
        'opening_balance' AS type,
        CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE 0 END AS debit,
        CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE 0 END AS credit,
        ob.currency_code AS currency,
        CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE 0 END AS debit_base,
        CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE 0 END AS credit_base,
        ob.id AS reference_id,
        'opening_balance' AS reference_type,
        'settled'::text AS payment_status,
        0::numeric AS paid_amount,
        0::numeric AS remaining_amount,
        0::bigint AS items_count
      FROM public.party_opening_balances ob
      WHERE ob.company_id = p_company_id 
        AND ob.party_id = p_party_id
        AND (p_from_date IS NULL OR ob.entry_date >= p_from_date)
        AND (p_to_date IS NULL OR ob.entry_date <= p_to_date)
        AND (p_currency_code IS NULL OR ob.currency_code = p_currency_code)

      UNION ALL

      -- 1.3 Journal lines within the filtered date range with enriched invoice/bond status
      SELECT 
        jel.id::text AS line_id,
        je.entry_date,
        jel.created_at,
        0 AS is_bf,
        CASE 
          WHEN je.reference_type IN ('sales_invoice', 'invoice') THEN COALESCE(inv.invoice_number, 'INV')
          WHEN je.reference_type = 'purchase_invoice' THEN COALESCE(inv.invoice_number, 'PUR')
          WHEN je.reference_type IN ('payment', 'payment_bond') THEN COALESCE(pay.payment_number, 'PAY')
          WHEN je.reference_type IN ('receipt', 'receipt_bond') THEN COALESCE(pay.payment_number, 'RCV')
          WHEN je.reference_type IN ('sale_return', 'sales_return', 'return_sale') THEN COALESCE(inv.invoice_number, 'RET')
          WHEN je.reference_type IN ('purchase_return', 'return_purchase') THEN COALESCE(inv.invoice_number, 'PRET')
          WHEN je.reference_type = 'expense' THEN 'EXP'
          ELSE COALESCE('JV-' || je.entry_number::text, 'JV') 
        END AS ref,
        CASE 
          WHEN je.reference_type IN ('sales_invoice', 'invoice') THEN 'فاتورة مبيعات'
          WHEN je.reference_type = 'purchase_invoice' THEN 'فاتورة مشتريات'
          WHEN je.reference_type IN ('payment', 'payment_bond') THEN 'سند صرف'
          WHEN je.reference_type IN ('receipt', 'receipt_bond') THEN 'سند قبض'
          WHEN je.reference_type IN ('sale_return', 'sales_return', 'return_sale') THEN 'مرتجع مبيعات'
          WHEN je.reference_type IN ('purchase_return', 'return_purchase') THEN 'مرتجع مشتريات'
          WHEN je.reference_type = 'expense' THEN 'صرف مصروف'
          ELSE 'قيد محاسبي' 
        END AS operation_type,
        COALESCE(jel.description, je.description, 'حركة محاسبية') AS description,
        je.reference_type AS type,
        -- True transaction currency amount
        CASE 
          WHEN jel.debit_amount > 0 THEN 
            COALESCE(NULLIF(jel.foreign_amount, 0), jel.debit_amount) 
          ELSE 0 
        END AS debit,
        CASE 
          WHEN jel.credit_amount > 0 THEN 
            COALESCE(NULLIF(jel.foreign_amount, 0), jel.credit_amount) 
          ELSE 0 
        END AS credit,
        jel.currency_code AS currency,
        -- Base currency equivalent (SAR)
        jel.debit_amount AS debit_base,
        jel.credit_amount AS credit_base,
        COALESCE(je.reference_id, je.id) AS reference_id,
        COALESCE(je.reference_type, 'journal_entry') AS reference_type,
        -- Payment status classification for visual badge/color
        CASE 
          WHEN inv.id IS NOT NULL THEN
            CASE 
              WHEN inv.status = 'paid' THEN 'paid'
              WHEN inv.status = 'partially_paid' THEN 'partially_paid'
              WHEN inv.status = 'void' OR inv.status = 'cancelled' THEN 'void'
              ELSE 'unpaid'
            END
          WHEN pay.id IS NOT NULL THEN
            CASE 
              WHEN pay.status = 'posted' THEN 'paid'
              WHEN pay.status = 'void' THEN 'void'
              ELSE 'draft'
            END
          ELSE 'posted'
        END AS payment_status,
        COALESCE(inv.paid_amount, pay.amount, 0)::numeric AS paid_amount,
        COALESCE(GREATEST(inv.total_amount - COALESCE(inv.paid_amount, 0), 0), 0)::numeric AS remaining_amount,
        COALESCE(inv_meta.item_count, 0)::bigint AS items_count
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      JOIN public.accounts a ON a.id = jel.account_id
      LEFT JOIN public.invoices inv ON inv.id = je.reference_id AND je.reference_type IN ('sales_invoice', 'invoice', 'purchase_invoice', 'sale_return', 'sales_return', 'return_sale', 'purchase_return', 'return_purchase')
      LEFT JOIN public.payments pay ON pay.id = je.reference_id AND je.reference_type IN ('payment', 'payment_bond', 'receipt', 'receipt_bond')
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS item_count 
        FROM public.invoice_items ii 
        WHERE ii.invoice_id = inv.id
      ) inv_meta ON true
      WHERE je.company_id = p_company_id
        AND je.status = 'posted'
        AND je.deleted_at IS NULL
        AND jel.deleted_at IS NULL
        AND jel.party_id = p_party_id
        AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
        AND (p_from_date IS NULL OR je.entry_date >= p_from_date)
        AND (p_to_date IS NULL OR je.entry_date <= p_to_date)
        AND (p_currency_code IS NULL OR jel.currency_code = p_currency_code)
    ) sub
  ) t;

  RETURN v_movements;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_party_statement(uuid, uuid, date, date, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_party_statement(uuid, uuid, date, date, text) TO authenticated;


-- ------------------------------------------------------------
-- 2. get_account_ledger (Restoration & Foreign Currency Calculation)
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_account_ledger(uuid, uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION public.get_account_ledger(
  p_company_id  uuid,
  p_account_id  uuid,
  p_from        text DEFAULT NULL::text,
  p_to          text DEFAULT NULL::text,
  p_branch_id   uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type             text;
  v_account_currency         text;
  v_is_debit_nature          boolean;
  v_opening_balance          numeric := 0;
  v_opening_foreign_balance  numeric := 0;
  v_entries                  json;
BEGIN
  -- Strict multi-tenant security verification
  PERFORM public.fn_assert_company_access(p_company_id);

  SELECT type, COALESCE(currency_code, 'SAR')
  INTO v_account_type, v_account_currency
  FROM public.accounts
  WHERE id = p_account_id AND company_id = p_company_id AND deleted_at IS NULL;

  IF v_account_type IS NULL THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;

  v_is_debit_nature := v_account_type IN ('asset', 'expense');

  -- Pre-calculate opening balances (base and foreign) prior to p_from
  IF p_from IS NOT NULL THEN
    WITH RECURSIVE account_tree AS (
      SELECT id FROM public.accounts WHERE id = p_account_id AND deleted_at IS NULL
      UNION ALL
      SELECT a.id FROM public.accounts a
      INNER JOIN account_tree at ON a.parent_id = at.id
      WHERE a.deleted_at IS NULL
    )
    SELECT 
      COALESCE(SUM(
        CASE WHEN v_is_debit_nature
          THEN (COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0))
          ELSE (COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0))
        END
      ), 0),
      COALESCE(SUM(
        CASE WHEN v_is_debit_nature
          THEN (
            CASE WHEN jel.debit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.debit_amount) ELSE 0 END -
            CASE WHEN jel.credit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.credit_amount) ELSE 0 END
          )
          ELSE (
            CASE WHEN jel.credit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.credit_amount) ELSE 0 END -
            CASE WHEN jel.debit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.debit_amount) ELSE 0 END
          )
        END
      ), 0)
    INTO v_opening_balance, v_opening_foreign_balance
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.account_id IN (SELECT id FROM account_tree)
      AND je.company_id = p_company_id
      AND je.status = 'posted'
      AND je.deleted_at IS NULL
      AND jel.deleted_at IS NULL
      AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id)
      AND je.entry_date < p_from::date;
  END IF;

  WITH RECURSIVE account_tree AS (
    SELECT id FROM public.accounts WHERE id = p_account_id AND deleted_at IS NULL
    UNION ALL
    SELECT a.id FROM public.accounts a
    INNER JOIN account_tree at ON a.parent_id = at.id
    WHERE a.deleted_at IS NULL
  )
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.entry_number, t.id), '[]'::json)
  INTO v_entries
  FROM (
    SELECT 
      jel.id,
      je.id AS journal_id,
      je.entry_date,
      je.entry_number,
      je.branch_id,
      je.reference_type,
      je.reference_id,
      COALESCE(jel.description, je.description, '') AS description,
      COALESCE(jel.debit_amount, 0) AS debit_amount,
      COALESCE(jel.credit_amount, 0) AS credit_amount,
      COALESCE(jel.currency_code, v_account_currency) AS currency_code,
      COALESCE(jel.exchange_rate, 1) AS exchange_rate,
      CASE 
        WHEN jel.debit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.debit_amount)
        WHEN jel.credit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.credit_amount)
        ELSE 0 
      END AS foreign_amount,
      jel.party_id,
      p.name AS party_name,
      v_opening_balance + SUM(
        CASE WHEN v_is_debit_nature
          THEN (COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0))
          ELSE (COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0))
        END
      ) OVER (ORDER BY je.entry_date, je.entry_number, jel.id ROWS UNBOUNDED PRECEDING) AS balance,
      v_opening_foreign_balance + SUM(
        CASE WHEN v_is_debit_nature
          THEN (
            CASE WHEN jel.debit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.debit_amount) ELSE 0 END -
            CASE WHEN jel.credit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.credit_amount) ELSE 0 END
          )
          ELSE (
            CASE WHEN jel.credit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.credit_amount) ELSE 0 END -
            CASE WHEN jel.debit_amount > 0 THEN COALESCE(NULLIF(jel.foreign_amount, 0), jel.debit_amount) ELSE 0 END
          )
        END
      ) OVER (ORDER BY je.entry_date, je.entry_number, jel.id ROWS UNBOUNDED PRECEDING) AS foreign_balance
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    LEFT JOIN public.parties p ON p.id = jel.party_id
    WHERE jel.account_id IN (SELECT id FROM account_tree)
      AND je.company_id = p_company_id
      AND je.status = 'posted'
      AND je.deleted_at IS NULL
      AND jel.deleted_at IS NULL
      AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id)
      AND (p_from IS NULL OR je.entry_date >= p_from::date)
      AND (p_to   IS NULL OR je.entry_date <= p_to::date)
  ) t;

  RETURN json_build_object(
    'openingBalance', v_opening_balance,
    'openingForeignBalance', v_opening_foreign_balance,
    'entries', v_entries,
    'accountType', v_account_type,
    'currencyCode', v_account_currency
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_account_ledger(uuid, uuid, text, text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_account_ledger(uuid, uuid, text, text, uuid) TO authenticated;


-- ------------------------------------------------------------
-- 3. get_statement_transaction_details (Detailed Breakdown RPC)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_statement_transaction_details(
  p_company_id     uuid,
  p_reference_type text,
  p_reference_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb := '{}'::jsonb;
BEGIN
  -- Strict multi-tenant security verification
  PERFORM public.fn_assert_company_access(p_company_id);

  IF p_reference_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'reference_id_null');
  END IF;

  -- 3.1 Invoices (Sales, Purchase, Returns)
  IF p_reference_type IN ('sales_invoice', 'invoice', 'purchase_invoice', 'sale_return', 'sales_return', 'return_sale', 'purchase_return', 'return_purchase') THEN
    SELECT jsonb_build_object(
      'kind', 'invoice',
      'invoice_id', i.id,
      'invoice_number', i.invoice_number,
      'issue_date', i.issue_date,
      'type', i.type,
      'status', i.status,
      'currency_code', i.currency_code,
      'exchange_rate', i.exchange_rate,
      'subtotal', i.subtotal,
      'discount_amount', i.discount_amount,
      'tax_amount', i.tax_amount,
      'total_amount', i.total_amount,
      'paid_amount', COALESCE(i.paid_amount, 0),
      'remaining_amount', GREATEST(i.total_amount - COALESCE(i.paid_amount, 0), 0),
      'notes', i.notes,
      'items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ii.id,
          'item_name', COALESCE(p.name_ar, ii.description, 'صنف'),
          'sku', p.sku,
          'part_number', p.part_number,
          'quantity', ii.quantity,
          'unit_price', ii.unit_price,
          'discount_amount', COALESCE(ii.discount_amount, 0),
          'tax_amount', COALESCE(ii.tax_amount, 0),
          'total_amount', ii.total
        ) ORDER BY ii.id)
        FROM public.invoice_items ii
        LEFT JOIN public.products p ON p.id = ii.product_id
        WHERE ii.invoice_id = i.id
      ), '[]'::jsonb)
    ) INTO v_result
    FROM public.invoices i
    WHERE i.id = p_reference_id AND i.company_id = p_company_id AND i.deleted_at IS NULL;

  -- 3.2 Financial Bonds / Payments / Receipts
  ELSIF p_reference_type IN ('payment', 'payment_bond', 'receipt', 'receipt_bond') THEN
    SELECT jsonb_build_object(
      'kind', 'bond',
      'payment_id', pay.id,
      'payment_number', pay.payment_number,
      'payment_date', pay.payment_date,
      'type', pay.type,
      'amount', pay.amount,
      'currency_code', pay.currency_code,
      'exchange_rate', pay.exchange_rate,
      'payment_method', pay.payment_method,
      'status', pay.status,
      'notes', pay.notes,
      'account_name', a.name_ar,
      'account_code', a.code,
      'allocations', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'allocation_id', pa.id,
          'allocated_amount', pa.amount,
          'invoice_number', inv.invoice_number,
          'invoice_date', inv.issue_date,
          'invoice_total', inv.total_amount
        ))
        FROM public.payment_allocations pa
        JOIN public.invoices inv ON inv.id = pa.invoice_id
        WHERE pa.payment_id = pay.id AND pa.company_id = p_company_id
      ), '[]'::jsonb)
    ) INTO v_result
    FROM public.payments pay
    LEFT JOIN public.accounts a ON a.id = pay.account_id
    WHERE pay.id = p_reference_id AND pay.company_id = p_company_id AND pay.deleted_at IS NULL;

  -- 3.3 Opening Balance
  ELSIF p_reference_type = 'opening_balance' THEN
    SELECT jsonb_build_object(
      'kind', 'opening_balance',
      'id', ob.id,
      'entry_date', ob.entry_date,
      'direction', ob.direction,
      'amount', ob.amount,
      'currency_code', ob.currency_code,
      'notes', ob.notes
    ) INTO v_result
    FROM public.party_opening_balances ob
    WHERE ob.id = p_reference_id AND ob.company_id = p_company_id;

  -- 3.4 Fallback Journal Entry
  ELSE
    SELECT jsonb_build_object(
      'kind', 'journal',
      'journal_id', je.id,
      'entry_number', je.entry_number,
      'entry_date', je.entry_date,
      'description', je.description,
      'lines', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'account_code', acc.code,
          'account_name', acc.name_ar,
          'debit', jel.debit_amount,
          'credit', jel.credit_amount,
          'currency_code', jel.currency_code,
          'description', jel.description
        ))
        FROM public.journal_entry_lines jel
        JOIN public.accounts acc ON acc.id = jel.account_id
        WHERE jel.journal_entry_id = je.id AND jel.deleted_at IS NULL
      ), '[]'::jsonb)
    ) INTO v_result
    FROM public.journal_entries je
    WHERE je.id = p_reference_id AND je.company_id = p_company_id AND je.deleted_at IS NULL;
  END IF;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_statement_transaction_details(uuid, text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_statement_transaction_details(uuid, text, uuid) TO authenticated;
