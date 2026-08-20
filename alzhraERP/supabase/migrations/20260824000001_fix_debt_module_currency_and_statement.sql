-- ============================================================
-- Migration: Debt & Collection module — currency conversion (F13)
--            + opening balances in party statement (F11)
-- Date: 2026-08-24
-- ============================================================
-- F13 — Multi-currency totals were summed RAW across currencies
-- (SAR + USD + …). The system's conversion convention is MULTIPLY
-- (`amount * exchange_rate`; see toBaseCurrency / getCurrencyDiffs),
-- so:
--   * invoice-based totals   → × invoices.exchange_rate (transaction rate)
--   * opening balances       → × latest exchange_rates.rate_to_base
--   * promise amounts        → × latest exchange_rates.rate_to_base
-- The per-currency breakdown (`by_currency`) is unchanged and remains
-- the authoritative multi-currency view.
--
-- F11 — party_opening_balances were NOT visible in the party statement
-- (get_party_statement), so statements disagreed with the debts module.
-- A synthetic «رصيد افتتاحي» row is now prepended (before any journal
-- movement) so the running balance starts from the opening balance and
-- reconciles with the debts dashboard.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) get_debt_analytics_summary — base-currency conversion
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_debt_analytics_summary(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
DECLARE v_result JSON;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    SELECT json_build_object(
        'total_receivables',
            COALESCE((SELECT SUM((i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partially_paid') AND i.deleted_at IS NULL
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'overdue_receivables',
            COALESCE((SELECT SUM((i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partially_paid') AND i.deleted_at IS NULL
                  AND i.due_date < v_today
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'due_today',
            COALESCE((SELECT SUM((i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partially_paid') AND i.deleted_at IS NULL
                  AND i.due_date = v_today
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'opening_balances_total',
            COALESCE((SELECT SUM(
                    CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END
                    * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
                        WHERE er.company_id = p_company_id AND er.currency_code = ob.currency_code
                        ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
                )
                FROM public.party_opening_balances ob
                WHERE ob.company_id = p_company_id), 0)::NUMERIC,
        'pending_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'pending'), 0),
        'pending_promises_amount',
            COALESCE((SELECT SUM(pp.amount
                    * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
                        WHERE er.company_id = p_company_id AND er.currency_code = pp.currency_code
                        ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1))
                FROM public.debt_payment_promises pp
                WHERE pp.company_id = p_company_id AND pp.status = 'pending'), 0)::NUMERIC,
        'broken_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'broken'), 0),
        'broken_promises_amount',
            COALESCE((SELECT SUM(pp.amount
                    * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
                        WHERE er.company_id = p_company_id AND er.currency_code = pp.currency_code
                        ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1))
                FROM public.debt_payment_promises pp
                WHERE pp.company_id = p_company_id AND pp.status = 'broken'), 0)::NUMERIC,
        'sent_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'sent'), 0),
        'failed_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'), 0),
        'failed_messages_24h',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'
                  AND created_at >= NOW() - INTERVAL '24 hours'), 0),
        'total_debtors',
            COALESCE((SELECT COUNT(*)::INT
                FROM public.get_debt_followup_dashboard(p_company_id)), 0),
        'needs_reminder',
            COALESCE((SELECT COUNT(*)::INT
                FROM public.get_debt_followup_dashboard(p_company_id)
                WHERE reminder_status = 'needs_reminder'), 0),
        'by_currency',
            (SELECT json_agg(json_build_object(
                'currency', x.currency_code,
                'balance', x.balance,
                'count', x.transaction_count))
             FROM public.party_balances_by_currency x
             WHERE x.company_id = p_company_id AND x.balance > 0)
    ) INTO v_result;
    RETURN v_result;
END;
$function$;


-- ─────────────────────────────────────────────────────────────
-- 2) report_debt_aging — base-currency conversion
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.report_debt_aging(p_company_id uuid)
 RETURNS TABLE(customer_name text, total numeric, days_0_30 numeric, days_31_60 numeric, days_61_90 numeric, days_90_plus numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  RETURN QUERY
  SELECT
    COALESCE(pr.name, 'نقدي') as customer_name,
    SUM((i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1)) as total,
    SUM(CASE WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN (i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1) ELSE 0 END) as days_0_30,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '31 days' THEN (i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1) ELSE 0 END) as days_31_60,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE - INTERVAL '61 days' THEN (i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1) ELSE 0 END) as days_61_90,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN (i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1) ELSE 0 END) as days_90_plus
  FROM public.invoices i
  LEFT JOIN public.parties pr ON pr.id = i.party_id
  WHERE i.company_id = p_company_id
    AND i.type = 'sale'
    AND i.status IN ('posted', 'partially_paid')
    AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    AND i.deleted_at IS NULL
  GROUP BY pr.id, pr.name
  ORDER BY total DESC;
END;
$function$;


-- ─────────────────────────────────────────────────────────────
-- 3) report_debts — base-currency conversion
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.report_debts(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_receivables numeric := 0;
  v_payables numeric := 0;
  v_debts json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  WITH party_balances AS (
    SELECT
      p.id,
      p.name,
      p.type,
      SUM(CASE
        WHEN i.type IN ('sale', 'purchase_return') THEN (i.total_amount - i.paid_amount) * COALESCE(i.exchange_rate, 1)
        WHEN i.type IN ('purchase', 'sale_return') THEN -(i.total_amount - i.paid_amount) * COALESCE(i.exchange_rate, 1)
        ELSE 0
      END) as remaining_amount
    FROM parties p
    JOIN invoices i ON p.id = i.party_id
    WHERE i.company_id = p_company_id
      AND i.status IN ('confirmed','posted','partially_paid')
      AND i.deleted_at IS NULL
      AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.type
    HAVING ABS(SUM(
      CASE
        WHEN i.type IN ('sale', 'purchase_return') THEN (i.total_amount - i.paid_amount) * COALESCE(i.exchange_rate, 1)
        WHEN i.type IN ('purchase', 'sale_return') THEN -(i.total_amount - i.paid_amount) * COALESCE(i.exchange_rate, 1)
        ELSE 0
      END
    )) > 0.01
  )
  SELECT
    COALESCE(SUM(remaining_amount) FILTER (WHERE type IN ('customer', 'both') AND remaining_amount > 0), 0),
    COALESCE(SUM(ABS(remaining_amount)) FILTER (WHERE type IN ('supplier', 'both') AND remaining_amount < 0), 0),
    COALESCE(json_agg(row_to_json(pb)), '[]'::json)
  INTO v_receivables, v_payables, v_debts
  FROM party_balances pb;

  RETURN json_build_object(
    'summary', json_build_object(
      'receivables', v_receivables,
      'payables', v_payables
    ),
    'debts', v_debts
  );
END;
$function$;


-- ─────────────────────────────────────────────────────────────
-- 4) get_party_statement — prepend opening-balance rows (F11)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_party_statement(p_company_id uuid, p_party_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_movements json;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.line_id), '[]'::json)
  INTO v_movements
  FROM (
    SELECT sub.line_id, sub.entry_date, sub.ref, sub.operation_type, sub.description, sub.type,
           sub.debit, sub.credit, sub.currency,
           SUM(sub.debit - sub.credit) OVER (ORDER BY sub.entry_date, sub.line_id ROWS UNBOUNDED PRECEDING) AS balance
    FROM (
      -- Opening balances (legacy debts) FIRST so the running balance starts
      -- from the opening balance and reconciles with the debts module.
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
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      JOIN accounts a ON a.id = jel.account_id
      WHERE je.company_id = p_company_id AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
        AND jel.party_id = p_party_id AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
    ) sub
  ) t;

  RETURN v_movements;
END;
$function$;


-- ─────────────────────────────────────────────────────────────
-- 5) Defensive privilege re-assertion (CREATE OR REPLACE keeps the
--    ACL, but re-asserting follows the established hardening pattern).
-- ─────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_debt_aging(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_debt_aging(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_debt_aging(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_debts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.report_debts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_debts(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_party_statement(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_party_statement(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_party_statement(uuid,uuid) TO authenticated;

