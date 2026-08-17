-- ============================================================
-- Migration: Restore dashboard RPCs dropped prematurely
-- Date: 2026-08-17
--
-- 20260816000003_drop_legacy_overloads.sql dropped
--   get_dashboard_summary / get_sales_chart_data /
--   get_top_products_and_customers  believing they were legacy
--   overloads unused by the frontend. This is NOT the case:
--   dashboard/api/index.ts (fetchRawDashboardData) still calls
--   them with EXACTLY these signatures, causing repeated
--   HTTP 404 + DB_ERROR_SILENT in production.
--
-- This migration restores them with safe, SECURITY DEFINER
-- implementations backed by the existing tables.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. get_dashboard_summary
--    Frontend contract (dashboard/api/index.ts SummaryRow):
--    total_sales, total_purchases, total_expenses,
--    receipt_bonds, payment_bonds, total_debts,
--    total_supplier_debts, invoice_count
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL,
    p_date_from date DEFAULT NULL,
    p_date_to date DEFAULT NULL
)
RETURNS TABLE (
    total_sales numeric,
    total_purchases numeric,
    total_expenses numeric,
    receipt_bonds numeric,
    payment_bonds numeric,
    total_debts numeric,
    total_supplier_debts numeric,
    invoice_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sales numeric := 0;
    v_purchases numeric := 0;
    v_expenses numeric := 0;
    v_receipt numeric := 0;
    v_payment numeric := 0;
    v_debts numeric := 0;
    v_supplier_debts numeric := 0;
    v_inv_count bigint := 0;
BEGIN
    -- Sales / Purchases / Invoice count in period (base totals)
    SELECT
        COALESCE(SUM(CASE WHEN i.type = 'sale' THEN i.total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN i.type = 'purchase' THEN i.total_amount ELSE 0 END), 0),
        COUNT(*)::bigint
    INTO v_sales, v_purchases, v_inv_count
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.deleted_at IS NULL
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
      AND (p_date_to   IS NULL OR i.issue_date <= p_date_to)
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id);

    -- Expenses in period (converted to base currency)
    SELECT COALESCE(SUM(
        CASE WHEN e.exchange_operator = 'divide' AND e.exchange_rate > 0
             THEN e.amount / e.exchange_rate
             ELSE e.amount * COALESCE(e.exchange_rate, 1)
        END
    ), 0)
    INTO v_expenses
    FROM public.expenses e
    WHERE e.company_id = p_company_id
      AND e.status <> 'void'
      AND e.deleted_at IS NULL
      AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
-- Bonds (receipts / payments) in period
    SELECT COALESCE(SUM(p.amount), 0)
    INTO v_receipt
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND p.type = 'receipt'
      AND p.status <> 'void'
      AND p.deleted_at IS NULL
      AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
      AND (p_date_to   IS NULL OR p.payment_date <= p_date_to)
      AND (p_branch_id IS NULL OR p.branch_id = p_branch_id);

    SELECT COALESCE(SUM(p.amount), 0)
    INTO v_payment
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND p.type = 'payment'
      AND p.status <> 'void'
      AND p.deleted_at IS NULL
      AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
      AND (p_date_to   IS NULL OR p.payment_date <= p_date_to)
      AND (p_branch_id IS NULL OR p.branch_id = p_branch_id);

    -- Outstanding customer / supplier debts (posted & partially paid)
    SELECT COALESCE(SUM(i.total_amount - COALESCE(paid.paid, 0)), 0)
    INTO v_debts
    FROM public.invoices i
    LEFT JOIN LATERAL (
        SELECT SUM(pa.amount) AS paid
        FROM public.payment_allocations pa
        WHERE pa.invoice_id = i.id
    ) paid ON true
    WHERE i.company_id = p_company_id
      AND i.type = 'sale'
      AND i.deleted_at IS NULL
      AND i.status IN ('posted', 'partially_paid');

    SELECT COALESCE(SUM(i.total_amount - COALESCE(paid.paid, 0)), 0)
    INTO v_supplier_debts
    FROM public.invoices i
    LEFT JOIN LATERAL (
        SELECT SUM(pa.amount) AS paid
        FROM public.payment_allocations pa
        WHERE pa.invoice_id = i.id
    ) paid ON true
    WHERE i.company_id = p_company_id
      AND i.type = 'purchase'
      AND i.deleted_at IS NULL
      AND i.status IN ('posted', 'partially_paid');

    RETURN QUERY
    SELECT v_sales, v_purchases, v_expenses, v_receipt, v_payment,
           v_debts, v_supplier_debts, v_inv_count;
