-- Migration to patch SECURITY DEFINER RPCs with verify_company_access

CREATE OR REPLACE FUNCTION public.get_company_settings(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN jsonb_build_object(
    'company',    (SELECT row_to_json(c) FROM companies c WHERE c.id = p_company_id),
    'warehouses', (SELECT json_agg(row_to_json(w) ORDER BY w.is_primary DESC, w.name_ar)
                   FROM warehouses w WHERE w.company_id = p_company_id AND w.deleted_at IS NULL),
    'tax_rates',  (SELECT json_agg(row_to_json(t) ORDER BY t.is_default DESC, t.percentage)
                   FROM tax_rates t WHERE t.company_id = p_company_id AND t.deleted_at IS NULL AND t.is_active),
    'fiscal_years',(SELECT json_agg(row_to_json(fy) ORDER BY fy.start_date DESC)
                   FROM fiscal_years fy WHERE fy.company_id = p_company_id),
    'current_fiscal_year', (
                   SELECT row_to_json(fy) FROM fiscal_years fy
                   WHERE fy.company_id = p_company_id
                     AND CURRENT_DATE BETWEEN fy.start_date AND fy.end_date
                     AND fy.is_closed = false
                   LIMIT 1),
    'messaging',  (SELECT row_to_json(mc) FROM messaging_config mc WHERE mc.company_id = p_company_id),
    'currencies', (SELECT json_agg(row_to_json(sc)) FROM supported_currencies sc),
    'exchange_rates', (
                   SELECT json_agg(row_to_json(er) ORDER BY er.effective_date DESC)
                   FROM exchange_rates er WHERE er.company_id = p_company_id
                     AND er.effective_date = (
                       SELECT MAX(er2.effective_date) FROM exchange_rates er2
                       WHERE er2.company_id = p_company_id AND er2.currency_code = er.currency_code
                     )
                  ),
    'team_members',(SELECT json_agg(json_build_object(
                     'user_id', ucr.user_id,
                     'role',    ucr.role,
                     'full_name',pr.full_name,
                     'avatar_url',pr.avatar_url
                   ) ORDER BY ucr.role, pr.full_name)
                   FROM user_company_roles ucr
                   LEFT JOIN profiles pr ON pr.id = ucr.user_id
                   WHERE ucr.company_id = p_company_id)
  );
END;
$function$

-- ===== get_customer_stats =====


CREATE OR REPLACE FUNCTION public.get_customer_stats(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result json;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT json_build_object(
    'totalCustomers',COUNT(*),'activeCustomers',COUNT(*) FILTER (WHERE p.status='active'),
    'newThisMonth',COUNT(*) FILTER (WHERE p.customer_since>=DATE_TRUNC('month',CURRENT_DATE)),
    'avgInvoicesPerCustomer',COALESCE(AVG(p.total_invoices_count),0),
    'totalOutstanding',COALESCE(SUM(pb.balance),0),
    'highValueCustomers',COUNT(*) FILTER (WHERE p.total_paid_amount>10000))
  INTO result FROM parties p LEFT JOIN party_balances pb ON p.id=pb.party_id
  WHERE p.company_id=p_company_id AND p.type='customer' AND p.deleted_at IS NULL;
  RETURN result;
END;$function$

-- ===== get_dashboard_summary =====


CREATE OR REPLACE FUNCTION public.get_dashboard_totals(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sales numeric; v_purchases numeric; v_expenses numeric;
  v_debts numeric; v_supplier_debts numeric;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT COALESCE(SUM(total_amount),0) INTO v_sales FROM invoices
    WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id=p_branch_id) AND type='sale' AND status!='void' AND deleted_at IS NULL;
  SELECT COALESCE(SUM(total_amount),0) INTO v_purchases FROM invoices
    WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id=p_branch_id) AND type='purchase' AND status!='void' AND deleted_at IS NULL;
  SELECT COALESCE(SUM(amount),0) INTO v_expenses FROM expenses
    WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id=p_branch_id) AND status!='void' AND deleted_at IS NULL;
  SELECT COALESCE(SUM(balance),0) INTO v_debts FROM party_balances
    WHERE company_id=p_company_id AND type='customer' AND balance>0;
  SELECT COALESCE(SUM(balance),0) INTO v_supplier_debts FROM party_balances
    WHERE company_id=p_company_id AND type='supplier' AND balance>0;
  RETURN json_build_object(
    'total_sales',v_sales,'total_purchases',v_purchases,
    'total_expenses',v_expenses,'total_debts',v_debts,'total_supplier_debts',v_supplier_debts);
END;$function$

-- ===== get_dead_stock =====


