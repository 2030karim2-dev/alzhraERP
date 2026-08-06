-- Migration: Add previous-period growth fields to get_sales_analytics
-- Enables client-side growth-rate calculation (salesGrowth, returnsGrowth, netSalesGrowth)

CREATE OR REPLACE FUNCTION public.get_sales_analytics(
    p_company_id uuid,
    p_start_date date DEFAULT NULL::date,
    p_end_date date DEFAULT NULL::date
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_from date := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '30 days')::date);
  v_to date := COALESCE(p_end_date, CURRENT_DATE);
  v_period_days integer := (v_to - v_from + 1)::integer;
  v_prev_from date := (v_from - v_period_days)::date;
  v_prev_to date := (v_from - 1)::date;
  v_total_sales numeric;
  v_total_returns numeric;
  v_net_sales numeric;
  v_invoice_count integer;
  v_avg_invoice numeric;
  v_top_products jsonb;
  v_top_customers jsonb;
  v_sales_by_day jsonb;
  v_sales_by_payment jsonb;
  v_prev_total_sales numeric;
  v_prev_total_returns numeric;
  v_prev_net_sales numeric;
BEGIN
  -- Total Sales (current period)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_sales
  FROM public.invoices
  WHERE company_id = p_company_id AND type = 'sale'
    AND status IN ('posted', 'paid', 'partially_paid')
    AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;

  -- Total Returns (current period): 'return_sale' matches the actual DB value
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_returns
  FROM public.invoices
  WHERE company_id = p_company_id AND type = 'return_sale'
    AND status IN ('posted', 'paid', 'partially_paid')
    AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;

  -- Net Sales (current period)
  v_net_sales := v_total_sales - COALESCE(v_total_returns, 0);

  -- Invoice Count (active, non-void invoices in current period)
  SELECT COUNT(*) INTO v_invoice_count
  FROM public.invoices
  WHERE company_id = p_company_id AND type = 'sale'
    AND status != 'void'
    AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;

  -- Average Invoice
  v_avg_invoice := CASE WHEN v_invoice_count > 0 THEN v_total_sales / v_invoice_count ELSE 0 END;

  -- Previous Period Sales
  SELECT COALESCE(SUM(total_amount), 0) INTO v_prev_total_sales
  FROM public.invoices
  WHERE company_id = p_company_id AND type = 'sale'
    AND status IN ('posted', 'paid', 'partially_paid')
    AND issue_date BETWEEN v_prev_from AND v_prev_to AND deleted_at IS NULL;

  -- Previous Period Returns
  SELECT COALESCE(SUM(total_amount), 0) INTO v_prev_total_returns
  FROM public.invoices
  WHERE company_id = p_company_id AND type = 'return_sale'
    AND status IN ('posted', 'paid', 'partially_paid')
    AND issue_date BETWEEN v_prev_from AND v_prev_to AND deleted_at IS NULL;

  -- Previous Period Net Sales
  v_prev_net_sales := v_prev_total_sales - COALESCE(v_prev_total_returns, 0);

  -- Top Products
  SELECT jsonb_agg(result) INTO v_top_products FROM (
    SELECT p.name_ar as name, SUM(ii.total) as revenue, SUM(ii.quantity) as quantity
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    JOIN public.products p ON p.id = ii.product_id
    WHERE i.company_id = p_company_id AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to AND i.deleted_at IS NULL
    GROUP BY p.id, p.name_ar ORDER BY revenue DESC LIMIT 10
  ) result;

  -- Top Customers
  SELECT jsonb_agg(result) INTO v_top_customers FROM (
    SELECT pr.name, SUM(i.total_amount) as revenue, COUNT(i.id) as count
    FROM public.invoices i
    JOIN public.parties pr ON pr.id = i.party_id
    WHERE i.company_id = p_company_id AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to AND i.deleted_at IS NULL
    GROUP BY pr.id, pr.name ORDER BY revenue DESC LIMIT 10
  ) result;

  -- Sales by Day
  SELECT jsonb_agg(row_to_json(d)) INTO v_sales_by_day FROM (
    SELECT issue_date::text as date, SUM(total_amount) as sales
    FROM public.invoices
    WHERE company_id = p_company_id AND type = 'sale'
      AND status IN ('posted', 'paid', 'partially_paid')
      AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL
    GROUP BY issue_date ORDER BY issue_date
  ) d;

  -- Sales by Payment Method
  SELECT jsonb_agg(row_to_json(d)) INTO v_sales_by_payment FROM (
    SELECT payment_method, SUM(total_amount) as total, COUNT(*) as count
    FROM public.invoices
    WHERE company_id = p_company_id AND type = 'sale'
      AND status IN ('posted', 'paid', 'partially_paid')
      AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL
    GROUP BY payment_method
  ) d;

  RETURN jsonb_build_object(
    'totalSales', v_total_sales,
    'totalReturns', v_total_returns,
    'netSales', v_net_sales,
    'invoiceCount', v_invoice_count,
    'averageInvoiceValue', v_avg_invoice,
    'prevTotalSales', v_prev_total_sales,
    'prevTotalReturns', v_prev_total_returns,
    'prevNetSales', v_prev_net_sales,
    'topProducts', COALESCE(v_top_products, '[]'::jsonb),
    'topCustomers', COALESCE(v_top_customers, '[]'::jsonb),
    'salesByDay', COALESCE(v_sales_by_day, '[]'::jsonb),
    'salesByPaymentMethod', COALESCE(v_sales_by_payment, '[]'::jsonb)
  );
END;
$function$;
