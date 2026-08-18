-- ============================================================
-- Migration: Restore missing get_dashboard_summary 4-arg overload
-- Date: 2026-08-17 (applied to production via Management API)
--
-- HISTORY
-- --------
-- 20260816000003_drop_legacy_overloads.sql dropped what it believed was a
-- legacy 4-arg `get_dashboard_summary`. That overload was NOT legacy: the
-- frontend (dashboard/api/index.ts fetchRawDashboardData) calls
--   rpc('get_dashboard_summary', { p_company_id, p_date_from, p_date_to, p_branch_id })
-- so production returned HTTP 404 (PGRST202) + DB_ERROR_SILENT on every
-- dashboard load.
--
-- The live DB only had a 2-arg `get_dashboard_summary(p_company_id, p_branch_id)`
-- that (a) does not accept the date args the frontend sends and (b) references
-- a non-existent `parties.balance` column (it was broken too). The secure
-- 4-arg overload below replaces it as the canonical entry point.
--
-- SECURITY NOTE
-- -------------
-- This function is SECURITY DEFINER and MUST keep the `verify_company_access()`
-- guard (the same gate the sibling 2-arg function uses). Without it, any
-- authenticated user could pass an arbitrary company_id and read another
-- tenant's financial summary. Do NOT "simplify" this into a plain table-return
-- function without the access check.
--
-- DEBTS NOTE
-- ----------
-- Customer/supplier debts are computed from `invoices.total_amount - paid_amount`
-- for open statuses, mirroring the canonical `get_debt_analytics_summary()`.
-- The `parties` table has no `balance` column and `party_balances` is a
-- recalculated cache.
-- ============================================================

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
BEGIN
  vc := public.verify_company_access(p_company_id);
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
    'total_debts', COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
        FROM public.invoices i
        WHERE i.company_id=vc AND i.type='sale'
          AND i.status IN ('posted','partial')
          AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0),
    'total_supplier_debts', COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
        FROM public.invoices i
        WHERE i.company_id=vc AND i.type='purchase'
          AND i.status IN ('posted','partial')
          AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0),
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

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated;