CREATE OR REPLACE FUNCTION public.get_dead_stock(p_company_id uuid, days_threshold integer DEFAULT 90, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name_ar text, sku text, part_number text, stock_quantity integer, cost_price numeric, total_value numeric, last_sale_date date, days_since_last_sale integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT p.id, p.name_ar::text, p.sku::text, p.part_number::text, COALESCE(SUM(ps.quantity),0)::integer,
    p.cost_price, (COALESCE(SUM(ps.quantity),0)*p.cost_price)::numeric, MAX(inv.issue_date), (CURRENT_DATE-MAX(inv.issue_date))::integer
  FROM public.products p
  LEFT JOIN public.product_stock ps ON ps.product_id=p.id
  LEFT JOIN public.invoice_items ii ON ii.product_id=p.id
  LEFT JOIN public.invoices inv ON inv.id=ii.invoice_id AND inv.type='sale' AND inv.status NOT IN ('cancelled','void') AND inv.deleted_at IS NULL
  WHERE p.company_id=p_company_id AND p.deleted_at IS NULL AND p.status='active'
  GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.cost_price
  HAVING COALESCE(SUM(ps.quantity),0) > 0 AND (MAX(inv.issue_date) IS NULL OR (CURRENT_DATE-MAX(inv.issue_date)) > days_threshold)
  ORDER BY (COALESCE(SUM(ps.quantity),0)*p.cost_price) DESC LIMIT p_limit OFFSET p_offset;
END;
$function$

-- ===== get_debt_analytics_summary =====


CREATE OR REPLACE FUNCTION public.get_debt_analytics_summary(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
DECLARE v_result JSON;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
SELECT json_build_object(
        'total_receivables',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'overdue_receivables',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
                  AND i.due_date < v_today
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'due_today',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
                  AND i.due_date = v_today
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'opening_balances_total',
            COALESCE((SELECT SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
                FROM public.party_opening_balances ob
                WHERE ob.company_id = p_company_id), 0)::NUMERIC,
        'pending_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'pending'), 0),
        'pending_promises_amount',
            COALESCE((SELECT SUM(amount) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'pending'), 0)::NUMERIC,
        'broken_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'broken'), 0),
        'broken_promises_amount',
            COALESCE((SELECT SUM(amount) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'broken'), 0)::NUMERIC,
        'sent_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'sent'), 0),
        'failed_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'), 0),
        'failed_messages_24h',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'
                  AND created_at >= NOW() - INTERVAL '24 hours'), 0),
        'total_debtors',
            COALESCE((SELECT COUNT(*)::INT
                FROM public.get_debt_followup_dashboard(p_company_id)), 0),
        'needs_reminder',
            COALESCE((SELECT COUNT(*)::INT
                FROM public.get_debt_followup_dashboard(p_company_id)
                WHERE reminder_status = 'needs_reminder'), 0),
        'by_currency',
            (SELECT json_agg(json_build_object(
                'currency', x.currency_code,
                'balance', x.balance,
                'count', x.transaction_count))
             FROM public.party_balances_by_currency x
             WHERE x.company_id = p_company_id AND x.balance > 0)
    ) INTO v_result;
    RETURN v_result;
END;
$function$

-- ===== get_debt_followup_dashboard =====


CREATE OR REPLACE FUNCTION public.get_debt_followup_dashboard(p_company_id uuid, p_due_soon_days integer DEFAULT 7, p_critical_days integer DEFAULT 30, p_reminder_window_days integer DEFAULT 3)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, currency_code text, outstanding_balance numeric, overdue_amount numeric, oldest_due_date date, next_due_date date, days_overdue integer, classification text, reminder_status text, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, pending_promise_date date, invoice_count bigint, opening_balance numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== get_debt_party_overview =====


