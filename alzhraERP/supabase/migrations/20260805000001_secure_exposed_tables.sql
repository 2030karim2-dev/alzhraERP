-- ==============================================================================
-- Migration: Fix Sales Analytics and Secure Exposed Tables
-- ==============================================================================

-- 1. Enable RLS for exposed and unused tables
ALTER TABLE public.cashboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmp_jaafari_price_update ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspended_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Block all access to these tables (internal/deprecated)
DROP POLICY IF EXISTS "deny_all" ON public.cashboxes;
DROP POLICY IF EXISTS "deny_all" ON public.tmp_jaafari_price_update;
DROP POLICY IF EXISTS "deny_all" ON public.monthly_targets;
DROP POLICY IF EXISTS "deny_all" ON public.suspended_orders;
DROP POLICY IF EXISTS "deny_all" ON public.backup_configs;
DROP POLICY IF EXISTS "deny_all" ON public.backup_logs;

CREATE POLICY "deny_all" ON public.cashboxes FOR ALL USING (false);
CREATE POLICY "deny_all" ON public.tmp_jaafari_price_update FOR ALL USING (false);
CREATE POLICY "deny_all" ON public.monthly_targets FOR ALL USING (false);
CREATE POLICY "deny_all" ON public.suspended_orders FOR ALL USING (false);
CREATE POLICY "deny_all" ON public.backup_configs FOR ALL USING (false);
CREATE POLICY "deny_all" ON public.backup_logs FOR ALL USING (false);

-- 2. Fix report_trial_balance: only posted journal entries affect balances
CREATE OR REPLACE FUNCTION public.report_trial_balance(
    p_company_id uuid,
    p_from date,
    p_to date,
    p_branch_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(account_code text, account_id uuid, account_name text, account_type text, balance numeric, total_debit numeric, total_credit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    a.code,
    a.id,
    a.name_ar,
    a.type,
    COALESCE(jel.balance, 0) as balance,
    COALESCE(jel.debit_amount, 0) as total_debit,
    COALESCE(jel.credit_amount, 0) as total_credit
  FROM public.accounts a
  LEFT JOIN (
     SELECT
        l.account_id,
        SUM(l.debit_amount) as debit_amount,
        SUM(l.credit_amount) as credit_amount,
        SUM(l.debit_amount) - SUM(l.credit_amount) as balance
     FROM public.journal_entry_lines l
     JOIN public.journal_entries j ON j.id = l.journal_entry_id
     WHERE j.status = 'posted' AND j.deleted_at IS NULL AND l.deleted_at IS NULL
       AND j.entry_date BETWEEN p_from AND p_to
       AND (p_branch_id IS NULL OR l.branch_id = p_branch_id)
     GROUP BY l.account_id
  ) jel ON jel.account_id = a.id
  WHERE a.company_id = p_company_id
    AND a.is_active = true
    AND a.deleted_at IS NULL
  ORDER BY a.code;
END;
$function$;

-- 3. Fix get_sales_analytics: use 'return_sale' (matching actual DB type) for returns calculation
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
  v_total_sales numeric;
  v_total_returns numeric;
  v_net_sales numeric;
  v_invoice_count integer;
  v_avg_invoice numeric;
  v_top_products jsonb;
  v_top_customers jsonb;
  v_sales_by_day jsonb;
  v_sales_by_payment jsonb;
BEGIN
  -- Total Sales
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_sales
  FROM public.invoices
  WHERE company_id = p_company_id AND type = 'sale'
    AND status IN ('posted', 'paid', 'partially_paid')
    AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;

  -- Total Returns: 'return_sale' matches the actual DB value (was incorrectly 'sale_return')
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_returns
  FROM public.invoices
  WHERE company_id = p_company_id AND type = 'return_sale'
    AND status IN ('posted', 'paid', 'partially_paid')
    AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;

  -- Net Sales
  v_net_sales := v_total_sales - COALESCE(v_total_returns, 0);

  -- Invoice Count (active, non-void invoices)
  SELECT COUNT(*) INTO v_invoice_count
  FROM public.invoices
  WHERE company_id = p_company_id AND type = 'sale'
    AND status != 'void'
    AND issue_date BETWEEN v_from AND v_to AND deleted_at IS NULL;

  -- Average Invoice
  v_avg_invoice := CASE WHEN v_invoice_count > 0 THEN v_total_sales / v_invoice_count ELSE 0 END;

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
    'topProducts', COALESCE(v_top_products, '[]'::jsonb),
    'topCustomers', COALESCE(v_top_customers, '[]'::jsonb),
    'salesByDay', COALESCE(v_sales_by_day, '[]'::jsonb),
    'salesByPaymentMethod', COALESCE(v_sales_by_payment, '[]'::jsonb)
  );
END;
$function$;
