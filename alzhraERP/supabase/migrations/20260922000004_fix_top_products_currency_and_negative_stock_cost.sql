-- ==============================================================================
-- Migration: 20260922000004_fix_top_products_currency_and_negative_stock_cost.sql
-- Description: Fix currency mismatch & performance in get_top_products_and_customers:
--   1. Convert all sales and returns into company base currency using fn_to_base_amount.
--   2. Use correct column names: invoices.currency_code and companies.base_currency.
--   3. Calculate accurate cost price even for negative-stock items / missing cost (70% fallback).
--   4. Expose both base currency (SAR) and local currency (YER) metrics with margin_percentage.
--   5. Optimize index and aggregation boundaries to prevent timeouts on large data sets (60k+ rows).
--   6. Provide safe default for get_monthly_performance p_year parameter.
-- ==============================================================================

-- 1. Index optimization for invoices top products scan
CREATE INDEX IF NOT EXISTS idx_invoices_top_products_fast 
ON public.invoices USING btree (company_id, type, status, issue_date DESC) 
INCLUDE (id, branch_id, party_id, total_amount, currency_code, exchange_rate) 
WHERE (deleted_at IS NULL);

-- 2. Give get_monthly_performance a default p_year
CREATE OR REPLACE FUNCTION public.get_monthly_performance(
  p_company_id uuid,
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  p_branch_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(month_index integer, month_name text, revenues numeric, expenses numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_start DATE := make_date(COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer), 1, 1);
    v_end   DATE := make_date(COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer), 12, 31);
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    RETURN QUERY
    WITH journal_agg AS (
        SELECT
            (EXTRACT(MONTH FROM je.entry_date))::INT - 1 AS month_idx,
            a.type AS account_type,
            SUM(
                CASE a.type
                    WHEN 'revenue' THEN (jel.credit_amount - jel.debit_amount)
                    WHEN 'expense' THEN (jel.debit_amount  - jel.credit_amount)
                    ELSE 0
                END
            ) AS net_amount
        FROM public.journal_entries je
        JOIN public.journal_entry_lines jel
            ON jel.journal_entry_id = je.id
           AND jel.company_id = p_company_id
           AND jel.deleted_at IS NULL
        JOIN public.accounts a 
            ON a.id = jel.account_id 
           AND a.company_id = p_company_id
           AND a.type IN ('revenue', 'expense')
           AND a.deleted_at IS NULL
        WHERE je.company_id = p_company_id
          AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
          AND je.status = 'posted'
          AND je.entry_date BETWEEN v_start AND v_end
          AND je.deleted_at IS NULL
        GROUP BY (EXTRACT(MONTH FROM je.entry_date))::INT - 1, a.type
    ),
    months AS (
        SELECT
            s.i AS month_idx,
            TRIM(to_char(make_date(COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer), s.i + 1, 1), 'Month')) AS month_nm
        FROM generate_series(0, 11) s(i)
    )
    SELECT
        m.month_idx AS month_index,
        m.month_nm AS month_name,
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'revenue' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS revenues,
        GREATEST(0, COALESCE(SUM(CASE ja.account_type WHEN 'expense' THEN ja.net_amount ELSE 0 END), 0))::NUMERIC AS expenses
    FROM months m
    LEFT JOIN journal_agg ja ON ja.month_idx = m.month_idx
    GROUP BY m.month_idx, m.month_nm
    ORDER BY m.month_idx;
END;
$function$;

