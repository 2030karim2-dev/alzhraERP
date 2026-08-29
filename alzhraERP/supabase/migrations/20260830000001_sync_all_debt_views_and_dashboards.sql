-- ============================================================
-- Migration: 20260830000001_sync_all_debt_views_and_dashboards.sql
-- Description: Unify customer and supplier debt balances across
-- party_balances view, get_dashboard_summary RPC, and accounting.
-- ============================================================

-- 1. Drop duplicate get_dashboard_summary overload
DROP FUNCTION IF EXISTS public.get_dashboard_summary(uuid, uuid);

-- 2. Update party_balances view to include opening balances
CREATE OR REPLACE VIEW public.party_balances AS
WITH journal_bals AS (
    SELECT 
        jel.party_id,
        jel.company_id,
        SUM(
            CASE
                WHEN a.code LIKE '1100%' THEN jel.debit_amount - jel.credit_amount
                WHEN a.code LIKE '2100%' THEN jel.credit_amount - jel.debit_amount
                ELSE jel.debit_amount - jel.credit_amount
            END
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
            CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END
            * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
                WHERE er.company_id = ob.company_id AND er.currency_code = ob.currency_code
                ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
        ) AS opening_balance
    FROM public.party_opening_balances ob
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

-- 3. Update get_dashboard_summary to include opening debts
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE vc uuid;
DECLARE v_opening_cust_debts NUMERIC;
DECLARE v_opening_supp_debts NUMERIC;
BEGIN
  vc := public.verify_company_access(p_company_id);

  SELECT COALESCE(SUM(
      CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END
      * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
          WHERE er.company_id = vc AND er.currency_code = ob.currency_code
          ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
  ), 0) INTO v_opening_cust_debts
  FROM public.party_opening_balances ob
  JOIN public.parties p ON p.id = ob.party_id AND p.type = 'customer' AND p.deleted_at IS NULL
  WHERE ob.company_id = vc;

  SELECT COALESCE(SUM(
      CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE -ob.amount END
      * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
          WHERE er.company_id = vc AND er.currency_code = ob.currency_code
          ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
  ), 0) INTO v_opening_supp_debts
  FROM public.party_opening_balances ob
  JOIN public.parties p ON p.id = ob.party_id AND p.type = 'supplier' AND p.deleted_at IS NULL
  WHERE ob.company_id = vc;

  RETURN (SELECT jsonb_build_object(
    'total_sales', COALESCE((SELECT SUM(total_amount) FROM public.invoices
        WHERE company_id=vc AND type='sale'
          AND status IN ('posted','paid','partial','partially_paid')
          AND deleted_at IS NULL
          AND (p_date_from IS NULL OR issue_date >= p_date_from)
          AND (p_date_to IS NULL OR issue_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'total_purchases', COALESCE((SELECT SUM(total_amount) FROM public.invoices
        WHERE company_id=vc AND type='purchase'
          AND status IN ('posted','paid','partial','partially_paid')
          AND deleted_at IS NULL
          AND (p_date_from IS NULL OR issue_date >= p_date_from)
          AND (p_date_to IS NULL OR issue_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'total_expenses', COALESCE((SELECT SUM(amount) FROM public.expenses
        WHERE company_id=vc AND status IN ('posted','paid') AND deleted_at IS NULL
          AND (p_date_from IS NULL OR expense_date >= p_date_from)
          AND (p_date_to IS NULL OR expense_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'receipt_bonds', COALESCE((SELECT SUM(amount) FROM public.payments
        WHERE company_id=vc AND type='receipt' AND status='posted' AND deleted_at IS NULL
          AND (p_date_from IS NULL OR payment_date >= p_date_from)
          AND (p_date_to IS NULL OR payment_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'payment_bonds', COALESCE((SELECT SUM(amount) FROM public.payments
        WHERE company_id=vc AND type='disbursement' AND status='posted' AND deleted_at IS NULL
          AND (p_date_from IS NULL OR payment_date >= p_date_from)
          AND (p_date_to IS NULL OR payment_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'total_debts', (COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
        FROM public.invoices i
        WHERE i.company_id=vc AND i.type='sale'
          AND i.status IN ('posted','partial','partially_paid')
          AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_cust_debts),
    'total_supplier_debts', (COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
        FROM public.invoices i
        WHERE i.company_id=vc AND i.type='purchase'
          AND i.status IN ('posted','partial','partially_paid')
          AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_supp_debts),
    'invoice_count', (SELECT COUNT(*) FROM public.invoices
        WHERE company_id=vc AND type='sale'
          AND status NOT IN ('draft','void')
          AND deleted_at IS NULL
          AND (p_date_from IS NULL OR issue_date >= p_date_from)
          AND (p_date_to IS NULL OR issue_date <= p_date_to)
          AND (p_branch_id IS NULL OR branch_id = p_branch_id))
  ));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated, service_role;
