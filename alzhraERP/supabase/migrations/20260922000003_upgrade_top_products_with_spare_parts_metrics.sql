-- ==============================================================================
-- Migration: 20260922000003_upgrade_top_products_with_spare_parts_metrics.sql
-- Description: Upgrade get_top_products_and_customers to support:
--   1. Real date range filtering (p_date_from, p_date_to) matching dashboard period
--   2. Net sales calculation (sales minus returns)
--   3. Auto spare parts metadata: part_number, brand, sku, category_name
--   4. Real-time warehouse inventory status: current_stock, is_low_stock, is_out_of_stock
--   5. Multi-dimensional sorting: 'quantity' (الأسرع حركة), 'revenue' (الأكثر إيراداً), 'profit' (الأعلى ربحية)
-- ==============================================================================

DROP FUNCTION IF EXISTS public.get_top_products_and_customers(uuid, uuid, integer);

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
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  IF v_date_from IS NULL THEN
    v_date_from := (CURRENT_DATE - INTERVAL '30 days')::date;
  END IF;

  -- 1. Top Products: Net sales (Sales - Returns) within the date window
  WITH product_sales AS (
    SELECT
      ii.product_id,
      SUM(CASE WHEN i.type = 'sale' THEN ii.quantity WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.quantity ELSE 0 END) AS net_quantity,
      SUM(CASE WHEN i.type = 'sale' THEN ii.total WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.total ELSE 0 END) AS net_revenue,
      SUM(CASE WHEN i.type = 'sale' THEN ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)
               WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)
               ELSE 0 END) AS net_cost
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
    GROUP BY ii.product_id
    HAVING SUM(CASE WHEN i.type = 'sale' THEN ii.quantity WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.quantity ELSE 0 END) > 0
  ),
  ranked_products AS (
    SELECT
      ps.product_id,
      ps.net_quantity,
      ps.net_revenue,
      (ps.net_revenue - ps.net_cost) AS gross_profit,
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
      CASE WHEN p_sort_by = 'revenue' THEN ps.net_revenue END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'profit' THEN (ps.net_revenue - ps.net_cost) END DESC NULLS LAST,
      ps.net_quantity DESC,
      ps.net_revenue DESC
    LIMIT p_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',             rp.product_id,
      'name',           rp.name_ar,
      'part_number',    rp.part_number,
      'brand',          rp.brand,
      'sku',            rp.sku,
      'category_name',  rp.category_name,
      'total_quantity', rp.net_quantity,
      'quantity',       rp.net_quantity,
      'total_revenue',  rp.net_revenue,
      'revenue',        rp.net_revenue,
      'gross_profit',   rp.gross_profit,
      'price',          rp.sale_price,
      'image_url',      rp.image_url,
      'current_stock',  rp.current_stock,
      'min_stock_level', rp.min_stock_level,
      'is_low_stock',   (rp.current_stock <= rp.min_stock_level AND rp.current_stock > 0),
      'is_out_of_stock', (rp.current_stock <= 0)
    )
  ), '[]'::jsonb) INTO v_top_products
  FROM ranked_products rp;

  -- Fallback: ONLY if default 30-day window returned empty and user didn't specify custom date bounds
  IF (v_top_products IS NULL OR jsonb_array_length(v_top_products) = 0) AND v_is_default_window THEN
    WITH recent_inv AS (
      SELECT id
      FROM public.invoices
      WHERE company_id = p_company_id
        AND type IN ('sale', 'sale_return', 'return_sale')
        AND status IN ('posted', 'paid', 'partially_paid')
        AND deleted_at IS NULL
        AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      ORDER BY issue_date DESC, id DESC
      LIMIT 500
    ),
    product_sales_recent AS (
      SELECT
        ii.product_id,
        SUM(CASE WHEN i.type = 'sale' THEN ii.quantity WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.quantity ELSE 0 END) AS net_quantity,
        SUM(CASE WHEN i.type = 'sale' THEN ii.total WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.total ELSE 0 END) AS net_revenue,
        SUM(CASE WHEN i.type = 'sale' THEN ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)
                 WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)
                 ELSE 0 END) AS net_cost
      FROM recent_inv r
      JOIN public.invoices i ON i.id = r.id
      JOIN public.invoice_items ii ON ii.invoice_id = i.id AND ii.company_id = p_company_id
      JOIN public.products p ON p.id = ii.product_id AND p.company_id = p_company_id
      GROUP BY ii.product_id
      HAVING SUM(CASE WHEN i.type = 'sale' THEN ii.quantity WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.quantity ELSE 0 END) > 0
    ),
    ranked_products_recent AS (
      SELECT
        ps.product_id,
        ps.net_quantity,
        ps.net_revenue,
        (ps.net_revenue - ps.net_cost) AS gross_profit,
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
        CASE WHEN p_sort_by = 'revenue' THEN ps.net_revenue END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'profit' THEN (ps.net_revenue - ps.net_cost) END DESC NULLS LAST,
        ps.net_quantity DESC,
        ps.net_revenue DESC
      LIMIT p_limit
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',             rp.product_id,
        'name',           rp.name_ar,
        'part_number',    rp.part_number,
        'brand',          rp.brand,
        'sku',            rp.sku,
        'category_name',  rp.category_name,
        'total_quantity', rp.net_quantity,
        'quantity',       rp.net_quantity,
        'total_revenue',  rp.net_revenue,
        'revenue',        rp.net_revenue,
        'gross_profit',   rp.gross_profit,
        'price',          rp.sale_price,
        'image_url',      rp.image_url,
        'current_stock',  rp.current_stock,
        'min_stock_level', rp.min_stock_level,
        'is_low_stock',   (rp.current_stock <= rp.min_stock_level AND rp.current_stock > 0),
        'is_out_of_stock', (rp.current_stock <= 0)
      )
    ), '[]'::jsonb) INTO v_top_products
    FROM ranked_products_recent rp;
  END IF;

  -- 2. Top Customers (Sales minus returns) within the date window
  WITH customer_sales AS (
    SELECT
      i.party_id,
      SUM(CASE WHEN i.type = 'sale' THEN i.total_amount WHEN i.type IN ('sale_return', 'return_sale') THEN -i.total_amount ELSE 0 END) AS net_total,
      COUNT(DISTINCT i.id) AS invoice_count
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.type IN ('sale', 'sale_return', 'return_sale')
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.deleted_at IS NULL
      AND i.issue_date BETWEEN v_date_from AND v_date_to
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND i.party_id IS NOT NULL
    GROUP BY i.party_id
    HAVING SUM(CASE WHEN i.type = 'sale' THEN i.total_amount WHEN i.type IN ('sale_return', 'return_sale') THEN -i.total_amount ELSE 0 END) > 0
    ORDER BY net_total DESC
    LIMIT p_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',            cs.party_id,
      'customer_id',   cs.party_id,
      'name',          p.name,
      'phone',         p.phone,
      'total_revenue', cs.net_total,
      'total',         cs.net_total,
      'invoice_count', cs.invoice_count,
      'invoices',      cs.invoice_count
    )
  ), '[]'::jsonb) INTO v_top_customers
  FROM customer_sales cs
  JOIN public.parties p ON p.id = cs.party_id;

  -- Fallback for customers if default 30-day window had no sales
  IF (v_top_customers IS NULL OR jsonb_array_length(v_top_customers) = 0) AND v_is_default_window THEN
    WITH recent_cust_inv AS (
      SELECT
        i.party_id,
        SUM(CASE WHEN i.type = 'sale' THEN i.total_amount WHEN i.type IN ('sale_return', 'return_sale') THEN -i.total_amount ELSE 0 END) AS net_total,
        COUNT(DISTINCT i.id) AS invoice_count
      FROM (
        SELECT id, party_id, type, total_amount, issue_date
        FROM public.invoices
        WHERE company_id = p_company_id
          AND type IN ('sale', 'sale_return', 'return_sale')
          AND status IN ('posted', 'paid', 'partially_paid')
          AND deleted_at IS NULL
          AND party_id IS NOT NULL
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)
        ORDER BY issue_date DESC, id DESC
        LIMIT 500
      ) i
      GROUP BY i.party_id
      HAVING SUM(CASE WHEN i.type = 'sale' THEN i.total_amount WHEN i.type IN ('sale_return', 'return_sale') THEN -i.total_amount ELSE 0 END) > 0
      ORDER BY net_total DESC
      LIMIT p_limit
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',            rc.party_id,
        'customer_id',   rc.party_id,
        'name',          p.name,
        'phone',         p.phone,
        'total_revenue', rc.net_total,
        'total',         rc.net_total,
        'invoice_count', rc.invoice_count,
        'invoices',      rc.invoice_count
      )
    ), '[]'::jsonb) INTO v_top_customers
    FROM recent_cust_inv rc
    JOIN public.parties p ON p.id = rc.party_id;
  END IF;

  RETURN QUERY SELECT v_top_products, v_top_customers;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_top_products_and_customers(uuid, uuid, integer, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products_and_customers(uuid, uuid, integer, date, date, text) TO service_role;

-- ============================================================
-- 2. Upgrade get_sales_analytics with spare parts metrics
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_sales_analytics(
  p_company_id uuid,
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  vc uuid;
  v_from date := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '30 days')::date);
  v_to date := COALESCE(p_end_date, CURRENT_DATE);
  v_period_len integer;
  v_prev_from date;
  v_prev_to date;

  v_total_sales numeric := 0;
  v_total_returns numeric := 0;
  v_net_sales numeric := 0;
  v_invoice_count integer := 0;
  v_avg_invoice numeric := 0;

  v_prev_total_sales numeric := 0;
  v_prev_total_returns numeric := 0;
  v_prev_net_sales numeric := 0;

  v_top_products jsonb := '[]'::jsonb;
  v_top_customers jsonb := '[]'::jsonb;
  v_sales_by_day jsonb := '[]'::jsonb;
  v_sales_by_payment jsonb := '[]'::jsonb;
