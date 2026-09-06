-- ============================================================
-- Migration: 20260906000003_fix_supplier_balances_and_multi_currency_statements.sql
-- Description: 
--   1. Fix party_balances_by_currency view so supplier (2100) balances
--      are credit - debit (positive balance = payable/owed to supplier).
--   2. Fix party_balances view so multi-currency journal balances are
--      converted to company base currency using exchange_rates, avoiding
--      direct addition of different currencies (e.g. SAR + YER).
--   3. Fix get_party_statement RPC so running balance aligns with party type
--      (customer: debit - credit, supplier: credit - debit) and partitions
--      by currency code so running balances do not blend separate currencies.
-- ============================================================

-- 1. Correct party_balances_by_currency with exact numeric(14,2) cast
CREATE OR REPLACE VIEW public.party_balances_by_currency AS
SELECT jel.party_id,
    jel.company_id,
    jel.currency_code,
    sum(
      CASE
        WHEN a.code LIKE '1100%' THEN COALESCE(jel.debit_amount, 0::numeric) - COALESCE(jel.credit_amount, 0::numeric)
        WHEN a.code LIKE '2100%' THEN COALESCE(jel.credit_amount, 0::numeric) - COALESCE(jel.debit_amount, 0::numeric)
        ELSE COALESCE(jel.debit_amount, 0::numeric) - COALESCE(jel.credit_amount, 0::numeric)
      END
    )::numeric(14,2) AS balance,
    count(DISTINCT jel.journal_entry_id)::integer AS transaction_count,
    max(je.entry_date)::date AS last_activity_date
   FROM public.journal_entry_lines jel
     JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.deleted_at IS NULL AND je.status = 'posted'::text
     JOIN public.accounts a ON a.id = jel.account_id
  WHERE jel.deleted_at IS NULL
    AND jel.party_id IS NOT NULL
    AND jel.currency_code IS NOT NULL
    AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
  GROUP BY jel.party_id, jel.company_id, jel.currency_code;

ALTER VIEW public.party_balances_by_currency SET (security_invoker = true);

-- 2. Correct party_balances view with currency conversion
CREATE OR REPLACE VIEW public.party_balances AS
WITH journal_bals AS (
    SELECT 
        jel.party_id,
        jel.company_id,
        SUM(
            (CASE
                WHEN a.code LIKE '1100%' THEN jel.debit_amount - jel.credit_amount
                WHEN a.code LIKE '2100%' THEN jel.credit_amount - jel.debit_amount
                ELSE jel.debit_amount - jel.credit_amount
            END)
            * COALESCE(
                CASE WHEN jel.exchange_rate > 0 AND jel.exchange_rate != 1 THEN jel.exchange_rate ELSE NULL END,
                (SELECT er.rate_to_base FROM public.exchange_rates er
                 WHERE er.company_id = jel.company_id AND er.currency_code = jel.currency_code
                 ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1),
                1
            )
        ) AS journal_balance
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted' AND je.deleted_at IS NULL
    JOIN public.accounts a ON a.id = jel.account_id
    WHERE jel.deleted_at IS NULL AND (a.code LIKE '1100%' OR a.code LIKE '2100%') AND jel.party_id IS NOT NULL
    GROUP BY jel.party_id, jel.company_id
),
opening_bals AS (
    SELECT 
        ob.party_id,
        ob.company_id,
        SUM(
            (CASE 
                WHEN p.type = 'supplier' THEN (CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE -ob.amount END)
                ELSE (CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
            END)
            * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
                WHERE er.company_id = ob.company_id AND er.currency_code = ob.currency_code
                ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
        ) AS opening_balance
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id
    GROUP BY ob.party_id, ob.company_id
)
SELECT 
    p.id AS party_id,
    p.company_id,
    p.type,
    (COALESCE(jb.journal_balance, 0) + COALESCE(ob.opening_balance, 0))::NUMERIC(14,2) AS balance
FROM public.parties p
LEFT JOIN journal_bals jb ON jb.party_id = p.id AND jb.company_id = p.company_id
LEFT JOIN opening_bals ob ON ob.party_id = p.id AND ob.company_id = p.company_id
WHERE p.deleted_at IS NULL;

ALTER VIEW public.party_balances SET (security_invoker = true);

-- 3. Correct get_party_statement RPC
CREATE OR REPLACE FUNCTION public.get_party_statement(p_company_id uuid, p_party_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_movements json;
  v_party_type text;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  SELECT type INTO v_party_type
  FROM public.parties
  WHERE id = p_party_id AND company_id = p_company_id;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.line_id), '[]'::json)
  INTO v_movements
  FROM (
    SELECT sub.line_id, sub.entry_date, sub.ref, sub.operation_type, sub.description, sub.type,
           sub.debit, sub.credit, sub.currency,
           SUM(
             CASE 
               WHEN v_party_type = 'supplier' THEN sub.credit - sub.debit
               ELSE sub.debit - sub.credit
             END
           ) OVER (
             PARTITION BY sub.currency 
             ORDER BY sub.entry_date, sub.line_id 
             ROWS UNBOUNDED PRECEDING
           ) AS balance
    FROM (
      -- Opening balances
      SELECT ob.id::text AS line_id,
             ob.entry_date,
             'OB' AS ref,
             'رصيد افتتاحي' AS operation_type,
             COALESCE(ob.notes, 'رصيد افتتاحي') AS description,
             'opening_balance' AS type,
             CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE 0 END AS debit,
             CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE 0 END AS credit,
             ob.currency_code AS currency
      FROM public.party_opening_balances ob
      WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id

      UNION ALL

      SELECT jel.id::text AS line_id, je.entry_date,
        CASE WHEN je.reference_type IN ('sales_invoice','invoice') THEN 'INV'
          WHEN je.reference_type = 'purchase_invoice' THEN 'PUR'
          WHEN je.reference_type IN ('payment','payment_bond') THEN 'PAY'
          WHEN je.reference_type IN ('receipt','receipt_bond') THEN 'RCV'
          WHEN je.reference_type IN ('sale_return','sales_return','return_sale') THEN 'RET'
          WHEN je.reference_type IN ('purchase_return','return_purchase') THEN 'PRET'
          WHEN je.reference_type = 'expense' THEN 'EXP'
          ELSE COALESCE('JV-' || je.entry_number::text, 'JV') END AS ref,
        CASE WHEN je.reference_type IN ('sales_invoice','invoice') THEN 'فاتورة مبيعات'
          WHEN je.reference_type = 'purchase_invoice' THEN 'فاتورة مشتريات'
          WHEN je.reference_type IN ('payment','payment_bond') THEN 'سند دفع'
          WHEN je.reference_type IN ('receipt','receipt_bond') THEN 'سند قبض'
          WHEN je.reference_type IN ('sale_return','sales_return','return_sale') THEN 'مرتجع مبيعات'
          WHEN je.reference_type IN ('purchase_return','return_purchase') THEN 'مرتجع مشتريات'
          WHEN je.reference_type = 'expense' THEN 'صرف مصروف' ELSE 'قيد محاسبي' END AS operation_type,
        COALESCE(jel.description, je.description, 'حركة محاسبية') AS description,
        je.reference_type AS type, COALESCE(jel.debit_amount,0) AS debit, COALESCE(jel.credit_amount,0) AS credit,
        jel.currency_code AS currency
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      JOIN public.accounts a ON a.id = jel.account_id
      WHERE je.company_id = p_company_id AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
        AND jel.party_id = p_party_id AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
    ) sub
  ) t;

  RETURN v_movements;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_party_statement(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_party_statement(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_party_statement(uuid,uuid) TO authenticated;
