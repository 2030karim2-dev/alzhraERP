-- Migration: 20260921000001_optimize_dashboard_rpcs_and_covering_indexes.sql
-- Description: High-performance hardening of dashboard analytical RPCs and covering indexes
-- Prevents statement_timeout (8s) during concurrent dashboard queries under production load.

-- 1. Pure In-Memory IMMUTABLE PARALLEL SAFE Base Amount Conversion
CREATE OR REPLACE FUNCTION public.fn_to_base_amount(p_currency_code text, p_amount numeric, p_exchange_rate numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
DECLARE
  v_code text;
  v_rate numeric;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN 0;
  END IF;

  v_code := UPPER(TRIM(COALESCE(p_currency_code, 'SAR')));
  IF v_code = 'SAR' THEN
    RETURN ROUND(p_amount, 4);
  END IF;

  v_rate := COALESCE(p_exchange_rate, 1);
  IF v_rate <= 0 THEN
    RETURN ROUND(p_amount, 4);
  END IF;

  -- معدل معكوس مخزّن (مثل 0.002439 = 1/410) -> الضرب يعادل القسمة على المقلوب
  IF v_rate < 1 THEN
    RETURN ROUND(p_amount * v_rate, 4);
  END IF;

  -- ريال يمني: معامل القسمة divide (amount / rate)
  IF v_code = 'YER' THEN
    RETURN ROUND(p_amount / v_rate, 4);
  END IF;

  -- باقي العملات: ضرب multiply (USD, OMR, CNY, etc.)
  RETURN ROUND(p_amount * v_rate, 4);
END;
$function$;

-- 2. Covering Indexes for Dashboard Aggregations
CREATE INDEX IF NOT EXISTS idx_payments_dashboard_cov 
ON public.payments (company_id, status, payment_date) 
INCLUDE (type, amount, currency_code, exchange_rate, branch_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_debt_promises_comp_party 
ON public.debt_payment_promises (company_id, party_id);

CREATE INDEX IF NOT EXISTS idx_accounts_company_type 
ON public.accounts (company_id, type) 
WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_invoice_items_top_products;
CREATE INDEX idx_invoice_items_top_products 
ON public.invoice_items USING btree (company_id, invoice_id) 
INCLUDE (product_id, quantity, total, cost_price);

-- 3. Optimized get_dashboard_summary
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
    vc uuid;
    v_auth_branches uuid[];
    v_target_branch uuid;
    v_opening_cust_debts NUMERIC := 0;
    v_opening_supp_debts NUMERIC := 0;
    v_res jsonb;
BEGIN
    vc := public.verify_company_access(p_company_id);
    
    SELECT array_agg(b) INTO v_auth_branches
    FROM public.get_auth_branches(vc) b;

    IF v_auth_branches IS NULL OR array_length(v_auth_branches, 1) = 0 THEN
        IF public.is_super_admin() OR current_user IN ('postgres', 'supabase_admin') THEN
            SELECT array_agg(id) INTO v_auth_branches FROM public.branches WHERE company_id = vc;
        END IF;
    END IF;

    IF v_auth_branches IS NULL OR array_length(v_auth_branches, 1) = 0 THEN
        RETURN jsonb_build_object(
            'total_sales', 0, 'total_purchases', 0, 'total_expenses', 0,
            'receipt_bonds', 0, 'payment_bonds', 0, 'total_debts', 0,
            'total_supplier_debts', 0, 'invoice_count', 0
        );
    END IF;

    IF p_branch_id IS NOT NULL THEN
        IF NOT (p_branch_id = ANY(v_auth_branches)) THEN
            RAISE EXCEPTION 'غير مصرح بالوصول إلى بيانات هذا الفرع' USING ERRCODE = '42501';
        END IF;
        v_target_branch := p_branch_id;
    END IF;

    -- 1. Opening balances CTE
    WITH latest_rates AS (
      SELECT DISTINCT ON (currency_code) currency_code, rate_to_base
      FROM public.exchange_rates
      WHERE company_id = vc
      ORDER BY currency_code, effective_date DESC, created_at DESC
    )
    SELECT 
      COALESCE(SUM(CASE WHEN p.type = 'customer' THEN
        public.fn_to_base_amount(ob.currency_code, ob.amount, lr.rate_to_base) * CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END
      ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN p.type = 'supplier' THEN
        public.fn_to_base_amount(ob.currency_code, ob.amount, lr.rate_to_base) * CASE WHEN ob.direction = 'credit' THEN 1 ELSE -1 END
      ELSE 0 END), 0)
    INTO v_opening_cust_debts, v_opening_supp_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.deleted_at IS NULL AND p.type IN ('customer', 'supplier')
    LEFT JOIN latest_rates lr ON lr.currency_code = (ob.currency_code)::text
    WHERE ob.company_id = vc
      AND (
        (v_target_branch IS NOT NULL AND (ob.branch_id = v_target_branch OR p.branch_id = v_target_branch))
        OR (v_target_branch IS NULL AND (ob.branch_id = ANY(v_auth_branches) OR ob.branch_id IS NULL))
      );

    -- 2. Invoices summary
    WITH inv_summary AS (
      SELECT
        COALESCE(ROUND(SUM(CASE
          WHEN i.type = 'sale' AND i.status IN ('posted','paid','confirmed','partially_paid')
               AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
               AND (p_date_to IS NULL OR i.issue_date <= p_date_to) THEN
            public.fn_to_base_amount(i.currency_code, i.total_amount, i.exchange_rate)
          WHEN i.type IN ('sale_return', 'return_sale') AND i.status IN ('posted','paid','confirmed','partially_paid')
               AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
               AND (p_date_to IS NULL OR i.issue_date <= p_date_to) THEN
            -1 * public.fn_to_base_amount(i.currency_code, i.total_amount, i.exchange_rate)
          ELSE 0
        END), 2), 0) AS total_sales,

        COALESCE(ROUND(SUM(CASE
          WHEN i.type = 'purchase' AND i.status IN ('posted','paid','confirmed','partially_paid')
               AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
               AND (p_date_to IS NULL OR i.issue_date <= p_date_to) THEN
            public.fn_to_base_amount(i.currency_code, i.total_amount, i.exchange_rate)
          WHEN i.type IN ('purchase_return', 'return_purchase') AND i.status IN ('posted','paid','confirmed','partially_paid')
               AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
               AND (p_date_to IS NULL OR i.issue_date <= p_date_to) THEN
            -1 * public.fn_to_base_amount(i.currency_code, i.total_amount, i.exchange_rate)
          ELSE 0
        END), 2), 0) AS total_purchases,

        COALESCE(ROUND(SUM(CASE
          WHEN i.type = 'sale' AND i.status IN ('posted','confirmed','partially_paid')
               AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0 THEN
            public.fn_to_base_amount(i.currency_code, i.total_amount - COALESCE(i.paid_amount, 0), i.exchange_rate)
          ELSE 0
        END), 2), 0) AS total_debts,

        COALESCE(ROUND(SUM(CASE
          WHEN i.type = 'purchase' AND i.status IN ('posted','confirmed','partially_paid')
               AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0 THEN
            public.fn_to_base_amount(i.currency_code, i.total_amount - COALESCE(i.paid_amount, 0), i.exchange_rate)
          ELSE 0
        END), 2), 0) AS total_supplier_debts,

        COUNT(*) FILTER (
          WHERE i.type = 'sale' AND i.status NOT IN ('draft', 'void')
            AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
            AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
        ) AS invoice_count

      FROM public.invoices i
      WHERE i.company_id = vc
        AND i.deleted_at IS NULL
        AND (
          (v_target_branch IS NOT NULL AND i.branch_id = v_target_branch)
          OR (v_target_branch IS NULL AND (i.branch_id = ANY(v_auth_branches) OR i.branch_id IS NULL))
        )
    ),
    pay_summary AS (
      SELECT
        COALESCE(ROUND(SUM(CASE WHEN p.type = 'receipt' THEN
          public.fn_to_base_amount(p.currency_code, p.amount, p.exchange_rate)
        ELSE 0 END), 2), 0) AS receipt_bonds,
        COALESCE(ROUND(SUM(CASE WHEN p.type = 'disbursement' THEN
          public.fn_to_base_amount(p.currency_code, p.amount, p.exchange_rate)
        ELSE 0 END), 2), 0) AS payment_bonds
      FROM public.payments p
      WHERE p.company_id = vc AND p.status = 'posted' AND p.deleted_at IS NULL
        AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
        AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
        AND (
          (v_target_branch IS NOT NULL AND p.branch_id = v_target_branch)
          OR (v_target_branch IS NULL AND (p.branch_id = ANY(v_auth_branches) OR p.branch_id IS NULL))
        )
    ),
    exp_summary AS (
      SELECT
        COALESCE(ROUND(SUM(
          public.fn_to_base_amount(e.currency_code, e.amount, e.exchange_rate)
        ), 2), 0) AS total_expenses
      FROM public.expenses e
      WHERE e.company_id = vc AND e.status IN ('posted','paid') AND e.deleted_at IS NULL
        AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
        AND (p_date_to IS NULL OR e.expense_date <= p_date_to)
        AND (
          (v_target_branch IS NOT NULL AND e.branch_id = v_target_branch)
          OR (v_target_branch IS NULL AND (e.branch_id = ANY(v_auth_branches) OR e.branch_id IS NULL))
        )
    )
    SELECT jsonb_build_object(
      'total_sales', inv.total_sales,
      'total_purchases', inv.total_purchases,
      'total_expenses', exp.total_expenses,
      'receipt_bonds', pay.receipt_bonds,
      'payment_bonds', pay.payment_bonds,
      'total_debts', inv.total_debts + v_opening_cust_debts,
      'total_supplier_debts', inv.total_supplier_debts + v_opening_supp_debts,
      'invoice_count', inv.invoice_count
    ) INTO v_res
    FROM inv_summary inv
    CROSS JOIN pay_summary pay
    CROSS JOIN exp_summary exp;

    RETURN v_res;
END;
$function$;

-- 4. Optimized get_top_products_and_customers (Index-friendly 30d window with 500-invoice fallback)
CREATE OR REPLACE FUNCTION public.get_top_products_and_customers(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 5)
 RETURNS TABLE(top_products jsonb, top_customers jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_top_products  jsonb := '[]'::jsonb;
  v_top_customers jsonb := '[]'::jsonb;
  v_cutoff        date := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Top Products: 30-day window first
  WITH top_p AS (
    SELECT
      ii.product_id,
      SUM(ii.quantity)  AS total_quantity,
      SUM(ii.total)     AS total_revenue
    FROM public.invoices i
    JOIN public.invoice_items ii
      ON ii.invoice_id  = i.id
     AND ii.company_id  = p_company_id
    WHERE i.company_id  = p_company_id
      AND i.type        = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.deleted_at  IS NULL
      AND i.issue_date >= v_cutoff
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    GROUP BY ii.product_id
    ORDER BY total_revenue DESC
    LIMIT p_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name',           p.name_ar,
      'sku',            p.sku,
      'total_quantity', tp.total_quantity,
      'total_revenue',  tp.total_revenue,
      'price',          p.sale_price,
      'image_url',      p.image_url
    )
  ), '[]'::jsonb) INTO v_top_products
  FROM top_p tp
  JOIN public.products p ON p.id = tp.product_id;

  -- Fallback: most recent 500 invoices if 30d returned nothing
  IF v_top_products IS NULL OR jsonb_array_length(v_top_products) = 0 THEN
    WITH recent_inv AS (
      SELECT id
      FROM public.invoices
      WHERE company_id = p_company_id
        AND type = 'sale'
        AND status IN ('posted', 'paid', 'partially_paid')
        AND deleted_at IS NULL
        AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      ORDER BY issue_date DESC, id DESC
      LIMIT 500
    ),
    top_p_recent AS (
      SELECT
        ii.product_id,
        SUM(ii.quantity)  AS total_quantity,
        SUM(ii.total)     AS total_revenue
      FROM recent_inv r
      JOIN public.invoice_items ii
        ON ii.invoice_id = r.id
       AND ii.company_id = p_company_id
      GROUP BY ii.product_id
      ORDER BY total_revenue DESC
      LIMIT p_limit
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'name',           p.name_ar,
        'sku',            p.sku,
        'total_quantity', tp.total_quantity,
        'total_revenue',  tp.total_revenue,
        'price',          p.sale_price,
        'image_url',      p.image_url
      )
    ), '[]'::jsonb) INTO v_top_products
    FROM top_p_recent tp
    JOIN public.products p ON p.id = tp.product_id;
  END IF;

  -- Top Customers: 30-day window first
  WITH top_c AS (
    SELECT
      i.party_id,
      SUM(i.total_amount) AS total_revenue,
      COUNT(*)            AS invoice_count
    FROM public.invoices i
    WHERE i.company_id  = p_company_id
      AND i.type        = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.deleted_at  IS NULL
      AND i.party_id    IS NOT NULL
      AND i.issue_date >= v_cutoff
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    GROUP BY i.party_id
    ORDER BY total_revenue DESC
    LIMIT p_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name',          pr.name,
      'total_revenue', tc.total_revenue,
      'invoice_count', tc.invoice_count,
      'phone',         pr.phone,
      'email',         pr.email
    )
  ), '[]'::jsonb) INTO v_top_customers
  FROM top_c tc
  JOIN public.parties pr ON pr.id = tc.party_id;

  -- Fallback: most recent 500 invoices for customers
  IF v_top_customers IS NULL OR jsonb_array_length(v_top_customers) = 0 THEN
    WITH recent_inv AS (
      SELECT party_id, total_amount
      FROM public.invoices
      WHERE company_id = p_company_id
        AND type = 'sale'
        AND status IN ('posted', 'paid', 'partially_paid')
        AND deleted_at IS NULL
        AND party_id IS NOT NULL
        AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      ORDER BY issue_date DESC, id DESC
      LIMIT 500
    ),
    top_c_recent AS (
      SELECT
        r.party_id,
        SUM(r.total_amount) AS total_revenue,
        COUNT(*)            AS invoice_count
      FROM recent_inv r
      GROUP BY r.party_id
      ORDER BY total_revenue DESC
      LIMIT p_limit
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'name',          pr.name,
        'total_revenue', tc.total_revenue,
        'invoice_count', tc.invoice_count,
        'phone',         pr.phone,
        'email',         pr.email
      )
    ), '[]'::jsonb) INTO v_top_customers
    FROM top_c_recent tc
    JOIN public.parties pr ON pr.id = tc.party_id;
  END IF;

  top_products  := COALESCE(v_top_products, '[]'::jsonb);
  top_customers := COALESCE(v_top_customers, '[]'::jsonb);
  RETURN NEXT;
