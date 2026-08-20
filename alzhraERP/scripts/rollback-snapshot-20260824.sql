-- Rollback snapshot captured 2026-08-24 before applying:
--   20260823000001_fix_debt_module_security_and_correctness.sql
--   20260824000001_fix_debt_module_currency_and_statement.sql
-- Restore by running this file in the SQL Editor / query endpoint.

-- ===== FUNCTION public.break_overdue_promises(p_company_id uuid) =====
CREATE OR REPLACE FUNCTION public.break_overdue_promises(p_company_id uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    UPDATE public.debt_payment_promises
    SET status = 'broken', updated_at = NOW()
    WHERE company_id = p_company_id
      AND status = 'pending'
      AND promise_date < CURRENT_DATE
    RETURNING id;
END;
$function$


-- ===== FUNCTION public.complete_promise(p_company_id uuid, p_promise_id uuid, p_payment_id uuid) =====
CREATE OR REPLACE FUNCTION public.complete_promise(p_company_id uuid, p_promise_id uuid, p_payment_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    UPDATE public.debt_payment_promises
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW(),
        reference_type = CASE WHEN p_payment_id IS NOT NULL THEN 'payment' ELSE reference_type END,
        reference_id = COALESCE(p_payment_id, reference_id)
    WHERE id = p_promise_id
      AND company_id = p_company_id
      AND status = 'pending';
END;
$function$


-- ===== FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid) =====
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT jsonb_build_object(
    'total_sales', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type='sale' AND status IN ('posted','paid','partially_paid') AND deleted_at IS NULL), 0),
    'total_purchases', COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE company_id=vc AND type='purchase' AND status IN ('posted','paid','partially_paid') AND deleted_at IS NULL), 0),
    'total_expenses', COALESCE((SELECT SUM(amount) FROM public.expenses WHERE company_id=vc AND status!='void' AND deleted_at IS NULL), 0),
    'receipt_bonds', COALESCE((SELECT SUM(amount) FROM public.payments WHERE company_id=vc AND type='receipt' AND status='posted' AND deleted_at IS NULL), 0),
    'payment_bonds', COALESCE((SELECT SUM(amount) FROM public.payments WHERE company_id=vc AND type='disbursement' AND status='posted' AND deleted_at IS NULL), 0),
    'total_debts', COALESCE((SELECT SUM(balance) FROM public.parties WHERE company_id=vc AND type='customer' AND balance>0 AND deleted_at IS NULL), 0),
    'total_supplier_debts', COALESCE((SELECT SUM(balance) FROM public.parties WHERE company_id=vc AND type='supplier' AND balance>0 AND deleted_at IS NULL), 0),
    'invoice_count', (SELECT COUNT(*) FROM public.invoices WHERE company_id=vc AND type='sale' AND status!='void' AND deleted_at IS NULL)
  ));
END;
$function$


-- ===== FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid, p_date_from date, p_date_to date) =====
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
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
$function$