END;

-- ─────────────────────────────────────────────────────────────
-- 2. get_sales_chart_data
--    Frontend contract: daily rows { name, sales, purchases, expenses }
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_sales_chart_data(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL,
    p_date_from date DEFAULT NULL,
    p_date_to date DEFAULT NULL
)
RETURNS TABLE (
    name date,
    sales numeric,
    purchases numeric,
    expenses numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        day.name,
        COALESCE((
            SELECT SUM(i.total_amount)
            FROM public.invoices i
            WHERE i.company_id = p_company_id AND i.type = 'sale'
              AND i.deleted_at IS NULL AND i.status IN ('posted', 'paid', 'partially_paid')
              AND i.issue_date = day.name
              AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
        ), 0) AS sales,
        COALESCE((
            SELECT SUM(i.total_amount)
            FROM public.invoices i
            WHERE i.company_id = p_company_id AND i.type = 'purchase'
              AND i.deleted_at IS NULL AND i.status IN ('posted', 'paid', 'partially_paid')
              AND i.issue_date = day.name
              AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
        ), 0) AS purchases,
        COALESCE((
            SELECT SUM(e.amount * COALESCE(e.exchange_rate, 1))
            FROM public.expenses e
            WHERE e.company_id = p_company_id AND e.status <> 'void' AND e.deleted_at IS NULL
              AND e.expense_date = day.name
              AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
        ), 0) AS expenses
    FROM generate_series(
        COALESCE(p_date_from, (SELECT MIN(issue_date) FROM public.invoices WHERE company_id = p_company_id AND deleted_at IS NULL)),
        COALESCE(p_date_to, CURRENT_DATE),
        '1 day'::interval
    ) AS day(name)
$$;

COMMENT ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) IS

-- ─────────────────────────────────────────────────────────────
-- 3. get_top_products_and_customers
--    Frontend contract: single row { top_products: jsonb, top_customers: jsonb }
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_top_products_and_customers(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 5
)
RETURNS TABLE (
    top_products jsonb,
    top_customers jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COALESCE((
            SELECT jsonb_agg(item ORDER BY (item->>'revenue')::numeric DESC)
            FROM (
                SELECT jsonb_build_object(
                    'id', p.id,
                    'name_ar', p.name_ar,
                    'sku', p.sku,
                    'revenue', SUM(ii.total)::numeric
                ) AS item
                FROM public.invoice_items ii
                JOIN public.invoices i ON i.id = ii.invoice_id
                JOIN public.products p ON p.id = ii.product_id
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.deleted_at IS NULL
                  AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
                GROUP BY p.id, p.name_ar, p.sku
                ORDER BY SUM(ii.total) DESC
                LIMIT p_limit
            ) sub
        ), '[]'::jsonb) AS top_products,
        COALESCE((
            SELECT jsonb_agg(item ORDER BY (item->>'total')::numeric DESC)
            FROM (
                SELECT jsonb_build_object(
                    'id', pr.id,
                    'name', pr.name,
                    'total', SUM(i.total_amount)::numeric,
                    'invoices', COUNT(*)::int
                ) AS item
                FROM public.invoices i
                JOIN public.parties pr ON pr.id = i.party_id
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.deleted_at IS NULL AND i.party_id IS NOT NULL
                  AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
                GROUP BY pr.id, pr.name
                ORDER BY SUM(i.total_amount) DESC
                LIMIT p_limit
            ) sub
        ), '[]'::jsonb) AS top_customers
$$;

COMMENT ON FUNCTION public.get_top_products_and_customers(uuid, uuid, integer) IS
'Dashboard top products & customers (restored).' ;

GRANT EXECUTE ON FUNCTION public.get_top_products_and_customers(uuid, uuid, integer) TO authenticated;
'Dashboard sales/purchases/expenses chart series (restored).' ;

GRANT EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) TO authenticated;
$$;

COMMENT ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) IS
'Dashboard summary (restored) — returns period totals for the dashboard header.' ;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated;
      AND (p_date_to   IS NULL OR e.expense_date <= p_date_to)
      AND (p_branch_id IS NULL OR e.branch_id = p_branch_id);
