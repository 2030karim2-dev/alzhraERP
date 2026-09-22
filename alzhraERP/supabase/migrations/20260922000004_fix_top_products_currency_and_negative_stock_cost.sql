-- ==============================================================================
-- Migration: 20260922000004_fix_top_products_currency_and_negative_stock_cost.sql
-- Description: Fix currency mismatch in get_top_products_and_customers:
--   1. Convert all sales and returns into company base currency using fn_to_base_amount.
--   2. Calculate accurate cost price even for negative-stock items / missing cost (70% fallback).
--   3. Guard against anomalous cost price entries (e.g. carton price vs unit price).
--   4. Expose both base currency (SAR) and local currency (YER) metrics with margin_percentage.
-- ==============================================================================

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

  SELECT COALESCE(currency, 'SAR') INTO v_base_currency
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
      -- Base revenue converted using currency and exchange rate
      public.fn_to_base_amount(COALESCE(i.currency, v_base_currency), ii.total, i.exchange_rate) AS rev_base,
      -- YER revenue
      CASE 
        WHEN UPPER(COALESCE(i.currency, '')) = 'YER' THEN ii.total
        ELSE ii.total * COALESCE(i.exchange_rate, v_yer_rate)
      END AS rev_yer,
      -- Resolved unit cost in base currency (fallback to 70% of unit sale price if missing or 0)
      CASE 
        WHEN COALESCE(ii.cost_price, p.cost_price, p.purchase_price, 0) > 0 
             AND COALESCE(ii.cost_price, p.cost_price, p.purchase_price, 0) <= (
               CASE WHEN ii.quantity > 0 
                    THEN (public.fn_to_base_amount(COALESCE(i.currency, v_base_currency), ii.total, i.exchange_rate) / ii.quantity) * 1.5 
                    ELSE 9999999 
               END
             )
        THEN COALESCE(ii.cost_price, p.cost_price, p.purchase_price)
        ELSE 
          -- Realistic cost estimation for negative stock or items without purchase invoice (70% of base sale price)
          ROUND((public.fn_to_base_amount(COALESCE(i.currency, v_base_currency), ii.total, i.exchange_rate) / GREATEST(ii.quantity, 1)) * 0.70, 4)
      END AS resolved_unit_cost_base
    FROM public.invoices i
    JOIN public.invoice_items ii
      ON ii.invoice_id = i.id
     AND ii.company_id = p_company_id
    JOIN public.products p
      ON p.id = ii.product_id
     AND p.company_id = p_company_id
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
      SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.rev_base WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.rev_base ELSE 0 END) AS net_revenue_base,
      SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.quantity * ibc.resolved_unit_cost_base
               WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.quantity * ibc.resolved_unit_cost_base
               ELSE 0 END) AS net_cost_base,
      SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.rev_yer WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.rev_yer ELSE 0 END) AS net_revenue_yer
    FROM item_base_calc ibc
    GROUP BY ibc.product_id
    HAVING SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.quantity WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.quantity ELSE 0 END) > 0
  ),
  ranked_products AS (
    SELECT
      ps.product_id,
      ps.net_quantity,
      ROUND(ps.net_revenue_base, 2) AS net_revenue_base,
      ROUND(ps.net_cost_base, 2) AS net_cost_base,
      ROUND(ps.net_revenue_base - ps.net_cost_base, 2) AS gross_profit_base,
      ROUND(
        CASE 
          WHEN ps.net_revenue_base > 0 
          THEN ((ps.net_revenue_base - ps.net_cost_base) / ps.net_revenue_base) * 100 
          ELSE 0 
        END, 
        1
      ) AS margin_percentage,
      ROUND(ps.net_revenue_yer, 2) AS net_revenue_yer,
      ROUND(ps.net_cost_base * v_yer_rate, 2) AS net_cost_yer,
      ROUND((ps.net_revenue_base - ps.net_cost_base) * v_yer_rate, 2) AS gross_profit_yer,
      p.name_ar,
      p.part_number,
      p.brand,
      p.sku,
      p.sale_price,
      p.image_url,
      p.min_stock_level,
      cat.name AS category_name,
      COALESCE(stk.current_stock, 0) AS current_stock
    FROM product_sales ps
    JOIN public.products p ON p.id = ps.product_id
    LEFT JOIN public.product_categories cat ON cat.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(quantity), 0) AS current_stock
      FROM public.product_stock s
      WHERE s.product_id = ps.product_id
        AND s.company_id = p_company_id
    ) stk ON true
    ORDER BY
      CASE WHEN p_sort_by = 'revenue' THEN ps.net_revenue_base END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'profit' THEN (ps.net_revenue_base - ps.net_cost_base) END DESC NULLS LAST,
      ps.net_quantity DESC,
      ps.net_revenue_base DESC
    LIMIT p_limit
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

  -- Fallback: ONLY if default 30-day window returned empty and user didn't specify custom date bounds
  IF (v_top_products IS NULL OR jsonb_array_length(v_top_products) = 0) AND v_is_default_window THEN
    WITH recent_inv AS (
      SELECT id, type, currency, exchange_rate
      FROM public.invoices
      WHERE company_id = p_company_id
        AND type IN ('sale', 'sale_return', 'return_sale')
        AND status IN ('posted', 'paid', 'partially_paid')
        AND deleted_at IS NULL
        AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      ORDER BY issue_date DESC, id DESC
      LIMIT 500
    ),
    item_base_calc_recent AS (
      SELECT
        ii.product_id,
        i.type AS inv_type,
        ii.quantity,
        public.fn_to_base_amount(COALESCE(i.currency, v_base_currency), ii.total, i.exchange_rate) AS rev_base,
        CASE 
          WHEN UPPER(COALESCE(i.currency, '')) = 'YER' THEN ii.total
          ELSE ii.total * COALESCE(i.exchange_rate, v_yer_rate)
        END AS rev_yer,
        CASE 
          WHEN COALESCE(ii.cost_price, p.cost_price, p.purchase_price, 0) > 0 
               AND COALESCE(ii.cost_price, p.cost_price, p.purchase_price, 0) <= (
                 CASE WHEN ii.quantity > 0 
                      THEN (public.fn_to_base_amount(COALESCE(i.currency, v_base_currency), ii.total, i.exchange_rate) / ii.quantity) * 1.5 
                      ELSE 9999999 
                 END
               )
          THEN COALESCE(ii.cost_price, p.cost_price, p.purchase_price)
          ELSE 
            ROUND((public.fn_to_base_amount(COALESCE(i.currency, v_base_currency), ii.total, i.exchange_rate) / GREATEST(ii.quantity, 1)) * 0.70, 4)
        END AS resolved_unit_cost_base
      FROM recent_inv i
      JOIN public.invoice_items ii ON ii.invoice_id = i.id AND ii.company_id = p_company_id
      JOIN public.products p ON p.id = ii.product_id AND p.company_id = p_company_id
    ),
    product_sales_recent AS (
      SELECT
        ibc.product_id,
        SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.quantity WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.quantity ELSE 0 END) AS net_quantity,
        SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.rev_base WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.rev_base ELSE 0 END) AS net_revenue_base,
        SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.quantity * ibc.resolved_unit_cost_base
                 WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.quantity * ibc.resolved_unit_cost_base
                 ELSE 0 END) AS net_cost_base,
        SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.rev_yer WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.rev_yer ELSE 0 END) AS net_revenue_yer
      FROM item_base_calc_recent ibc
      GROUP BY ibc.product_id
      HAVING SUM(CASE WHEN ibc.inv_type = 'sale' THEN ibc.quantity WHEN ibc.inv_type IN ('sale_return', 'return_sale') THEN -ibc.quantity ELSE 0 END) > 0
    ),
    ranked_products_recent AS (
      SELECT
        ps.product_id,
        ps.net_quantity,
        ROUND(ps.net_revenue_base, 2) AS net_revenue_base,
        ROUND(ps.net_cost_base, 2) AS net_cost_base,
        ROUND(ps.net_revenue_base - ps.net_cost_base, 2) AS gross_profit_base,
        ROUND(
          CASE 
            WHEN ps.net_revenue_base > 0 
            THEN ((ps.net_revenue_base - ps.net_cost_base) / ps.net_revenue_base) * 100 
            ELSE 0 
          END, 
          1
        ) AS margin_percentage,
        ROUND(ps.net_revenue_yer, 2) AS net_revenue_yer,
        ROUND(ps.net_cost_base * v_yer_rate, 2) AS net_cost_yer,
        ROUND((ps.net_revenue_base - ps.net_cost_base) * v_yer_rate, 2) AS gross_profit_yer,
        p.name_ar,
        p.part_number,
        p.brand,
        p.sku,
        p.sale_price,
        p.image_url,
        p.min_stock_level,
        cat.name AS category_name,
        COALESCE(stk.current_stock, 0) AS current_stock
      FROM product_sales_recent ps
      JOIN public.products p ON p.id = ps.product_id
      LEFT JOIN public.product_categories cat ON cat.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(quantity), 0) AS current_stock
        FROM public.product_stock s
        WHERE s.product_id = ps.product_id
          AND s.company_id = p_company_id
      ) stk ON true
      ORDER BY
        CASE WHEN p_sort_by = 'revenue' THEN ps.net_revenue_base END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'profit' THEN (ps.net_revenue_base - ps.net_cost_base) END DESC NULLS LAST,
        ps.net_quantity DESC,
        ps.net_revenue_base DESC
      LIMIT p_limit
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
    FROM ranked_products_recent rp;
  END IF;

  -- 2. Top Customers (Net sales minus returns)
  WITH customer_sales AS (
    SELECT
      i.party_id,
      SUM(
        CASE 
          WHEN i.type = 'sale' THEN public.fn_to_base_amount(COALESCE(i.currency, v_base_currency), i.total_amount, i.exchange_rate)
          WHEN i.type IN ('sale_return', 'return_sale') THEN -public.fn_to_base_amount(COALESCE(i.currency, v_base_currency), i.total_amount, i.exchange_rate)
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
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',            cs.party_id,
      'name',          COALESCE(p.name, 'عميل غير محدد'),
      'total_revenue', ROUND(cs.net_revenue, 2),
      'total',         ROUND(cs.net_revenue, 2),
      'invoice_count', cs.invoice_count,
      'invoices',      cs.invoice_count
    )
  ), '[]'::jsonb) INTO v_top_customers
  FROM (
    SELECT * FROM customer_sales
    ORDER BY net_revenue DESC
    LIMIT p_limit
  ) cs
  JOIN public.parties p ON p.id = cs.party_id;

  -- Fallback for Top Customers if default window was empty
  IF (v_top_customers IS NULL OR jsonb_array_length(v_top_customers) = 0) AND v_is_default_window THEN
    WITH recent_cust_inv AS (
      SELECT party_id, type, total_amount, currency, exchange_rate, id
      FROM public.invoices
      WHERE company_id = p_company_id
        AND type IN ('sale', 'sale_return', 'return_sale')
        AND status IN ('posted', 'paid', 'partially_paid')
        AND party_id IS NOT NULL
        AND deleted_at IS NULL
        AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      ORDER BY issue_date DESC, id DESC
      LIMIT 500
    ),
    customer_sales_recent AS (
      SELECT
        r.party_id,
        SUM(
          CASE 
            WHEN r.type = 'sale' THEN public.fn_to_base_amount(COALESCE(r.currency, v_base_currency), r.total_amount, r.exchange_rate)
            WHEN r.type IN ('sale_return', 'return_sale') THEN -public.fn_to_base_amount(COALESCE(r.currency, v_base_currency), r.total_amount, r.exchange_rate)
            ELSE 0 
          END
        ) AS net_revenue,
        COUNT(DISTINCT r.id) AS invoice_count
      FROM recent_cust_inv r
      GROUP BY r.party_id
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',            cs.party_id,
        'name',          COALESCE(p.name, 'عميل غير محدد'),
        'total_revenue', ROUND(cs.net_revenue, 2),
        'total',         ROUND(cs.net_revenue, 2),
        'invoice_count', cs.invoice_count,
        'invoices',      cs.invoice_count
      )
    ), '[]'::jsonb) INTO v_top_customers
    FROM (
      SELECT * FROM customer_sales_recent
      ORDER BY net_revenue DESC
      LIMIT p_limit
    ) cs
    JOIN public.parties p ON p.id = cs.party_id;
  END IF;

  RETURN QUERY SELECT v_top_products, v_top_customers;
END;
$function$;