-- ===== FUNCTION public.get_debt_analytics_summary(p_company_id uuid) =====
CREATE OR REPLACE FUNCTION public.get_debt_analytics_summary(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
DECLARE v_result JSON;
BEGIN
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


-- ===== FUNCTION public.get_debt_followup_dashboard(p_company_id uuid, p_due_soon_days integer, p_critical_days integer, p_reminder_window_days integer) =====
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
        COALESCE(pc.name, 'Ø¹Ø§Ù')::TEXT AS category,
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


-- ===== FUNCTION public.get_debt_party_overview(p_company_id uuid, p_party_id uuid) =====
CREATE OR REPLACE FUNCTION public.get_debt_party_overview(p_company_id uuid, p_party_id uuid)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, total_outstanding numeric, overdue_amount numeric, due_today_amount numeric, invoice_count bigint, opening_balance numeric, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT
        p.id AS party_id,
        p.name::TEXT AS party_name,
        p.phone::TEXT AS party_phone,
        COALESCE(pc.name, 'Ø¹Ø§Ù')::TEXT AS category,
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


-- ===== FUNCTION public.get_debt_today_tasks(p_company_id uuid) =====
CREATE OR REPLACE FUNCTION public.get_debt_today_tasks(p_company_id uuid)
 RETURNS TABLE(task_type character varying, party_id uuid, party_name text, party_phone text, currency_code text, amount numeric, reference_info text, urgency character varying)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
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
            ('ÙØ¹Ø¯ ' || to_char(pp.promise_date, 'YYYY-MM-DD'))::TEXT,
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
            ('ÙØ¹Ø¯ ÙØªØ¬Ø§ÙØ² ' || to_char(pp.promise_date, 'YYYY-MM-DD'))::TEXT,
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
            COALESCE(dm.error_info, 'Ø±Ø³Ø§ÙØ© ÙØ§Ø´ÙØ©')::TEXT AS reference_info,
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


-- ===== FUNCTION public.get_party_all_balances(p_company_id uuid, p_party_id uuid) =====
CREATE OR REPLACE FUNCTION public.get_party_all_balances(p_company_id uuid, p_party_id uuid)
 RETURNS TABLE(party_id uuid, currency_code character varying, balance numeric, transaction_count bigint, last_activity_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id
    ORDER BY pb.currency_code;
END;
$function$


-- ===== FUNCTION public.get_party_balance_by_currency(p_company_id uuid, p_party_id uuid, p_currency_code character varying) =====
CREATE OR REPLACE FUNCTION public.get_party_balance_by_currency(p_company_id uuid, p_party_id uuid, p_currency_code character varying)
 RETURNS TABLE(party_id uuid, currency_code character varying, balance numeric, transaction_count bigint, last_activity_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id AND pb.currency_code = p_currency_code;
END;
$function$


-- ===== FUNCTION public.get_party_statement(p_company_id uuid, p_party_id uuid) =====
CREATE OR REPLACE FUNCTION public.get_party_statement(p_company_id uuid, p_party_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_movements json;
BEGIN
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
      CASE WHEN je.reference_type IN ('sales_invoice','invoice') THEN 'ÙØ§ØªÙØ±Ø© ÙØ¨ÙØ¹Ø§Øª'
        WHEN je.reference_type = 'purchase_invoice' THEN 'ÙØ§ØªÙØ±Ø© ÙØ´ØªØ±ÙØ§Øª'
        WHEN je.reference_type IN ('payment','payment_bond') THEN 'Ø³ÙØ¯ Ø¯ÙØ¹'
        WHEN je.reference_type IN ('receipt','receipt_bond') THEN 'Ø³ÙØ¯ ÙØ¨Ø¶'
        WHEN je.reference_type IN ('sale_return','sales_return','return_sale') THEN 'ÙØ±ØªØ¬Ø¹ ÙØ¨ÙØ¹Ø§Øª'
        WHEN je.reference_type IN ('purchase_return','return_purchase') THEN 'ÙØ±ØªØ¬Ø¹ ÙØ´ØªØ±ÙØ§Øª'
        WHEN je.reference_type = 'expense' THEN 'ØµØ±Ù ÙØµØ±ÙÙ' ELSE 'ÙÙØ¯ ÙØ­Ø§Ø³Ø¨Ù' END AS operation_type,
      COALESCE(jel.description, je.description, 'Ø­Ø±ÙØ© ÙØ­Ø§Ø³Ø¨ÙØ©') AS description,
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


-- ===== FUNCTION public.record_debt_reminder(p_company_id uuid, p_party_id uuid, p_message_text text, p_channel character varying, p_template_id uuid, p_recipient character varying, p_related_entity_type character varying, p_related_entity_id uuid) =====
CREATE OR REPLACE FUNCTION public.record_debt_reminder(p_company_id uuid, p_party_id uuid, p_message_text text, p_channel character varying DEFAULT 'whatsapp'::character varying, p_template_id uuid DEFAULT NULL::uuid, p_recipient character varying DEFAULT NULL::character varying, p_related_entity_type character varying DEFAULT NULL::character varying, p_related_entity_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(message_log_id uuid, activity_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_msg_id UUID;
DECLARE v_act_id UUID;
BEGIN
    -- Tenant guard: party must belong to this company
    IF NOT EXISTS (
        SELECT 1 FROM public.parties p
        WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'INVALID_PARTY';
    END IF;

    INSERT INTO public.debt_message_log (
        company_id, party_id, channel, template_id, message_text,
        status, recipient, related_entity_type, related_entity_id, created_by, sent_at
    ) VALUES (
        p_company_id, p_party_id, p_channel, p_template_id, p_message_text,
        'sent', p_recipient, p_related_entity_type, p_related_entity_id, auth.uid(), NOW()
    )
    RETURNING id INTO v_msg_id;

    INSERT INTO public.customer_activities (
        company_id, customer_id, activity_type, subject, description,
        status, priority, scheduled_at, completed_at, created_by
    ) VALUES (
        p_company_id, p_party_id, 'follow_up', 'ØªØ°ÙÙØ± Ø¯ÙÙ', p_message_text,
        'completed', 'medium', NOW(), NOW(), auth.uid()
    )
    RETURNING id INTO v_act_id;

    RETURN QUERY SELECT v_msg_id, v_act_id;
END;
$function$


-- ===== FUNCTION public.report_debt_aging(p_company_id uuid) =====
CREATE OR REPLACE FUNCTION public.report_debt_aging(p_company_id uuid)
 RETURNS TABLE(customer_name text, total numeric, days_0_30 numeric, days_31_60 numeric, days_61_90 numeric, days_90_plus numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  RETURN QUERY
  SELECT
    COALESCE(pr.name, 'ÙÙØ¯Ù') as customer_name,
    SUM(i.total_amount - COALESCE(i.paid_amount, 0)) as total,
    SUM(CASE WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_0_30,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '31 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_31_60,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE - INTERVAL '61 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_61_90,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) as days_90_plus
  FROM public.invoices i
  LEFT JOIN public.parties pr ON pr.id = i.party_id
  WHERE i.company_id = p_company_id
    AND i.type = 'sale'
    AND i.status IN ('posted', 'partially_paid')
    AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    AND i.deleted_at IS NULL
  GROUP BY pr.id, pr.name
  ORDER BY total DESC;
END;
$function$


-- ===== FUNCTION public.report_debts(p_company_id uuid) =====
CREATE OR REPLACE FUNCTION public.report_debts(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_receivables numeric := 0;
  v_payables numeric := 0;
  v_debts json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  WITH party_balances AS (
    SELECT 
      p.id,
      p.name,
      p.type,
      SUM(CASE 
        WHEN i.type IN ('sale', 'purchase_return') THEN (i.total_amount - i.paid_amount)
        WHEN i.type IN ('purchase', 'sale_return') THEN -(i.total_amount - i.paid_amount)
        ELSE 0 
      END) as remaining_amount
    FROM parties p
    JOIN invoices i ON p.id = i.party_id
    WHERE i.company_id = p_company_id
      AND i.status IN ('confirmed','posted','partially_paid')
      AND i.deleted_at IS NULL
      AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.type
    HAVING ABS(SUM(
      CASE 
        WHEN i.type IN ('sale', 'purchase_return') THEN (i.total_amount - i.paid_amount)
        WHEN i.type IN ('purchase', 'sale_return') THEN -(i.total_amount - i.paid_amount)
        ELSE 0 
      END
    )) > 0.01
  )
  SELECT 
    COALESCE(SUM(remaining_amount) FILTER (WHERE type IN ('customer', 'both') AND remaining_amount > 0), 0),
    COALESCE(SUM(ABS(remaining_amount)) FILTER (WHERE type IN ('supplier', 'both') AND remaining_amount < 0), 0),
    COALESCE(json_agg(row_to_json(pb)), '[]'::json)
  INTO v_receivables, v_payables, v_debts
  FROM party_balances pb;

  RETURN json_build_object(
    'summary', json_build_object(
      'receivables', v_receivables,
      'payables', v_payables
    ),
    'debts', v_debts
  );
END;
$function$


-- ===== FUNCTION public.update_invoice_status_on_payment() =====
CREATE OR REPLACE FUNCTION public.update_invoice_status_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- ØªØ­Ø¯ÙØ« Ø­Ø§ÙØ© Ø§ÙÙØ§ØªÙØ±Ø© Ø¨Ø¹Ø¯ ØªØºÙÙØ± paid_amount
  UPDATE invoices
  SET 
    status = CASE
      WHEN paid_amount <= 0 THEN 
        CASE WHEN status IN ('paid','partially_paid') THEN 'unpaid' ELSE status END
      WHEN paid_amount >= total_amount - 0.01 THEN 'paid'
      WHEN paid_amount > 0 THEN 'partially_paid'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id
    AND status NOT IN ('draft','cancelled','void');
  
  RETURN NEW;
END;
$function$


-- ===== FUNCTION public.user_can_manage_debts() =====
CREATE OR REPLACE FUNCTION public.user_can_manage_debts()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT public.get_user_role() IN ('admin', 'manager', 'accountant');
$function$


-- ===== FUNCTION public.user_can_manage_debts(p_company_id uuid) =====
CREATE OR REPLACE FUNCTION public.user_can_manage_debts(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.get_user_role(p_company_id) IN ('admin', 'manager', 'accountant');
$function$


-- ===== VIEW public.party_balances_by_currency =====
CREATE OR REPLACE VIEW public.party_balances_by_currency AS  SELECT jel.party_id,
    jel.company_id,
    jel.currency_code,
    sum(COALESCE(jel.debit_amount, 0::numeric)) - sum(COALESCE(jel.credit_amount, 0::numeric)) AS balance,
    count(DISTINCT jel.journal_entry_id) AS transaction_count,
    max(je.entry_date) AS last_activity_date
   FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.deleted_at IS NULL AND je.status = 'posted'::text
  WHERE jel.deleted_at IS NULL AND jel.party_id IS NOT NULL AND jel.currency_code IS NOT NULL
  GROUP BY jel.party_id, jel.company_id, jel.currency_code;

