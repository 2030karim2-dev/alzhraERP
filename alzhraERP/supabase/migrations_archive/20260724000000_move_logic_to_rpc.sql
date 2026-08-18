-- ============================================================
-- Migration: Move Frontend Business Logic to PostgreSQL RPCs
-- Date: 2026-07-24
-- ============================================================
-- This migration moves three heavy computations from the React
-- frontend into Postgres RPC functions, following the
-- "Thick Database" architecture already in use for dashboard,
-- sales, purchases, and accounting.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. get_low_stock_products
--    Replaces: computeLowStockProducts() in dashboard/hooks/index.ts
--    Purpose: Return products where stock <= min_stock_level
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_low_stock_products(
    p_company_id UUID,
    p_branch_id  UUID DEFAULT NULL
)
RETURNS TABLE (
    id           UUID,
    name_ar      TEXT,
    quantity     NUMERIC,
    min_quantity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name_ar,
        COALESCE(SUM(ps.quantity), 0)                        AS quantity,
        COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5)   AS min_quantity
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
        AND (p_branch_id IS NULL OR ps.warehouse_id IN (
            SELECT id FROM warehouses WHERE branch_id = p_branch_id
        ))
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
    GROUP BY p.id, p.name_ar, p.min_stock_level
    HAVING COALESCE(SUM(ps.quantity), 0) <= COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5)
    ORDER BY quantity ASC
    LIMIT 50;
END;
$$;

COMMENT ON FUNCTION get_low_stock_products(UUID, UUID) IS
'Returns products whose current stock is at or below their minimum stock level.
Replaces the JS computeLowStockProducts() helper in the React frontend.';

GRANT EXECUTE ON FUNCTION get_low_stock_products(UUID, UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 2. get_expense_categories_summary
--    Replaces: computeCategoryData() in dashboard/hooks/index.ts
--    Purpose: Return expense totals grouped by category
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_expense_categories_summary(
    p_company_id UUID,
    p_date_from  DATE DEFAULT NULL,
    p_date_to    DATE DEFAULT NULL,
    p_branch_id  UUID DEFAULT NULL
)
RETURNS TABLE (
    category_name TEXT,
    total_amount  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ec.name, 'غير مصنف') AS category_name,
        SUM(
            CASE
                WHEN e.exchange_operator = 'divide' AND e.exchange_rate > 0
                    THEN e.amount / e.exchange_rate
                ELSE e.amount * COALESCE(e.exchange_rate, 1)
            END
        )::NUMERIC AS total_amount
    FROM expenses e
    LEFT JOIN expense_categories ec ON ec.id = e.category_id
    WHERE e.company_id = p_company_id
      AND e.status <> 'void'
      AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
      AND (p_date_to   IS NULL OR e.expense_date <= p_date_to)
      AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
    GROUP BY ec.name
    ORDER BY total_amount DESC
    LIMIT 10;
END;
$$;

COMMENT ON FUNCTION get_expense_categories_summary(UUID, DATE, DATE, UUID) IS
'Returns expense totals grouped by category for the given period.
Replaces the JS computeCategoryData() helper in the React frontend.
All amounts are returned in base currency (SAR equivalent).';

GRANT EXECUTE ON FUNCTION get_expense_categories_summary(UUID, DATE, DATE, UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 3. get_monthly_performance
--    Replaces: getMonthlyPerformance() JS aggregation in
--              accounting/services/reportService.ts
--    Purpose: Return monthly revenues and expenses for a year
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_monthly_performance(
    p_company_id UUID,
    p_year       INT,
    p_branch_id  UUID DEFAULT NULL
)
RETURNS TABLE (
    month_index INT,
    month_name  TEXT,
    revenues    NUMERIC,
    expenses    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start DATE := make_date(p_year, 1, 1);
    v_end   DATE := make_date(p_year, 12, 31);
BEGIN
    RETURN QUERY
    WITH month_series AS (
        SELECT
            generate_series(0, 11)         AS month_idx,
            to_char(
                make_date(p_year, generate_series(0,11)+1, 1),
                'Month'
            )                              AS month_nm
    ),
    journal_agg AS (
        SELECT
            EXTRACT(MONTH FROM je.entry_date)::INT - 1 AS month_idx,
            a.type                                      AS account_type,
            SUM(
                CASE a.type
                    WHEN 'revenue' THEN (jel.credit_amount - jel.debit_amount)
                    WHEN 'expense' THEN (jel.debit_amount - jel.credit_amount)
                    ELSE 0
                END
            ) AS net_amount
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id
        JOIN accounts a ON a.id = jel.account_id
        WHERE je.company_id = p_company_id
          AND je.entry_date BETWEEN v_start AND v_end
          AND je.status = 'posted'
          AND a.type IN ('revenue', 'expense')
          AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
        GROUP BY EXTRACT(MONTH FROM je.entry_date), a.type
    )
    SELECT
        ms.month_idx,
        TRIM(ms.month_nm),
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'revenue' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS revenues,
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'expense' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS expenses
    FROM month_series ms
    LEFT JOIN journal_agg ja ON ja.month_idx = ms.month_idx
    GROUP BY ms.month_idx, ms.month_nm
    ORDER BY ms.month_idx;
END;
$$;

COMMENT ON FUNCTION get_monthly_performance(UUID, INT, UUID) IS
'Returns aggregated monthly revenues and expenses for a given year.
Replaces the JS aggregation loop in accounting/services/reportService.ts.
Month names are returned in English (trimmed). The frontend can map them to Arabic.
All amounts are in base currency (SAR).';

GRANT EXECUTE ON FUNCTION get_monthly_performance(UUID, INT, UUID) TO authenticated;
