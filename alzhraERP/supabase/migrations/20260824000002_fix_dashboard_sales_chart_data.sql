-- ============================================================
-- Migration: get_sales_chart_data — multi-series daily flow
-- Date: 2026-08-21
-- ============================================================
--
-- Problem:
--   The dashboard card "تحليل تدفق المبيعات (قطع الغيار)" renders
--   four series (المبيعات / الأرباح / المشتريات / المصروفات) and a
--   growth badge, but the RPC returned ONLY daily sales
--   ({name, value, date}). Profit, purchases and expenses were always
--   0, so the chart looked broken and the badge stuck at 0.0%.
--
-- Fix:
--   1. Return per-day sales, purchases, expenses and profit so the
--      multi-series chart and its summary are fully powered.
--   2. Align the invoice-status filter with get_dashboard_summary
--      (include 'partial') so the chart never contradicts the totals.
--   3. Respect soft-deletes (deleted_at IS NULL) — previously missing.
--   4. Sales/purchases are net of returns, matching the legacy
--      client-side calculation in services/dashboardStats.ts.
--
-- Privileges: CREATE OR REPLACE preserves grants; re-asserted below
-- to guarantee authenticated-only EXECUTE after the redefinition.
--
-- NOTE (PostgreSQL 42P13): an existing function's OUT row type cannot be
-- changed via CREATE OR REPLACE, so we DROP the old overload first and
-- recreate it inside a transaction (safe to run on fresh DBs too).

BEGIN;

DROP FUNCTION IF EXISTS public.get_sales_chart_data(uuid, uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_sales_chart_data(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date
)
 RETURNS TABLE(
     name text,
     date date,
     value numeric,
     sales numeric,
     purchases numeric,
     expenses numeric,
     profit numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_from date := COALESCE(p_date_from, (CURRENT_DATE - INTERVAL '30 days'));
    v_to date := COALESCE(p_date_to, CURRENT_DATE);
    v_day date;
    v_sales numeric;
    v_purchases numeric;
    v_expenses numeric;
BEGIN
    v_day := v_from;
    WHILE v_day <= v_to LOOP
        name := to_char(v_day, 'YYYY-MM-DD');
        date := v_day;

        -- Daily net sales / net purchases (returns subtracted),
        -- normalized to base currency like get_dashboard_summary.
        SELECT
            COALESCE(SUM(CASE
                WHEN i.type = 'sale' THEN i.amount
                WHEN i.type = 'sale_return' THEN -i.amount
                ELSE 0 END), 0),
            COALESCE(SUM(CASE
                WHEN i.type = 'purchase' THEN i.amount
                WHEN i.type = 'purchase_return' THEN -i.amount
                ELSE 0 END), 0)
        INTO v_sales, v_purchases
        FROM (
            SELECT
                i.type,
                CASE
                    WHEN i.currency_code <> 'SAR' AND i.exchange_rate > 0
                        THEN i.total_amount * i.exchange_rate
                    ELSE i.total_amount
                END AS amount
            FROM public.invoices i
            WHERE i.company_id = p_company_id
              AND i.status IN ('posted', 'paid', 'partial', 'partially_paid')
              AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
              AND i.issue_date = v_day
              AND i.deleted_at IS NULL
        ) i;

        -- Daily expenses (normalized to base currency).
        SELECT COALESCE(SUM(
            CASE
                WHEN e.currency_code <> 'SAR' AND e.exchange_rate > 0
                    THEN e.amount * e.exchange_rate
                ELSE e.amount
            END
        ), 0)
        INTO v_expenses
        FROM public.expenses e
        WHERE e.company_id = p_company_id
          AND e.status IN ('posted', 'paid')
          AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
          AND e.expense_date = v_day
          AND e.deleted_at IS NULL;

        value := v_sales;
        sales := v_sales;
        purchases := GREATEST(v_purchases, 0);
        expenses := GREATEST(v_expenses, 0);
        profit := v_sales - v_purchases - v_expenses;

        RETURN NEXT;
        v_day := v_day + INTERVAL '1 day';
    END LOOP;
END;
$function$;

-- Re-assert execution privileges (authenticated only).
REVOKE EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) TO authenticated;

COMMIT;