END;
$function$;

-- 5. Optimized get_debt_followup_dashboard (Cached Auth & p_limit support)
CREATE OR REPLACE FUNCTION public.get_debt_followup_dashboard(
    p_company_id uuid,
    p_due_soon_days integer DEFAULT 7,
    p_critical_days integer DEFAULT 30,
    p_reminder_window_days integer DEFAULT 3,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_limit integer DEFAULT NULL::integer
)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, currency_code text, outstanding_balance numeric, overdue_amount numeric, oldest_due_date date, next_due_date date, days_overdue integer, classification text, reminder_status text, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, pending_promise_date date, invoice_count bigint, opening_balance numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_allowed_branches uuid[];
    v_target_branches uuid[];
    v_is_super boolean;
    v_has_all_branches boolean := false;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    v_is_super := public.is_super_admin();

    SELECT ARRAY_AGG(b) INTO v_allowed_branches
    FROM public.get_auth_branches(p_company_id) AS b;

    IF v_allowed_branches IS NULL OR ARRAY_LENGTH(v_allowed_branches, 1) = 0 THEN
        IF v_is_super OR current_user IN ('postgres', 'supabase_admin') THEN
            SELECT ARRAY_AGG(id) INTO v_allowed_branches FROM public.branches WHERE company_id = p_company_id;
        ELSE
            RETURN;
        END IF;
    END IF;

    IF p_branch_id IS NOT NULL THEN
        IF NOT (p_branch_id = ANY(v_allowed_branches)) AND NOT v_is_super THEN
            RETURN;
        END IF;
        v_target_branches := ARRAY[p_branch_id];
    ELSE
        v_target_branches := v_allowed_branches;
        SELECT (COUNT(*) = (SELECT COUNT(*) FROM public.branches WHERE company_id = p_company_id))
        INTO v_has_all_branches
        FROM unnest(v_allowed_branches);
    END IF;

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
          AND i.status IN ('posted', 'confirmed', 'partially_paid')
          AND i.deleted_at IS NULL
          AND i.party_id IS NOT NULL
          AND (v_is_super OR v_has_all_branches OR i.branch_id = ANY(v_target_branches))
        GROUP BY i.party_id, i.currency_code
    ),
    opening_balances AS (
        SELECT
            ob.party_id,
            ob.currency_code,
            SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END) AS opening_amount
        FROM public.party_opening_balances ob
        WHERE ob.company_id = p_company_id
          AND (v_is_super OR v_has_all_branches OR ob.branch_id = ANY(v_target_branches))
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
            WHEN c.next_due_date = v_today THEN 'due_today'
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
      AND (v_is_super OR v_has_all_branches OR p.branch_id = ANY(v_target_branches))
    LEFT JOIN public.party_categories pc ON pc.id = p.category_id
    LEFT JOIN promise_summary ps ON ps.party_id = c.party_id
    LEFT JOIN last_reminders lr ON lr.party_id = c.party_id
    LEFT JOIN last_contacts lc ON lc.customer_id = c.party_id
    WHERE c.outstanding_balance > 0
    ORDER BY c.overdue_amount DESC NULLS LAST, days_overdue DESC NULLS LAST
    LIMIT p_limit;