BEGIN
  vc := public.verify_company_access(p_company_id);

  v_period_len := (v_to - v_from) + 1;
  IF v_period_len <= 0 THEN
    v_period_len := 1;
  END IF;
  v_prev_from := v_from - v_period_len;
  v_prev_to := v_from - 1;

  -- 1. Main Period KPI Totals (Normalized to base currency)
  SELECT
    COALESCE(SUM(CASE WHEN i.type = 'sale' THEN
      CASE 
        WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
        WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
        ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
      END
    ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN i.type IN ('return_sale', 'sale_return') THEN
      CASE 
        WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
        WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
        ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
      END
    ELSE 0 END), 0),
    COUNT(CASE WHEN i.type = 'sale' THEN 1 END)
  INTO v_total_sales, v_total_returns, v_invoice_count
  FROM public.invoices i
  LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
  WHERE i.company_id = vc
    AND i.type IN ('sale', 'return_sale', 'sale_return')
    AND i.status IN ('posted', 'paid', 'partially_paid')
    AND i.issue_date BETWEEN v_from AND v_to
    AND i.deleted_at IS NULL;

  v_net_sales := v_total_sales - v_total_returns;
  v_avg_invoice := CASE WHEN v_invoice_count > 0 THEN ROUND(v_total_sales / v_invoice_count, 2) ELSE 0 END;

  -- 2. Previous Period KPIs (for growth calculation)
  SELECT
    COALESCE(SUM(CASE WHEN i.type = 'sale' THEN
      CASE 
        WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
        WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
        ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
      END
    ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN i.type IN ('return_sale', 'sale_return') THEN
      CASE 
        WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
        WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
        ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
      END
    ELSE 0 END), 0)
  INTO v_prev_total_sales, v_prev_total_returns
  FROM public.invoices i
  LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
  WHERE i.company_id = vc
    AND i.type IN ('sale', 'return_sale', 'sale_return')
    AND i.status IN ('posted', 'paid', 'partially_paid')
    AND i.issue_date BETWEEN v_prev_from AND v_prev_to
    AND i.deleted_at IS NULL;

  v_prev_net_sales := v_prev_total_sales - v_prev_total_returns;

  -- 3. Top Products (Normalized with Spare Parts Details & Net Quantities)
  SELECT COALESCE(jsonb_agg(p_row), '[]'::jsonb) INTO v_top_products
  FROM (
    SELECT 
      ii.product_id AS "productId",
      COALESCE(p.name_ar, 'منتج غير معروف') AS "productName",
      p.part_number AS "partNumber",
      p.brand AS "brand",
      p.sku AS "sku",
      COALESCE(stk.current_stock, 0) AS "currentStock",
      ROUND(SUM(CASE WHEN i.type = 'sale' THEN ii.quantity WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.quantity ELSE 0 END), 2) AS "quantity",
      ROUND(SUM(
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN
            CASE WHEN i.type = 'sale' THEN ii.total WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.total ELSE 0 END
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN
            (CASE WHEN i.type = 'sale' THEN ii.total WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.total ELSE 0 END) / i.exchange_rate
          ELSE
            (CASE WHEN i.type = 'sale' THEN ii.total WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.total ELSE 0 END) * COALESCE(i.exchange_rate, 1)
        END
      ), 2) AS "revenue"
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    LEFT JOIN public.products p ON p.id = ii.product_id
    LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(quantity), 0) AS current_stock
      FROM public.product_stock s
      WHERE s.product_id = ii.product_id AND s.company_id = vc
    ) stk ON true
    WHERE i.company_id = vc
      AND i.type IN ('sale', 'sale_return', 'return_sale')
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to
      AND i.deleted_at IS NULL
    GROUP BY ii.product_id, p.name_ar, p.part_number, p.brand, p.sku, stk.current_stock
    HAVING SUM(CASE WHEN i.type = 'sale' THEN ii.quantity WHEN i.type IN ('sale_return', 'return_sale') THEN -ii.quantity ELSE 0 END) > 0
    ORDER BY "revenue" DESC
    LIMIT 10
  ) p_row;

  -- 4. Top Customers (Normalized)
  SELECT COALESCE(jsonb_agg(c_row), '[]'::jsonb) INTO v_top_customers
  FROM (
    SELECT 
      i.party_id AS "customerId",
      COALESCE(p.name, 'عميل نقدي') AS "customerName",
      ROUND(SUM(
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
          ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
        END
      ), 2) AS "totalAmount",
      COUNT(i.id) AS "invoiceCount"
    FROM public.invoices i
    LEFT JOIN public.parties p ON p.id = i.party_id
    LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
    WHERE i.company_id = vc
      AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to
      AND i.deleted_at IS NULL
    GROUP BY i.party_id, p.name
    ORDER BY "totalAmount" DESC
    LIMIT 10
  ) c_row;

  -- 5. Sales by Day (Normalized)
  SELECT COALESCE(jsonb_agg(d_row), '[]'::jsonb) INTO v_sales_by_day
  FROM (
    SELECT 
      i.issue_date::text AS "date",
      ROUND(SUM(CASE WHEN i.type = 'sale' THEN
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
          ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
        END
      ELSE 0 END), 2) AS "sales",
      ROUND(SUM(CASE WHEN i.type IN ('return_sale', 'sale_return') THEN
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
          ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
        END
      ELSE 0 END), 2) AS "returns"
    FROM public.invoices i
    LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
    WHERE i.company_id = vc
      AND i.type IN ('sale', 'return_sale', 'sale_return')
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to
      AND i.deleted_at IS NULL
    GROUP BY i.issue_date
    ORDER BY i.issue_date
  ) d_row;

  -- 6. Sales by Payment Method (Normalized)
  SELECT COALESCE(jsonb_agg(m_row), '[]'::jsonb) INTO v_sales_by_payment
  FROM (
    SELECT 
      COALESCE(i.payment_method, 'cash') AS "method",
      ROUND(SUM(
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
          ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
        END
      ), 2) AS "amount"
    FROM public.invoices i
    LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
    WHERE i.company_id = vc
      AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to
      AND i.deleted_at IS NULL
    GROUP BY COALESCE(i.payment_method, 'cash')
    ORDER BY "amount" DESC
  ) m_row;

  RETURN jsonb_build_object(
    'totalSales', ROUND(v_total_sales, 2),
    'totalReturns', ROUND(v_total_returns, 2),
    'netSales', ROUND(v_net_sales, 2),
    'invoiceCount', v_invoice_count,
    'averageInvoiceValue', v_avg_invoice,
    'prevTotalSales', ROUND(v_prev_total_sales, 2),
    'prevTotalReturns', ROUND(v_prev_total_returns, 2),
    'prevNetSales', ROUND(v_prev_net_sales, 2),
    'topProducts', v_top_products,
    'topCustomers', v_top_customers,
    'salesByDay', v_sales_by_day,
    'salesByPaymentMethod', v_sales_by_payment
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_sales_analytics(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_analytics(uuid, date, date) TO service_role;

