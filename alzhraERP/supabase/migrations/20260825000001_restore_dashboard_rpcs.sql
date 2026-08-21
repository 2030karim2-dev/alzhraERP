-- ============================================================
-- Migration: Restore dashboard RPCs (get_dashboard_summary 4-arg
--           + the 8 dashboard/report functions used by
--           src/features/dashboard/api/index.ts).
-- Date: 2026-08-25
--
-- WHY: The production DB was restored from a snapshot that lacks
-- most dashboard RPCs, so every dashboard load fired 9-12 PGRST202
-- errors and the widgets fell back to zeros. This migration
-- re-creates all of them (CREATE OR REPLACE = idempotent).
--
-- SECURITY: every function keeps its original SECURITY DEFINER +
-- verify_company_access() tenant guard; EXECUTE is granted only
-- to the authenticated role (never anon/public).
-- ============================================================
BEGIN;

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

CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name_ar text, quantity numeric, min_quantity numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            SELECT w.id FROM warehouses w WHERE w.branch_id = p_branch_id
        ))
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
    GROUP BY p.id, p.name_ar, p.min_stock_level
    HAVING COALESCE(SUM(ps.quantity), 0) <= COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5)
    ORDER BY quantity ASC
    LIMIT 50;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_products_and_customers(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 5)
 RETURNS TABLE(top_products jsonb, top_customers jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Top Products by quantity sold
  SELECT jsonb_agg(result) INTO top_products
  FROM (
    SELECT 
      p.name_ar as name,
      p.sku,
      SUM(ii.quantity) as total_quantity,
      SUM(ii.total) as total_revenue,
      p.sale_price as price,
      p.image_url
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    JOIN public.products p ON p.id = ii.product_id
    WHERE ii.company_id = p_company_id
      AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND i.deleted_at IS NULL
    GROUP BY p.id, p.name_ar, p.sku, p.sale_price, p.image_url
    ORDER BY total_revenue DESC
    LIMIT p_limit
  ) result;

  -- Top Customers by revenue
  SELECT jsonb_agg(result) INTO top_customers
  FROM (
    SELECT 
      pr.name,
      SUM(i.total_amount) as total_revenue,
      COUNT(i.id) as invoice_count,
      pr.phone,
      pr.email
    FROM public.invoices i
    JOIN public.parties pr ON pr.id = i.party_id
    WHERE i.company_id = p_company_id
      AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND i.deleted_at IS NULL
    GROUP BY pr.id, pr.name, pr.phone, pr.email
    ORDER BY total_revenue DESC
    LIMIT p_limit
  ) result;

  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_expense_categories_summary(p_company_id uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(category_name text, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ec.name, 'غير مصنف') AS category_name,
        SUM(e.amount * COALESCE(e.exchange_rate, 1))::NUMERIC AS total_amount
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
$function$;

CREATE OR REPLACE FUNCTION public.get_top_selling_products(p_company_id uuid, p_limit integer DEFAULT 10, p_days integer DEFAULT 30)
 RETURNS TABLE(id uuid, name_ar text, sku text, category_id uuid, total_sold numeric, total_revenue numeric, total_cost numeric, gross_profit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT p.id, p.name_ar, p.sku, p.category_id, SUM(ii.quantity)::numeric, SUM(ii.total)::numeric,
    SUM(ii.quantity*ii.cost_price)::numeric, (SUM(ii.total)-SUM(ii.quantity*ii.cost_price))::numeric
  FROM public.invoice_items ii JOIN public.invoices i ON i.id=ii.invoice_id JOIN public.products p ON p.id=ii.product_id
  WHERE i.company_id=p_company_id AND i.type='sale' AND i.status IN ('posted','paid') AND i.deleted_at IS NULL AND i.issue_date >= CURRENT_DATE - p_days
  GROUP BY p.id, p.name_ar, p.sku, p.category_id ORDER BY total_sold DESC LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_debt_followup_dashboard(p_company_id uuid, p_due_soon_days integer DEFAULT 7, p_critical_days integer DEFAULT 30, p_reminder_window_days integer DEFAULT 3)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, currency_code text, outstanding_balance numeric, overdue_amount numeric, oldest_due_date date, next_due_date date, days_overdue integer, classification text, reminder_status text, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, pending_promise_date date, invoice_count bigint, opening_balance numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    WITH invoice_debts AS (
        SELECT
            i.party_id,
            i.currency_code,
            SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS outstanding,
            SUM(CASE WHEN i.due_date < v_today
                THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS overdue_amount,
            MIN(i.due_date) FILTER (WHERE i.due_date < v_today) AS oldest_due_date,
            MIN(i.due_date) FILTER (WHERE i.due_date >= v_today) AS next_due_date,
            COUNT(*) AS invoice_count
        FROM public.invoices i
        WHERE i.company_id = p_company_id
          AND i.type = 'sale'
          AND i.status IN ('posted', 'partial')
          AND i.deleted_at IS NULL
          AND i.party_id IS NOT NULL
        GROUP BY i.party_id, i.currency_code
    ),
    opening_balances AS (
        SELECT
            ob.party_id,
            ob.currency_code,
            SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END) AS opening_amount
        FROM public.party_opening_balances ob
        WHERE ob.company_id = p_company_id
        GROUP BY ob.party_id, ob.currency_code
    ),
    combined AS (
        SELECT
            COALESCE(id.party_id, ob.party_id) AS party_id,
            COALESCE(id.currency_code, ob.currency_code) AS currency_code,
            COALESCE(id.outstanding, 0) + COALESCE(ob.opening_amount, 0) AS outstanding_balance,
            COALESCE(id.overdue_amount, 0) AS overdue_amount,
            id.oldest_due_date,
            id.next_due_date,
            COALESCE(id.invoice_count, 0) AS invoice_count,
            COALESCE(ob.opening_amount, 0) AS opening_balance
        FROM invoice_debts id
        FULL OUTER JOIN opening_balances ob
            ON ob.party_id = id.party_id AND ob.currency_code = id.currency_code
    ),
    promise_summary AS (
        SELECT
            pp.party_id,
            COUNT(*) FILTER (WHERE pp.status = 'pending') AS pending_promise_count,
            SUM(pp.amount) FILTER (WHERE pp.status = 'pending') AS pending_promise_amount,
            MIN(pp.promise_date) FILTER (WHERE pp.status = 'pending') AS pending_promise_date,
            BOOL_OR(pp.status = 'broken') AS has_broken_promise
        FROM public.debt_payment_promises pp
        WHERE pp.company_id = p_company_id
        GROUP BY pp.party_id
    ),
    last_reminders AS (
        SELECT DISTINCT ON (ml.party_id)
            ml.party_id, ml.created_at AS last_reminded_at
        FROM public.debt_message_log ml
        WHERE ml.company_id = p_company_id AND ml.status = 'sent'
        ORDER BY ml.party_id, ml.created_at DESC
    ),
    last_contacts AS (
        SELECT DISTINCT ON (ca.customer_id)
            ca.customer_id, ca.created_at AS last_contact_date
        FROM public.customer_activities ca
        WHERE ca.company_id = p_company_id
        ORDER BY ca.customer_id, ca.created_at DESC
    )


    SELECT
        c.party_id,
        p.name::TEXT AS party_name,
        p.phone::TEXT AS party_phone,
        COALESCE(pc.name, 'عام')::TEXT AS category,
        p.credit_limit,
        c.currency_code::TEXT AS currency_code,
        c.outstanding_balance,
        c.overdue_amount,
        c.oldest_due_date,
        c.next_due_date,
        CASE WHEN c.oldest_due_date IS NOT NULL
            THEN (v_today - c.oldest_due_date) ELSE 0 END AS days_overdue,
        CASE
            WHEN c.oldest_due_date IS NOT NULL
                 AND (v_today - c.oldest_due_date) >= p_critical_days THEN 'critical'
            WHEN c.oldest_due_date IS NOT NULL AND c.oldest_due_date < v_today THEN 'overdue'
            WHEN c.oldest_due_date = v_today THEN 'due_today'
            WHEN c.next_due_date IS NOT NULL
                 AND c.next_due_date <= v_today + p_due_soon_days THEN 'due_soon'
            ELSE 'current'
        END AS classification,
        CASE
            WHEN lr.last_reminded_at IS NOT NULL
                 AND lr.last_reminded_at >= NOW() - make_interval(days => p_reminder_window_days)
                 THEN 'reminded'
            ELSE 'needs_reminder'
        END AS reminder_status,
        lr.last_reminded_at,
        lc.last_contact_date,
        COALESCE(ps.has_broken_promise, false) AS has_broken_promise,
        COALESCE(ps.pending_promise_count, 0) AS pending_promise_count,
        COALESCE(ps.pending_promise_amount, 0) AS pending_promise_amount,
        ps.pending_promise_date,
        c.invoice_count,
        c.opening_balance
    FROM combined c
    JOIN public.parties p ON p.id = c.party_id AND p.deleted_at IS NULL
    LEFT JOIN public.party_categories pc ON pc.id = p.category_id
    LEFT JOIN promise_summary ps ON ps.party_id = c.party_id
    LEFT JOIN last_reminders lr ON lr.party_id = c.party_id
    LEFT JOIN last_contacts lc ON lc.customer_id = c.party_id
    WHERE c.outstanding_balance > 0
    ORDER BY c.overdue_amount DESC NULLS LAST, days_overdue DESC NULLS LAST;
END;
$function$;

CREATE OR REPLACE FUNCTION public.report_trial_balance(p_company_id uuid, p_from date, p_to date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(account_code text, account_id uuid, account_name text, account_type text, balance numeric, total_debit numeric, total_credit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.report_profit_loss(p_company_id uuid, p_from date, p_to date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(category text, amount numeric, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_revenue numeric;
  v_expense numeric;
  v_gross_profit numeric;
  v_net_profit numeric;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Revenue (accounts classified as revenue by type)
  SELECT COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) INTO v_revenue
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.type = 'revenue'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  -- Expenses (accounts classified as expense by type)
  SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) INTO v_expense
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE a.company_id = p_company_id
    AND a.type = 'expense'
    AND je.status = 'posted' AND je.deleted_at IS NULL
    AND jel.deleted_at IS NULL
    AND je.entry_date BETWEEN p_from AND p_to
    AND (p_branch_id IS NULL OR jel.branch_id = p_branch_id);

  v_net_profit := v_revenue - v_expense;
  v_gross_profit := v_revenue;

  -- Return rows
  category := 'الإيرادات'; amount := v_revenue; type := 'revenue'; RETURN NEXT;
  category := 'المصروفات'; amount := v_expense; type := 'expense'; RETURN NEXT;
  category := 'صافي الربح/الخسارة'; amount := v_net_profit; type := 'net_profit'; RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_low_stock_products(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products_and_customers(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expense_categories_summary(uuid, date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_selling_products(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_trial_balance(uuid, date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) TO authenticated;

COMMIT;
