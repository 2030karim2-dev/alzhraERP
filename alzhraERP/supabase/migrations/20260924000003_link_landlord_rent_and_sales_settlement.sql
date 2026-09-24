-- ==============================================================================
-- Migration: 20260924000003_link_landlord_rent_and_sales_settlement.sql
-- Description: 
--   1. Enhance get_party_statement to include rent payables (2400%) and staff payables (1400%)
--      so landlord and custody statements seamlessly reflect entitlements alongside sales/withdrawals.
--   2. Perform settlement & clearing of landlord spare parts sales invoices against rent payables:
--      - INV-20260908-0008 (140 SAR) offset against 240001 (إيجار المحل - ريال سعودي)
--      - INV-20260913-0046 (12,000 YER) & INV-20260913-0048 (3,000 YER) offset against 240002 (إيجار المحل - ريال يمني)
--   3. Link expense category "يسلم صاحب اليجار" directly to landlord account 240001.
-- ==============================================================================

-- 1. get_party_statement (Expanded account scope to 1100%, 2100%, 2400%, 1400%)
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
        (p_from_date::text || ' 00:00:00+00')::timestamptz AS created_at,
        1 AS is_bf,
        'رصيد سابق' AS ref,
        'رصيد ما قبل الفترة' AS operation_type,
        'رصيد مرحل من الفترة السابقة' AS description,
        'brought_forward' AS type,
        ob_prev.debit,
        ob_prev.credit,
        ob_prev.currency,
        ob_prev.debit_base,
        ob_prev.credit_base,
        NULL::uuid AS reference_id,
        'brought_forward' AS reference_type,
        'posted' AS payment_status,
        0::numeric AS paid_amount,
        0::numeric AS remaining_amount,
        0::bigint AS items_count
      FROM (
        SELECT 
          prior_raw.currency,
          GREATEST(
            SUM(
              CASE 
                WHEN v_party_type = 'supplier' THEN prior_raw.credit - prior_raw.debit
                ELSE prior_raw.debit - prior_raw.credit
              END
            ), 0
          ) AS debit,
          GREATEST(
            -SUM(
              CASE 
                WHEN v_party_type = 'supplier' THEN prior_raw.credit - prior_raw.debit
                ELSE prior_raw.debit - prior_raw.credit
              END
            ), 0
          ) AS credit,
          0::numeric AS debit_base,
          0::numeric AS credit_base
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

          -- Prior posted journal entry lines (1100%, 2100%, 2400%, 1400%)
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
            AND (a.code LIKE '1100%' OR a.code LIKE '2100%' OR a.code LIKE '2400%' OR a.code LIKE '1400%')
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

      -- 1.2 Opening balance records in date range
      SELECT 
        'OB-' || ob.id::text AS line_id,
        ob.entry_date,
        ob.created_at,
        0 AS is_bf,
        'رصيد افتتاحي' AS ref,
        'رصيد افتتاحي' AS operation_type,
        COALESCE(ob.notes, 'رصيد افتتاحي معتمد') AS description,
        'opening_balance' AS type,
        CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE 0 END AS debit,
        CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE 0 END AS credit,
        ob.currency_code AS currency,
        CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE 0 END AS debit_base,
        CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE 0 END AS credit_base,
        NULL::uuid AS reference_id,
        'opening_balance' AS reference_type,
        'posted' AS payment_status,
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
          WHEN je.reference_type = 'settlement' THEN 'SETTLE'
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
          WHEN je.reference_type = 'settlement' THEN 'تسوية ومقاصة'
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
        COALESCE(jel.currency_code, v_base_currency) AS currency,
        jel.debit_amount AS debit_base,
        jel.credit_amount AS credit_base,
        COALESCE(inv.id, pay.id, je.reference_id, je.id) AS reference_id,
        COALESCE(je.reference_type, 'journal_entry') AS reference_type,
        CASE 
          WHEN inv.id IS NOT NULL THEN
            CASE 
              WHEN inv.status = 'paid' OR (inv.paid_amount >= inv.total_amount AND inv.total_amount > 0) THEN 'paid'
              WHEN inv.paid_amount > 0 THEN 'partial'
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
        AND (a.code LIKE '1100%' OR a.code LIKE '2100%' OR a.code LIKE '2400%' OR a.code LIKE '1400%')
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

-- Drop any legacy 2-argument overload to avoid PostgreSQL parameter default ambiguity (ERROR 42725)
DROP FUNCTION IF EXISTS public.get_party_statement(uuid, uuid);


-- 2. Settlement Execution: Offset Landlord Sales Invoices against Rent Payables
DO $$
DECLARE
  v_company_id uuid := 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';
  v_branch_id  uuid := '26f1db8c-8165-41b9-9334-32fd52522e3a';
  v_party_id   uuid := 'fe937d01-8505-405a-813e-448494d5d2ca'; -- صاحب الإيجار
  v_user_id    uuid := '0b2f21d4-8e0a-43bb-9043-e664c1c04e8c';
  
  v_ar_account_id   uuid := '98f09548-508e-4387-acbf-3296d03e45e4'; -- 1100 المدينون (ذمم العملاء)
  v_rent_sar_acc_id uuid := 'ca34e70c-38ff-4b80-b6af-c0b1b0d19a41'; -- 240001 إيجار المحل - ريال سعودي
  v_rent_yer_acc_id uuid := '04a83d37-9099-4edd-8300-b9fb3b45903d'; -- 240002 إيجار المحل - ريال يمني

  v_sar_invoice_id uuid := 'd71de00c-90ec-400f-a2c8-fddf13b6126f'; -- INV-20260908-0008 (140 SAR)
  v_yer_inv1_id    uuid := 'b18bbf9f-20fa-4728-8994-60cd53a8b28e'; -- INV-20260913-0046 (12,000 YER)
  v_yer_inv2_id    uuid := 'fab06c99-e3a3-41b5-8347-64a7d66003aa'; -- INV-20260913-0048 (3,000 YER)

  v_sar_je_id uuid;
  v_yer_je_id uuid;
  v_sar_inv_paid numeric;
  v_yer_inv1_paid numeric;
BEGIN
  -- A. Check if SAR invoice is not yet paid
  SELECT COALESCE(paid_amount, 0) INTO v_sar_inv_paid
  FROM public.invoices WHERE id = v_sar_invoice_id;

  IF v_sar_inv_paid < 140.00 THEN
    -- 1) Create Settlement Journal Entry in SAR (140 SAR)
    INSERT INTO public.journal_entries (
      company_id, branch_id, entry_date, description, reference_type, reference_id, status, created_by
    ) VALUES (
      v_company_id, v_branch_id, '2026-09-08',
      'تسوية ومقاصة سحبيات مبيعات - فاتورة INV-20260908-0008 من مستحق الإيجار',
      'settlement', v_sar_invoice_id, 'draft', v_user_id
    ) RETURNING id INTO v_sar_je_id;

    -- Debit Rent Payable 240001 (تخفيض التزام الإيجار)
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, party_id, description,
      debit_amount, credit_amount, currency_code, exchange_rate, foreign_amount,
      company_id, branch_id
    ) VALUES (
      v_sar_je_id, v_rent_sar_acc_id, v_party_id,
      'تسوية سحبيات مبيعات (مساعدين شاص) خصماً من مستحق الإيجار',
      140.0000, 0.0000, 'SAR', 1.0, 140.00,
      v_company_id, v_branch_id
    );

    -- Credit Accounts Receivable 1100 (إغلاق ذمة الفاتورة)
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, party_id, description,
      debit_amount, credit_amount, currency_code, exchange_rate, foreign_amount,
      company_id, branch_id
    ) VALUES (
      v_sar_je_id, v_ar_account_id, v_party_id,
      'سداد فاتورة مبيعات INV-20260908-0008 بالمقاصة من مستحق الإيجار',
      0.0000, 140.0000, 'SAR', 1.0, 140.00,
      v_company_id, v_branch_id
    );

    -- Post the journal entry
    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_sar_je_id;

    -- Update invoice to paid
    UPDATE public.invoices 
    SET paid_amount = 140.0000, status = 'paid', updated_at = NOW()
    WHERE id = v_sar_invoice_id;
  END IF;

  -- B. Check if YER invoices are not yet paid
  SELECT COALESCE(paid_amount, 0) INTO v_yer_inv1_paid
  FROM public.invoices WHERE id = v_yer_inv1_id;

  IF v_yer_inv1_paid < 12000.00 THEN
    -- 2) Create Settlement Journal Entry in YER (15,000 YER total = 36.5854 SAR)
    INSERT INTO public.journal_entries (
      company_id, branch_id, entry_date, description, reference_type, reference_id, status, created_by
    ) VALUES (
      v_company_id, v_branch_id, '2026-09-13',
      'تسوية ومقاصة سحبيات مبيعات - فواتير INV-20260913-0046 و INV-20260913-0048 من مستحق الإيجار',
      'settlement', v_yer_inv1_id, 'draft', v_user_id
    ) RETURNING id INTO v_yer_je_id;

    -- Debit Rent Payable 240002 (تخفيض التزام الإيجار باليمني 15,000 ريال يمني)
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, party_id, description,
      debit_amount, credit_amount, currency_code, exchange_rate, foreign_amount,
      company_id, branch_id
    ) VALUES (
      v_yer_je_id, v_rent_yer_acc_id, v_party_id,
      'تسوية سحبيات مبيعات (أصابع بطارية ولحام) خصماً من مستحق الإيجار',
      ROUND((15000.0 / 410.0), 4), 0.0000, 'YER', 410.0, 15000.00,
      v_company_id, v_branch_id
    );

    -- Credit Accounts Receivable 1100 (إغلاق ذمة الفواتير 15,000 ريال يمني)
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, party_id, description,
      debit_amount, credit_amount, currency_code, exchange_rate, foreign_amount,
      company_id, branch_id
    ) VALUES (
      v_yer_je_id, v_ar_account_id, v_party_id,
      'سداد فواتير مبيعات INV-20260913-0046 و INV-20260913-0048 بالمقاصة من مستحق الإيجار',
      0.0000, ROUND((15000.0 / 410.0), 4), 'YER', 410.0, 15000.00,
      v_company_id, v_branch_id
    );

    -- Post the journal entry
    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_yer_je_id;

    -- Update both YER invoices to paid
    UPDATE public.invoices 
    SET paid_amount = 12000.0000, status = 'paid', updated_at = NOW()
    WHERE id = v_yer_inv1_id;

    UPDATE public.invoices 
    SET paid_amount = 3000.0000, status = 'paid', updated_at = NOW()
    WHERE id = v_yer_inv2_id;
  END IF;

  -- 3) Update expense category "يسلم صاحب اليجار" to map directly to 240001
  UPDATE public.expense_categories
  SET account_id = v_rent_sar_acc_id
  WHERE id = 'adf1105d-310c-4532-80ac-1cd156a0c952'
    AND company_id = v_company_id;

END $$;