-- 3. Optimized and corrected get_top_products_and_customers
DROP FUNCTION IF EXISTS public.get_top_products_and_customers(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.get_top_products_and_customers(uuid, uuid, integer, date, date, text);

CREATE OR REPLACE FUNCTION public.get_top_products_and_customers(
  p_company_id uuid,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 10,
  p_date_from date DEFAULT NULL::date,
  p_date_to date DEFAULT NULL::date,
  p_sort_by text DEFAULT 'quantity'::text
)
RETURNS TABLE(top_products jsonb, top_customers jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_top_products  jsonb := '[]'::jsonb;
  v_top_customers jsonb := '[]'::jsonb;
  v_date_from     date := p_date_from;
  v_date_to       date := COALESCE(p_date_to, CURRENT_DATE);
  v_is_default_window boolean := (p_date_from IS NULL);
  v_base_currency text := 'SAR';
  v_yer_rate      numeric := 410.0;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  SELECT COALESCE(base_currency, 'SAR') INTO v_base_currency
  FROM public.companies
  WHERE id = p_company_id;

  IF v_date_from IS NULL THEN
    v_date_from := (CURRENT_DATE - INTERVAL '30 days')::date;
  END IF;

  -- 1. Top Products: Net sales (Sales - Returns) within the date window
  WITH item_base_calc AS (
    SELECT
      ii.product_id,
      i.type AS inv_type,
      ii.quantity,
      ii.total,
      COALESCE(i.currency_code, v_base_currency) AS curr_code,
      i.exchange_rate,
      COALESCE(NULLIF(ii.cost_price, 0), 0) AS direct_cost
    FROM public.invoices i
    JOIN public.invoice_items ii
      ON ii.invoice_id = i.id
     AND ii.company_id = p_company_id
    WHERE i.company_id = p_company_id
      AND i.type IN ('sale', 'sale_return', 'return_sale')
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.deleted_at IS NULL
      AND i.issue_date BETWEEN v_date_from AND v_date_to
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
  ),
  product_sales AS (
    SELECT
      ibc.product_id,
      SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.quantity WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.quantity ELSE 0 END) AS net_quantity,
      SUM(CASE WHEN ibc.inv_type = 'sale' THEN public.fn_to_base_amount(ibc.curr_code, ibc.total, ibc.exchange_rate)
               WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -public.fn_to_base_amount(ibc.curr_code, ibc.total, ibc.exchange_rate)
               ELSE 0 END) AS net_revenue_base,
      SUM(CASE WHEN ibc.inv_type = 'sale' THEN (CASE WHEN UPPER(ibc.curr_code) = 'YER' THEN ibc.total ELSE ibc.total * COALESCE(ibc.exchange_rate, v_yer_rate) END)
               WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -(CASE WHEN UPPER(ibc.curr_code) = 'YER' THEN ibc.total ELSE ibc.total * COALESCE(ibc.exchange_rate, v_yer_rate) END)
               ELSE 0 END) AS net_revenue_yer,
      SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.quantity * (CASE WHEN ibc.direct_cost > 0 THEN ibc.direct_cost ELSE (public.fn_to_base_amount(ibc.curr_code, ibc.total, ibc.exchange_rate) / GREATEST(ibc.quantity, 1)) * 0.70 END)
               WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.quantity * (CASE WHEN ibc.direct_cost > 0 THEN ibc.direct_cost ELSE (public.fn_to_base_amount(ibc.curr_code, ibc.total, ibc.exchange_rate) / GREATEST(ibc.quantity, 1)) * 0.70 END)
               ELSE 0 END) AS net_cost_base
    FROM item_base_calc ibc
    GROUP BY ibc.product_id
    HAVING SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.quantity WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.quantity ELSE 0 END) > 0
  ),
  top_p_ids AS (
    SELECT
      ps.product_id,
      ps.net_quantity,
      ps.net_revenue_base,
      ps.net_revenue_yer,
      ps.net_cost_base
    FROM product_sales ps
    ORDER BY
      CASE WHEN p_sort_by = 'revenue' THEN ps.net_revenue_base END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'profit' THEN (ps.net_revenue_base - ps.net_cost_base) END DESC NULLS LAST,
      ps.net_quantity DESC,
      ps.net_revenue_base DESC
    LIMIT p_limit
  ),
  ranked_products AS (
    SELECT
      tp.product_id,
      tp.net_quantity,
      ROUND(tp.net_revenue_base, 2) AS net_revenue_base,
      ROUND(tp.net_cost_base, 2) AS net_cost_base,
      ROUND(tp.net_revenue_base - tp.net_cost_base, 2) AS gross_profit_base,
      ROUND(
        CASE 
          WHEN tp.net_revenue_base > 0 
          THEN ((tp.net_revenue_base - tp.net_cost_base) / tp.net_revenue_base) * 100 
          ELSE 0 
        END, 
        1
      ) AS margin_percentage,
      ROUND(tp.net_revenue_yer, 2) AS net_revenue_yer,
      ROUND(tp.net_cost_base * v_yer_rate, 2) AS net_cost_yer,
      ROUND((tp.net_revenue_base - tp.net_cost_base) * v_yer_rate, 2) AS gross_profit_yer,
      p.name_ar,
      p.part_number,
      p.brand,
      p.sku,
      p.sale_price,
      p.image_url,
      p.min_stock_level,
      cat.name AS category_name,
      COALESCE(stk.current_stock, 0) AS current_stock
    FROM top_p_ids tp
    JOIN public.products p ON p.id = tp.product_id
    LEFT JOIN public.product_categories cat ON cat.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(quantity), 0) AS current_stock
      FROM public.product_stock s
      WHERE s.product_id = tp.product_id
        AND s.company_id = p_company_id
    ) stk ON true
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                rp.product_id,
      'name',              rp.name_ar,
      'part_number',       rp.part_number,
      'brand',             rp.brand,
      'sku',               rp.sku,
      'category_name',     rp.category_name,
      'total_quantity',    rp.net_quantity,
      'quantity',          rp.net_quantity,
      'total_revenue',     rp.net_revenue_base,
      'revenue',           rp.net_revenue_base,
      'total_cost',        rp.net_cost_base,
      'cost',              rp.net_cost_base,
      'gross_profit',      rp.gross_profit_base,
      'margin_percentage', rp.margin_percentage,
      'total_revenue_yer', rp.net_revenue_yer,
      'revenue_yer',       rp.net_revenue_yer,
      'total_cost_yer',    rp.net_cost_yer,
      'cost_yer',          rp.net_cost_yer,
      'gross_profit_yer',  rp.gross_profit_yer,
      'price',             rp.sale_price,
      'image_url',         rp.image_url,
      'current_stock',     rp.current_stock,
      'min_stock_level',   rp.min_stock_level,
      'is_low_stock',      (rp.current_stock <= rp.min_stock_level AND rp.current_stock > 0),
      'is_out_of_stock',   (rp.current_stock <= 0)
    )
  ), '[]'::jsonb) INTO v_top_products
  FROM ranked_products rp;

  -- 2. Top Customers (Net sales minus returns)
  WITH customer_sales AS (
    SELECT
      i.party_id,
      SUM(
        CASE 
          WHEN i.type = 'sale' THEN public.fn_to_base_amount(COALESCE(i.currency_code, v_base_currency), i.total_amount, i.exchange_rate)
          WHEN i.type IN ('sale_return', 'return_sale') THEN -public.fn_to_base_amount(COALESCE(i.currency_code, v_base_currency), i.total_amount, i.exchange_rate)
          ELSE 0 
        END
      ) AS net_revenue,
      COUNT(DISTINCT i.id) AS invoice_count
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.type IN ('sale', 'sale_return', 'return_sale')
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.party_id IS NOT NULL
      AND i.deleted_at IS NULL
      AND i.issue_date BETWEEN v_date_from AND v_date_to
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    GROUP BY i.party_id
    HAVING SUM(CASE WHEN i.type = 'sale' THEN 1 ELSE -1 END) > 0
  ),
  top_cust AS (
    SELECT * FROM customer_sales
    ORDER BY net_revenue DESC
    LIMIT p_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',            tc.party_id,
      'name',          COALESCE(p.name, 'عميل غير محدد'),
      'total_revenue', ROUND(tc.net_revenue, 2),
      'total',         ROUND(tc.net_revenue, 2),
      'invoice_count', tc.invoice_count,
      'invoices',      tc.invoice_count
    )
  ), '[]'::jsonb) INTO v_top_customers
  FROM top_cust tc
  JOIN public.parties p ON p.id = tc.party_id;

  RETURN QUERY SELECT v_top_products, v_top_customers;
END;
$function$;