CREATE OR REPLACE FUNCTION public.get_debt_party_overview(p_company_id uuid, p_party_id uuid)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, total_outstanding numeric, overdue_amount numeric, due_today_amount numeric, invoice_count bigint, opening_balance numeric, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
RETURN QUERY
    SELECT
        p.id AS party_id,
        p.name::TEXT AS party_name,
        p.phone::TEXT AS party_phone,
        COALESCE(pc.name, 'عام')::TEXT AS category,
        p.credit_limit,
        COALESCE(SUM(CASE WHEN i.id IS NOT NULL
            THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0)::NUMERIC
            + COALESCE((SELECT SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
                FROM public.party_opening_balances ob
                WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id), 0)::NUMERIC
            AS total_outstanding,
        COALESCE(SUM(CASE WHEN i.due_date < v_today
            THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0)::NUMERIC AS overdue_amount,
        COALESCE(SUM(CASE WHEN i.due_date = v_today
            THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0)::NUMERIC AS due_today_amount,
        COUNT(i.id) AS invoice_count,
        COALESCE((SELECT SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
            FROM public.party_opening_balances ob
            WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id), 0)::NUMERIC AS opening_balance,
        EXISTS (SELECT 1 FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'broken') AS has_broken_promise,
        COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'pending'), 0)::BIGINT AS pending_promise_count,
        COALESCE((SELECT SUM(pp.amount) FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'pending'), 0)::NUMERIC AS pending_promise_amount,
        (SELECT ml.created_at FROM public.debt_message_log ml
            WHERE ml.company_id = p_company_id AND ml.party_id = p_party_id
              AND ml.status = 'sent'
            ORDER BY ml.created_at DESC LIMIT 1) AS last_reminded_at,
        (SELECT ca.created_at FROM public.customer_activities ca
            WHERE ca.company_id = p_company_id AND ca.customer_id = p_party_id
            ORDER BY ca.created_at DESC LIMIT 1) AS last_contact_date
    FROM public.parties p
    LEFT JOIN public.party_categories pc ON pc.id = p.category_id
    LEFT JOIN public.invoices i
        ON i.party_id = p.id AND i.company_id = p_company_id
        AND i.type = 'sale' AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
    WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.phone, pc.name, p.credit_limit;
END;
$function$

-- ===== get_debt_today_tasks =====


CREATE OR REPLACE FUNCTION public.get_debt_today_tasks(p_company_id uuid)
 RETURNS TABLE(task_type character varying, party_id uuid, party_name text, party_phone text, currency_code text, amount numeric, reference_info text, urgency character varying)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
RETURN QUERY
    SELECT * FROM (
        SELECT 'due_today'::VARCHAR AS task_type,
            i.party_id, p.name::TEXT AS party_name, p.phone::TEXT AS party_phone,
            i.currency_code::TEXT AS currency_code,
            (i.total_amount - COALESCE(i.paid_amount, 0))::NUMERIC AS amount,
            COALESCE(i.invoice_number, i.id::TEXT)::TEXT AS reference_info,
            'high'::VARCHAR AS urgency
        FROM public.invoices i
        JOIN public.parties p ON p.id = i.party_id AND p.deleted_at IS NULL
        WHERE i.company_id = p_company_id
          AND i.type = 'sale' AND i.status IN ('posted', 'partial')
          AND i.due_date = v_today AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0

        UNION ALL
        SELECT 'promise_due'::VARCHAR,
            pp.party_id, p.name::TEXT, p.phone::TEXT,
            pp.currency_code::TEXT,
            pp.amount,
            ('وعد ' || to_char(pp.promise_date, 'YYYY-MM-DD'))::TEXT,
            'high'::VARCHAR
        FROM public.debt_payment_promises pp
        JOIN public.parties p ON p.id = pp.party_id AND p.deleted_at IS NULL
        WHERE pp.company_id = p_company_id AND pp.status = 'pending'
          AND pp.promise_date = v_today

        UNION ALL
        SELECT 'broken_promise'::VARCHAR,
            pp.party_id, p.name::TEXT, p.phone::TEXT,
            pp.currency_code::TEXT,
            pp.amount,
            ('وعد متجاوز ' || to_char(pp.promise_date, 'YYYY-MM-DD'))::TEXT,
            'critical'::VARCHAR
        FROM public.debt_payment_promises pp
        JOIN public.parties p ON p.id = pp.party_id AND p.deleted_at IS NULL
        WHERE pp.company_id = p_company_id AND pp.status = 'pending'
          AND pp.promise_date < v_today

        UNION ALL
        SELECT 'failed_message'::VARCHAR,
            dm.party_id, p.name::TEXT, p.phone::TEXT,
            NULL::TEXT AS currency_code,
            NULL::NUMERIC AS amount,
            COALESCE(dm.error_info, 'رسالة فاشلة')::TEXT AS reference_info,
            'medium'::VARCHAR
        FROM public.debt_message_log dm
        JOIN public.parties p ON p.id = dm.party_id AND p.deleted_at IS NULL
        WHERE dm.company_id = p_company_id AND dm.status = 'failed'
          AND dm.created_at::DATE = v_today
    ) sub
    ORDER BY CASE sub.urgency
        WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
        sub.amount DESC NULLS LAST;
END;
$function$

-- ===== get_expense_categories_summary =====


CREATE OR REPLACE FUNCTION public.get_expense_categories_summary(p_company_id uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(category_name text, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== get_expense_stats =====


CREATE OR REPLACE FUNCTION public.get_inventory_valuation(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_cost numeric; v_market numeric; v_prods bigint; v_stock numeric;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  SELECT COALESCE(SUM(ps.quantity*p.cost_price),0),
    COALESCE(SUM(ps.quantity*p.sale_price),0),
    COUNT(DISTINCT p.id), COALESCE(SUM(ps.quantity),0)
  INTO v_cost,v_market,v_prods,v_stock
  FROM products p LEFT JOIN product_stock ps ON p.id=ps.product_id
  WHERE p.company_id=p_company_id AND p.deleted_at IS NULL;
  RETURN json_build_object('costValue',v_cost,'marketValue',v_market,
    'profit',v_market-v_cost,
    'profitMargin',CASE WHEN v_cost>0 THEN ROUND((v_market-v_cost)/v_cost*100,2) ELSE 0 END,
    'totalProducts',v_prods,'totalStock',v_stock);
END;$function$

-- ===== get_invoice_with_items =====


CREATE OR REPLACE FUNCTION public.get_item_movements_with_balance(p_company_id uuid, p_product_id uuid)
 RETURNS TABLE(id uuid, date timestamp with time zone, quantity numeric, transaction_type text, original_type text, reference_type text, source_user text, source_name text, document_number text, notes text, raw_quantity numeric, balance_after numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  RETURN QUERY
  WITH raw AS (
    SELECT m.id, m.created_at AS date, m.quantity AS db_qty,
      m.transaction_type AS original_type, m.reference_type, m.reference_id,
      ''::text AS notes,
      COALESCE(u.email,'System') AS source_user
    FROM inventory_transactions m
    LEFT JOIN auth.users u ON m.created_by=u.id
    WHERE m.product_id=p_product_id AND m.company_id=p_company_id AND m.deleted_at IS NULL
  ),
  res_inv AS (
    SELECT r.id,
      CASE WHEN i.type='sale' THEN 'فاتورة بيع #'||i.invoice_number
           WHEN i.type='purchase' THEN 'فاتورة شراء #'||i.invoice_number
           WHEN i.type='sale_return' THEN 'مردود مبيعات #'||i.invoice_number
           WHEN i.type='purchase_return' THEN 'مردود مشتريات #'||i.invoice_number
           ELSE 'فاتورة #'||i.invoice_number END AS doc_num,
      COALESCE(p.name,'---') AS src_name
    FROM raw r JOIN invoices i ON r.reference_id=i.id
    LEFT JOIN parties p ON i.party_id=p.id
    WHERE r.reference_type ILIKE '%invoice%'
  ),
  res_tr AS (
    SELECT r.id,'مناقلة مخزنية' AS doc_num,
      COALESCE(wf.name_ar,'?')||' ◄ '||COALESCE(wt.name_ar,'?') AS src_name
    FROM raw r JOIN stock_transfers t ON r.reference_id=t.id
    LEFT JOIN warehouses wf ON t.from_warehouse_id=wf.id
    LEFT JOIN warehouses wt ON t.to_warehouse_id=wt.id
    WHERE r.reference_type='transfer'
  ),
  proc AS (
    SELECT r.id, r.date, ABS(COALESCE(r.db_qty,0)) AS quantity,
      CASE WHEN r.original_type IN('purchase','sales_return','adj_in','transfer_in','initial') THEN 'in'
           WHEN r.original_type IN('sales','purchase_return','adj_out','transfer_out') THEN 'out'
           ELSE CASE WHEN COALESCE(r.db_qty,0)>0 THEN 'in' ELSE 'out' END END AS transaction_type,
      r.original_type, r.reference_type, r.source_user::text,
      COALESCE(i.src_name, t.src_name,
        CASE WHEN r.reference_type='audit' THEN 'تسوية جردية' ELSE '---' END)::text AS source_name,
      COALESCE(i.doc_num, t.doc_num,
        CASE WHEN r.reference_type='audit' THEN 'جرد مخزني' ELSE '---' END)::text AS document_number,
      COALESCE(r.notes,'')::text AS notes,
      COALESCE(r.db_qty,0) AS raw_quantity
    FROM raw r
    LEFT JOIN res_inv i ON r.id=i.id
    LEFT JOIN res_tr  t ON r.id=t.id
  )
  SELECT p.*, SUM(p.raw_quantity) OVER (ORDER BY p.date ASC ROWS UNBOUNDED PRECEDING) AS balance_after
  FROM proc p ORDER BY p.date DESC;
END;$function$

-- ===== get_low_stock_products =====


CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name_ar text, quantity numeric, min_quantity numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== get_matching_inventory_products =====


CREATE OR REPLACE FUNCTION public.get_monthly_performance(p_company_id uuid, p_year integer, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(month_index integer, month_name text, revenues numeric, expenses numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_start DATE := make_date(p_year, 1, 1);
    v_end   DATE := make_date(p_year, 12, 31);
BEGIN
        PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== get_next_invoice_number =====


CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_company_id uuid, p_type text DEFAULT 'sale'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
SELECT COALESCE(MAX(NULLIF(invoice_number, '')::bigint), 0) + 1
  INTO v_next
  FROM public.invoices
  WHERE company_id = p_company_id AND type = p_type;
  
  RETURN v_next::text;
END;
$function$

-- ===== get_next_journal_entry_number =====


CREATE OR REPLACE FUNCTION public.get_next_journal_entry_number(p_company_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
SELECT COALESCE(MAX(entry_number), 0) + 1
  INTO   v_next
  FROM   public.journal_entries
  WHERE  company_id = p_company_id;

  RETURN v_next;
END;
$function$

-- ===== get_next_sequence =====


CREATE OR REPLACE FUNCTION public.get_next_sequence(p_company_id uuid, p_sequence_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
  v_table text;
  v_column text;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
CASE p_sequence_name
    WHEN 'invoice' THEN
      SELECT COALESCE(MAX(NULLIF(invoice_number, '')::bigint), 0) + 1 INTO v_next
      FROM public.invoices WHERE company_id = p_company_id AND type = 'sale';
    WHEN 'purchase' THEN
      SELECT COALESCE(MAX(NULLIF(invoice_number, '')::bigint), 0) + 1 INTO v_next
      FROM public.invoices WHERE company_id = p_company_id AND type = 'purchase';
    WHEN 'expense' THEN
      SELECT COALESCE(MAX(NULLIF(voucher_number, '')::bigint), 0) + 1 INTO v_next
      FROM public.expenses WHERE company_id = p_company_id;
    WHEN 'payment' THEN
      SELECT COALESCE(MAX(entry_number), 0) + 1 INTO v_next
      FROM public.journal_entries WHERE company_id = p_company_id;
    WHEN 'bond' THEN
      SELECT COALESCE(MAX(NULLIF(payment_number, '')::bigint), 0) + 1 INTO v_next
      FROM public.payments WHERE company_id = p_company_id;
    ELSE
      v_next := 1;
  END CASE;
  
  RETURN v_next::text;
END;
$function$

-- ===== get_overdue_invoices =====


CREATE OR REPLACE FUNCTION public.get_overdue_invoices(p_company_id uuid, p_type text DEFAULT 'sale'::text)
 RETURNS TABLE(invoice_id uuid, invoice_number text, party_id uuid, party_name text, party_phone text, issue_date date, due_date date, days_overdue integer, total_amount numeric, paid_amount numeric, remaining numeric, aging_bucket text, currency_code text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT
    i.id                                          AS invoice_id,
    i.invoice_number,
    i.party_id,
    p.name                                        AS party_name,
    p.phone                                       AS party_phone,
    i.issue_date,
    i.due_date,
    (CURRENT_DATE - i.due_date)::int              AS days_overdue,
    i.total_amount,
    i.paid_amount,
    (i.total_amount - i.paid_amount)              AS remaining,
    CASE
      WHEN (CURRENT_DATE - i.due_date) BETWEEN  1 AND  30 THEN '1-30 يوم'
      WHEN (CURRENT_DATE - i.due_date) BETWEEN 31 AND  60 THEN '31-60 يوم'
      WHEN (CURRENT_DATE - i.due_date) BETWEEN 61 AND  90 THEN '61-90 يوم'
      WHEN (CURRENT_DATE - i.due_date) >  90               THEN 'أكثر من 90 يوم'
      ELSE 'غير محدد'
    END                                           AS aging_bucket,
    i.currency_code
  FROM invoices i
  LEFT JOIN parties p ON p.id = i.party_id
  WHERE i.company_id   = p_company_id
    AND i.deleted_at   IS NULL
    AND i.due_date     < CURRENT_DATE
    AND i.due_date     IS NOT NULL
    AND i.type         = p_type
    AND i.status       IN ('confirmed','posted','partially_paid')
    AND (i.total_amount - i.paid_amount) > 0.01
  ORDER BY days_overdue DESC, remaining DESC;
END;
$function$

-- ===== get_paginated_invoices =====


CREATE OR REPLACE FUNCTION public.get_paginated_invoices(p_company_id uuid, p_type text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_party_id uuid DEFAULT NULL::uuid, p_from_date date DEFAULT NULL::date, p_to_date date DEFAULT NULL::date, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_order_by text DEFAULT 'issue_date'::text, p_order_dir text DEFAULT 'DESC'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset     int;
  v_rows       jsonb;
  v_total      int;
  v_sum        numeric;
  v_paid_sum   numeric;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- تحقق من المعاملات
  p_page      := GREATEST(1, COALESCE(p_page, 1));
  p_page_size := LEAST(200, GREATEST(1, COALESCE(p_page_size, 25)));
  p_order_dir := CASE WHEN UPPER(p_order_dir)='ASC' THEN 'ASC' ELSE 'DESC' END;
  p_order_by  := CASE p_order_by
    WHEN 'issue_date'      THEN 'i.issue_date'
    WHEN 'due_date'        THEN 'i.due_date'
    WHEN 'total_amount'    THEN 'i.total_amount'
    WHEN 'invoice_number'  THEN 'i.invoice_number'
    WHEN 'party_name'      THEN 'p.name'
    ELSE 'i.issue_date'
  END;

  v_offset := (p_page - 1) * p_page_size;

  -- العدد الكلي + الإجماليات
  SELECT
    COUNT(*),
    COALESCE(SUM(i.total_amount),0),
    COALESCE(SUM(i.paid_amount),0)
  INTO v_total, v_sum, v_paid_sum
  FROM invoices i
  WHERE i.company_id = p_company_id
    AND i.deleted_at IS NULL
    AND (p_type      IS NULL OR i.type      = p_type)
    AND (p_status    IS NULL OR i.status    = p_status)
    AND (p_party_id  IS NULL OR i.party_id  = p_party_id)
    AND (p_from_date IS NULL OR i.issue_date >= p_from_date)
    AND (p_to_date   IS NULL OR i.issue_date <= p_to_date)
    AND (p_search    IS NULL OR i.invoice_number ILIKE '%' || p_search || '%');

  -- البيانات مع صفحة
  SELECT COALESCE(jsonb_agg(row_order), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',             i.id,
      'invoice_number', i.invoice_number,
      'type',           i.type,
      'status',         i.status,
      'issue_date',     i.issue_date,
      'due_date',       i.due_date,
      'total_amount',   i.total_amount,
      'subtotal',       i.subtotal,
      'tax_amount',     i.tax_amount,
      'discount_amount',i.discount_amount,
      'paid_amount',    i.paid_amount,
      'remaining',      (i.total_amount - i.paid_amount),
      'currency_code',  i.currency_code,
      'payment_method', i.payment_method,
      'party_id',       i.party_id,
      'party_name',     p.name,
      'party_phone',    p.phone,
      'created_at',     i.created_at,
      'updated_at',     i.updated_at
    ) AS row_order
    FROM invoices i
    LEFT JOIN parties p ON p.id = i.party_id
    WHERE i.company_id = p_company_id
      AND i.deleted_at IS NULL
      AND (p_type      IS NULL OR i.type      = p_type)
      AND (p_status    IS NULL OR i.status    = p_status)
      AND (p_party_id  IS NULL OR i.party_id  = p_party_id)
      AND (p_from_date IS NULL OR i.issue_date >= p_from_date)
      AND (p_to_date   IS NULL OR i.issue_date <= p_to_date)
      AND (p_search    IS NULL OR i.invoice_number ILIKE '%' || p_search || '%')
    ORDER BY
      CASE WHEN p_order_by='i.issue_date'     AND p_order_dir='DESC' THEN i.issue_date     END DESC,
      CASE WHEN p_order_by='i.issue_date'     AND p_order_dir='ASC'  THEN i.issue_date     END ASC,
      CASE WHEN p_order_by='i.due_date'       AND p_order_dir='DESC' THEN i.due_date       END DESC,
      CASE WHEN p_order_by='i.due_date'       AND p_order_dir='ASC'  THEN i.due_date       END ASC,
      CASE WHEN p_order_by='i.total_amount'   AND p_order_dir='DESC' THEN i.total_amount   END DESC,
      CASE WHEN p_order_by='i.total_amount'   AND p_order_dir='ASC'  THEN i.total_amount   END ASC,
      CASE WHEN p_order_by='i.invoice_number' AND p_order_dir='DESC' THEN i.invoice_number END DESC,
      CASE WHEN p_order_by='i.invoice_number' AND p_order_dir='ASC'  THEN i.invoice_number END ASC,
      CASE WHEN p_order_by='p.name'           AND p_order_dir='DESC' THEN p.name           END DESC,
      CASE WHEN p_order_by='p.name'           AND p_order_dir='ASC'  THEN p.name           END ASC,
      i.id  -- tiebreaker
    LIMIT  p_page_size
    OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'data',        v_rows,
    'pagination',  jsonb_build_object(
      'total',       v_total,
      'page',        p_page,
      'page_size',   p_page_size,
      'total_pages', CEIL(v_total::float / p_page_size)
    ),
    'summary', jsonb_build_object(
      'total_amount', ROUND(v_sum, 2),
      'paid_amount',  ROUND(v_paid_sum, 2),
      'remaining',    ROUND(v_sum - v_paid_sum, 2)
    )
  );
END;
$function$

-- ===== get_party_all_balances =====


CREATE OR REPLACE FUNCTION public.get_party_all_balances(p_company_id uuid, p_party_id uuid)
 RETURNS TABLE(party_id uuid, currency_code character varying, balance numeric, transaction_count bigint, last_activity_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id
    ORDER BY pb.currency_code;
END;
$function$

-- ===== get_party_balance_by_currency =====


CREATE OR REPLACE FUNCTION public.get_party_balance_by_currency(p_company_id uuid, p_party_id uuid, p_currency_code character varying)
 RETURNS TABLE(party_id uuid, currency_code character varying, balance numeric, transaction_count bigint, last_activity_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
        PERFORM public.verify_company_access(p_company_id);
RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id AND pb.currency_code = p_currency_code;
END;
$function$

-- ===== get_party_statement =====


CREATE OR REPLACE FUNCTION public.get_party_statement(p_company_id uuid, p_party_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_movements json;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.line_id), '[]'::json)
  INTO v_movements
  FROM (
    SELECT jel.id AS line_id, je.entry_date,
      CASE WHEN je.reference_type IN ('sales_invoice','invoice') THEN 'INV'
        WHEN je.reference_type = 'purchase_invoice' THEN 'PUR'
        WHEN je.reference_type IN ('payment','payment_bond') THEN 'PAY'
        WHEN je.reference_type IN ('receipt','receipt_bond') THEN 'RCV'
        WHEN je.reference_type IN ('sale_return','sales_return','return_sale') THEN 'RET'
        WHEN je.reference_type IN ('purchase_return','return_purchase') THEN 'PRET'
        WHEN je.reference_type = 'expense' THEN 'EXP'
        ELSE COALESCE('JV-' || je.entry_number::text, 'JV') END AS ref,
      CASE WHEN je.reference_type IN ('sales_invoice','invoice') THEN 'فاتورة مبيعات'
        WHEN je.reference_type = 'purchase_invoice' THEN 'فاتورة مشتريات'
        WHEN je.reference_type IN ('payment','payment_bond') THEN 'سند دفع'
        WHEN je.reference_type IN ('receipt','receipt_bond') THEN 'سند قبض'
        WHEN je.reference_type IN ('sale_return','sales_return','return_sale') THEN 'مرتجع مبيعات'
        WHEN je.reference_type IN ('purchase_return','return_purchase') THEN 'مرتجع مشتريات'
        WHEN je.reference_type = 'expense' THEN 'صرف مصروف' ELSE 'قيد محاسبي' END AS operation_type,
      COALESCE(jel.description, je.description, 'حركة محاسبية') AS description,
      je.reference_type AS type, COALESCE(jel.debit_amount,0) AS debit, COALESCE(jel.credit_amount,0) AS credit,
      jel.currency_code AS currency,
      SUM(COALESCE(jel.debit_amount,0) - COALESCE(jel.credit_amount,0)) OVER (ORDER BY je.entry_date, jel.id ROWS UNBOUNDED PRECEDING) AS balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN accounts a ON a.id = jel.account_id
    WHERE je.company_id = p_company_id AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
      AND jel.party_id = p_party_id AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
  ) t;
  RETURN v_movements;
END;
$function$

-- ===== get_party_summary =====


CREATE OR REPLACE FUNCTION public.get_popular_products(p_company_id uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name_ar text, sku text, part_number text, brand text, sale_price numeric, cost_price numeric, barcode text, category_name text, total_stock numeric, min_stock_level integer, status text, image_url text, sales_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
RETURN QUERY
  SELECT 
    p.id, p.name_ar, p.sku, p.part_number, p.brand,
    p.sale_price, p.cost_price, p.barcode,
    pc.name as category_name,
    COALESCE(SUM(ps.quantity), 0) as total_stock,
    p.min_stock_level, p.status, p.image_url,
    COUNT(ii.id) as sales_count
  FROM public.products p
  LEFT JOIN public.invoice_items ii ON ii.product_id = p.id
  LEFT JOIN public.invoices i ON i.id = ii.invoice_id
    AND i.type = 'sale' AND i.status IN ('posted', 'paid', 'partially_paid') AND i.deleted_at IS NULL
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN public.product_stock ps ON ps.product_id = p.id AND ps.company_id = p.company_id
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL
    AND p.status = 'active'
  GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.brand, p.sale_price, p.cost_price,
           p.barcode, pc.name, p.min_stock_level, p.status, p.image_url
  ORDER BY sales_count DESC, p.updated_at DESC
  LIMIT p_limit;
END;
$function$

-- ===== get_potential_duplicates =====


CREATE OR REPLACE FUNCTION public.get_potential_duplicates(p_company_id uuid, p_type text DEFAULT 'customer'::text)
 RETURNS TABLE(id1 uuid, id2 uuid, name1 text, name2 text, phone1 text, phone2 text, similarity double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT a.id, b.id, a.name, b.name, a.phone, b.phone, similarity(a.name, b.name)
  FROM public.parties a JOIN public.parties b ON a.id < b.id AND a.company_id = b.company_id
  WHERE a.company_id = p_company_id AND a.type = p_type AND b.type = p_type
    AND a.deleted_at IS NULL AND b.deleted_at IS NULL
    AND (similarity(a.name,b.name) > 0.7 OR (a.phone IS NOT NULL AND a.phone = b.phone))
  ORDER BY similarity DESC;
END;
$function$

-- ===== get_product_analytics =====


CREATE OR REPLACE FUNCTION public.get_product_analytics(p_company_id uuid, p_product_id uuid, p_days integer DEFAULT 90)
 RETURNS TABLE(total_sold numeric, total_revenue numeric, total_purchased numeric, total_cost numeric, gross_profit numeric, avg_sale_price numeric, current_stock numeric, transaction_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT COALESCE(sales.qty,0), COALESCE(sales.rev,0), COALESCE(purch.qty,0), COALESCE(purch.cost,0),
    COALESCE(sales.rev - purch.cost,0), COALESCE(sales.avg_price,0), COALESCE(stock.qty,0), COALESCE(sales.cnt+purch.cnt,0)
  FROM (SELECT SUM(ii.quantity) qty, SUM(ii.total) rev, AVG(ii.unit_price) avg_price, COUNT(*) cnt
        FROM public.invoice_items ii JOIN public.invoices i ON i.id=ii.invoice_id
        WHERE ii.product_id=p_product_id AND i.company_id=p_company_id AND i.type='sale' AND i.deleted_at IS NULL AND i.issue_date >= CURRENT_DATE - p_days) sales,
       (SELECT SUM(ii.quantity) qty, SUM(ii.cost_price*ii.quantity) cost, COUNT(*) cnt
        FROM public.invoice_items ii JOIN public.invoices i ON i.id=ii.invoice_id
        WHERE ii.product_id=p_product_id AND i.company_id=p_company_id AND i.type='purchase' AND i.deleted_at IS NULL AND i.issue_date >= CURRENT_DATE - p_days) purch,
       (SELECT COALESCE(SUM(ps.quantity),0) qty FROM public.product_stock ps WHERE ps.product_id=p_product_id) stock;
END;
$function$

-- ===== get_product_fitment =====


CREATE OR REPLACE FUNCTION public.get_product_fitment(p_id uuid, p_company_id uuid)
 RETURNS TABLE(fitment_id uuid, vehicle_id uuid, make text, model text, year_start integer, year_end integer, submodel text, notes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT pf.id, v.id, v.make, v.model, v.year_start, v.year_end, v.submodel, pf.notes
  FROM public.product_fitment pf
  JOIN public.vehicles v ON pf.vehicle_id = v.id
  WHERE pf.product_id = p_id AND pf.company_id = p_company_id;
END;
$function$

-- ===== get_product_stock_history =====


CREATE OR REPLACE FUNCTION public.get_product_stock_history(p_company_id uuid, p_product_id uuid, p_warehouse_id uuid DEFAULT NULL::uuid, p_from_date date DEFAULT NULL::date, p_to_date date DEFAULT CURRENT_DATE, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, transaction_date timestamp with time zone, transaction_type text, quantity numeric, running_balance numeric, reference_type text, reference_id uuid, invoice_number text, warehouse_id uuid, warehouse_name text, created_by uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT
    it.id,
    it.created_at                             AS transaction_date,
    it.transaction_type,
    it.quantity,
    SUM(
      CASE
        WHEN it.transaction_type IN ('purchase','sales_return','transfer_in','adj_in','initial') THEN  it.quantity
        WHEN it.transaction_type IN ('sales','purchase_return','transfer_out','adj_out')         THEN -it.quantity
        ELSE 0
      END
    ) OVER (
      PARTITION BY it.product_id,
                   CASE WHEN p_warehouse_id IS NULL THEN NULL ELSE it.warehouse_id END
      ORDER BY it.created_at, it.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                         AS running_balance,
    it.reference_type,
    it.reference_id,
    inv.invoice_number,
    it.warehouse_id,
    w.name_ar                                 AS warehouse_name,
    it.created_by
  FROM inventory_transactions it
  LEFT JOIN warehouses w   ON w.id   = it.warehouse_id
  LEFT JOIN invoices   inv ON inv.id = it.reference_id
                          AND it.reference_type = 'invoice'
  WHERE it.company_id  = p_company_id
    AND it.product_id  = p_product_id
    AND it.deleted_at  IS NULL
    AND (p_warehouse_id IS NULL OR it.warehouse_id = p_warehouse_id)
    AND (p_from_date    IS NULL OR it.created_at::date >= p_from_date)
    AND it.created_at::date <= p_to_date
  ORDER BY it.created_at DESC, it.id DESC
  LIMIT p_limit;
END;
$function$

-- ===== get_products_page =====


CREATE OR REPLACE FUNCTION public.get_sales_chart_data(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS TABLE(name text, value numeric, date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from date := COALESCE(p_date_from, (CURRENT_DATE - INTERVAL '30 days'));
  v_to date := COALESCE(p_date_to, CURRENT_DATE);
  v_day date;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
v_day := v_from;
  WHILE v_day <= v_to LOOP
    name := to_char(v_day, 'YYYY-MM-DD');
    date := v_day;
    
    SELECT COALESCE(SUM(
      CASE WHEN currency_code != 'SAR' AND exchange_rate > 0 THEN total_amount * exchange_rate
           ELSE total_amount END
    ), 0) INTO value
    FROM public.invoices
    WHERE company_id = p_company_id
      AND type = 'sale'
      AND status IN ('posted', 'paid', 'partially_paid')
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND issue_date = v_day
      AND deleted_at IS NULL;
    
    RETURN NEXT;
    v_day := v_day + INTERVAL '1 day';
  END LOOP;
END;
$function$

-- ===== get_sales_stats =====


CREATE OR REPLACE FUNCTION public.get_similar_products(p_name text, p_company_id uuid)
 RETURNS TABLE(id uuid, name_ar text, similarity_score real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT EXISTS (SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id=auth.uid() AND ucr.company_id=p_company_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  RETURN QUERY
  SELECT p.id, p.name_ar::text, similarity(p.name_ar, p_name)
  FROM products p
  WHERE p.company_id=p_company_id AND p.status!='archived' AND p.deleted_at IS NULL
    AND similarity(p.name_ar, p_name)>0.3
  ORDER BY similarity(p.name_ar, p_name) DESC LIMIT 5;
END;$function$

-- ===== get_stock_valuation =====


CREATE OR REPLACE FUNCTION public.get_stock_valuation(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result json;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  SELECT json_build_object(
    'total_value', COALESCE(SUM(ps.quantity*p.cost_price),0), 'total_items', COUNT(DISTINCT p.id),
    'total_qty', COALESCE(SUM(ps.quantity),0),
    'by_warehouse', json_agg(json_build_object('warehouse_id', w.id, 'warehouse_name', w.name_ar,
        'value', COALESCE(SUM(ps.quantity*p.cost_price),0), 'qty', COALESCE(SUM(ps.quantity),0))))
  INTO v_result
  FROM public.product_stock ps JOIN public.products p ON p.id=ps.product_id JOIN public.warehouses w ON w.id=ps.warehouse_id
  WHERE p.company_id=p_company_id AND p.deleted_at IS NULL AND w.deleted_at IS NULL AND ps.quantity > 0;
  RETURN COALESCE(v_result, '{}');
END;
$function$

-- ===== get_top_customers_by_revenue =====


CREATE OR REPLACE FUNCTION public.get_top_customers_by_revenue(p_company_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, name text, total_revenue numeric, invoice_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT p.id, p.name::text, COALESCE(p.total_paid_amount,0), p.total_invoices_count::bigint
  FROM parties p WHERE p.company_id=p_company_id AND p.type='customer' AND p.deleted_at IS NULL
  ORDER BY p.total_paid_amount DESC NULLS LAST LIMIT p_limit;
END;
$function$

-- ===== get_top_products_and_customers =====


CREATE OR REPLACE FUNCTION public.get_top_products_and_customers(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 5)
 RETURNS TABLE(top_products jsonb, top_customers jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
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
$function$

-- ===== get_top_selling_products =====


CREATE OR REPLACE FUNCTION public.get_top_selling_products(p_company_id uuid, p_limit integer DEFAULT 10, p_days integer DEFAULT 30)
 RETURNS TABLE(id uuid, name_ar text, sku text, category_id uuid, total_sold numeric, total_revenue numeric, total_cost numeric, gross_profit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT p.id, p.name_ar, p.sku, p.category_id, SUM(ii.quantity)::numeric, SUM(ii.total)::numeric,
    SUM(ii.quantity*ii.cost_price)::numeric, (SUM(ii.total)-SUM(ii.quantity*ii.cost_price))::numeric
  FROM public.invoice_items ii JOIN public.invoices i ON i.id=ii.invoice_id JOIN public.products p ON p.id=ii.product_id
  WHERE i.company_id=p_company_id AND i.type='sale' AND i.status IN ('posted','paid') AND i.deleted_at IS NULL AND i.issue_date >= CURRENT_DATE - p_days
  GROUP BY p.id, p.name_ar, p.sku, p.category_id ORDER BY total_sold DESC LIMIT p_limit;
END;
$function$

-- ===== get_user_company_id =====


CREATE OR REPLACE FUNCTION public.get_vehicle_products(v_id uuid, p_company_id uuid)
 RETURNS TABLE(product_id uuid, fitment_id uuid, name text, sku text, part_number text, price numeric, total_stock numeric, notes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
IF NOT is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  SELECT p.id, pf.id, p.name_ar, p.sku, p.part_number, p.sale_price,
    COALESCE((SELECT SUM(quantity) FROM public.product_stock ps WHERE ps.product_id = p.id), 0),
    COALESCE(pf.notes, '')::text
  FROM public.product_fitment pf
  JOIN public.products p ON pf.product_id = p.id
  WHERE pf.vehicle_id = v_id AND p.company_id = p_company_id AND p.status = 'active';
END;
$function$

-- ===== get_warehouses_with_stats =====


CREATE OR REPLACE FUNCTION public.get_warehouses_with_stats(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name_ar text, location text, "itemCount" bigint, "totalStock" numeric, "stockValue" numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
PERFORM public.fn_assert_company_access(p_company_id);
  RETURN QUERY
  SELECT w.id, w.name_ar, w.location, COUNT(DISTINCT ps.product_id), COALESCE(SUM(ps.quantity),0), COALESCE(SUM(ps.quantity*p.cost_price),0)
  FROM public.warehouses w
  LEFT JOIN public.product_stock ps ON ps.warehouse_id=w.id
  LEFT JOIN public.products p ON p.id=ps.product_id AND p.deleted_at IS NULL
  WHERE w.company_id=p_company_id 
    AND w.deleted_at IS NULL
    AND (p_branch_id IS NULL OR w.branch_id = p_branch_id)
  GROUP BY w.id, w.name_ar, w.location ORDER BY w.is_primary DESC, w.name_ar;
END;
$function$

-- ===== handle_new_user =====


CREATE OR REPLACE FUNCTION public.incentive_actor(p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
      PERFORM public.verify_company_access(p_company_id);
RETURN COALESCE(auth.uid(), (SELECT user_id FROM user_company_roles WHERE company_id=p_company_id AND role IN ('owner','admin') ORDER BY created_at LIMIT 1));
END; $function$

-- ===== incentive_apply_adjustment =====