END;
$function$;

-- 6. Optimized get_sales_chart_data
CREATE OR REPLACE FUNCTION public.get_sales_chart_data(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS TABLE(name text, date date, value numeric, sales numeric, purchases numeric, expenses numeric, profit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  vc uuid;
  v_from date := COALESCE(p_date_from, (CURRENT_DATE - INTERVAL '30 days')::date);
  v_to date := COALESCE(p_date_to, CURRENT_DATE);
BEGIN
  vc := public.verify_company_access(p_company_id);

  RETURN QUERY
  WITH days AS (
    SELECT d::date AS dt
    FROM generate_series(v_from, v_to, '1 day'::interval) d
  ),
  inv_daily AS (
    SELECT
      i.issue_date,
      COALESCE(SUM(CASE
        WHEN i.type = 'sale' THEN
          public.fn_to_base_amount(i.currency_code, i.total_amount, i.exchange_rate)
        WHEN i.type IN ('sale_return', 'return_sale') THEN
          -1 * public.fn_to_base_amount(i.currency_code, i.total_amount, i.exchange_rate)
        ELSE 0
      END), 0) AS daily_sales,
      COALESCE(SUM(CASE
        WHEN i.type = 'purchase' THEN
          public.fn_to_base_amount(i.currency_code, i.total_amount, i.exchange_rate)
        WHEN i.type IN ('purchase_return', 'return_purchase') THEN
          -1 * public.fn_to_base_amount(i.currency_code, i.total_amount, i.exchange_rate)
        ELSE 0
      END), 0) AS daily_purchases
    FROM public.invoices i
    WHERE i.company_id = vc
      AND i.status IN ('posted', 'confirmed', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND i.deleted_at IS NULL
    GROUP BY i.issue_date
  ),
  exp_daily AS (
    SELECT
      e.expense_date,
      COALESCE(SUM(
        public.fn_to_base_amount(e.currency_code, e.amount, e.exchange_rate)
      ), 0) AS daily_expenses
    FROM public.expenses e
    WHERE e.company_id = vc
      AND e.status IN ('posted', 'paid')
      AND e.expense_date BETWEEN v_from AND v_to
      AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
      AND e.deleted_at IS NULL
    GROUP BY e.expense_date
  )
  SELECT
    to_char(d.dt, 'YYYY-MM-DD') AS name,
    d.dt AS date,
    ROUND(COALESCE(inv.daily_sales, 0), 2) AS value,
    ROUND(COALESCE(inv.daily_sales, 0), 2) AS sales,
    GREATEST(ROUND(COALESCE(inv.daily_purchases, 0), 2), 0) AS purchases,
    GREATEST(ROUND(COALESCE(exp.daily_expenses, 0), 2), 0) AS expenses,
    ROUND(COALESCE(inv.daily_sales, 0) - COALESCE(inv.daily_purchases, 0) - COALESCE(exp.daily_expenses, 0), 2) AS profit
  FROM days d
  LEFT JOIN inv_daily inv ON inv.issue_date = d.dt
  LEFT JOIN exp_daily exp ON exp.expense_date = d.dt
  ORDER BY d.dt ASC;
END;
$function$;

-- 7. Optimized report_trial_balance
CREATE OR REPLACE FUNCTION public.report_trial_balance(p_company_id uuid, p_from date, p_to date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(account_code text, account_id uuid, account_name text, account_type text, balance numeric, total_debit numeric, total_credit numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_from date := COALESCE(p_from, make_date(EXTRACT(YEAR FROM COALESCE(p_to, CURRENT_DATE))::int, 1, 1));
  v_to   date := COALESCE(p_to, CURRENT_DATE);
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  RETURN QUERY
  WITH line_totals AS (
     SELECT 
        l.account_id, 
        SUM(l.debit_amount) as debit_amount, 
        SUM(l.credit_amount) as credit_amount,
        SUM(l.debit_amount) - SUM(l.credit_amount) as balance
     FROM public.journal_entries j
     JOIN public.journal_entry_lines l 
       ON l.journal_entry_id = j.id 
      AND l.company_id = p_company_id 
      AND l.deleted_at IS NULL
     WHERE j.company_id = p_company_id
       AND j.status = 'posted'
       AND j.deleted_at IS NULL
       AND j.entry_date BETWEEN v_from AND v_to
       AND (p_branch_id IS NULL OR j.branch_id = p_branch_id)
     GROUP BY l.account_id
  )
  SELECT 
    a.code AS account_code,
    a.id AS account_id,
    a.name_ar AS account_name,
    a.type AS account_type,
    COALESCE(lt.balance, 0) as balance,
    COALESCE(lt.debit_amount, 0) as total_debit,
    COALESCE(lt.credit_amount, 0) as total_credit
  FROM public.accounts a
  LEFT JOIN line_totals lt ON lt.account_id = a.id
  WHERE a.company_id = p_company_id
    AND a.is_active = true
    AND a.deleted_at IS NULL
  ORDER BY a.code;
END;
$function$;
