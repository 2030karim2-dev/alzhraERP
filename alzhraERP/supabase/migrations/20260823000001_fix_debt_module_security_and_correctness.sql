-- ============================================================
-- Migration: Debt & Collection module — security & correctness
-- Date: 2026-08-23
-- ============================================================
-- C1/C2 (cross-tenant): every debt RPC is SECURITY DEFINER and was
-- GRANTed to authenticated WITHOUT a company-membership check. Any
-- authenticated user could pass an arbitrary p_company_id and read OR
-- write another company's debt data. This migration adds
-- fn_assert_company_access() to all debt RPCs and closes the write
-- paths with user_can_manage_debts(company_id) role gates.
--
-- Also fixes:
--  * user_can_manage_debts() excluded 'owner' — but the only roles
--    allowed in user_company_roles are (owner/admin/accountant/
--    cashier/viewer) → owners could NOT manage debts via RLS.
--  * status 'partial' (invalid) → 'partially_paid' in every debt query —
--    partially paid invoices were silently EXCLUDED from the module.
--  * due_today classification was dead code (oldest_due_date < today
--    always) → now derived from next_due_date = today.
--  * update_invoice_status_on_payment wrote 'unpaid' (not in
--    invoices_status_check) on full payment reversal → 23514.
--  * get_dashboard_summary(uuid,uuid) referenced non-existent
--    parties.balance → uses the party_balances VIEW.
--  * Realtime: debt tables added to supabase_realtime (fresh deploys).
--  * pg_cron (guarded): daily auto-break of overdue promises.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) user_can_manage_debts — include owner (both overloads)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_can_manage_debts(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.get_user_role(p_company_id) IN ('owner', 'admin', 'manager', 'accountant');
$function$;

CREATE OR REPLACE FUNCTION public.user_can_manage_debts()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.get_user_role() IN ('owner', 'admin', 'manager', 'accountant');
$function$;

-- ─────────────────────────────────────────────────────────────
-- 2) get_debt_followup_dashboard — access check + status fix +
--    due_today classification (next_due_date = today)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_debt_followup_dashboard(p_company_id uuid, p_due_soon_days integer DEFAULT 7, p_critical_days integer DEFAULT 30, p_reminder_window_days integer DEFAULT 3)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, currency_code text, outstanding_balance numeric, overdue_amount numeric, oldest_due_date date, next_due_date date, days_overdue integer, classification text, reminder_status text, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, pending_promise_date date, invoice_count bigint, opening_balance numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

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
          AND i.status IN ('posted', 'partially_paid')
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
    LEFT JOIN public.party_categories pc ON pc.id = p.category_id
    LEFT JOIN promise_summary ps ON ps.party_id = c.party_id
    LEFT JOIN last_reminders lr ON lr.party_id = c.party_id
    LEFT JOIN last_contacts lc ON lc.customer_id = c.party_id
    WHERE c.outstanding_balance > 0
    ORDER BY c.overdue_amount DESC NULLS LAST, days_overdue DESC NULLS LAST;
END;
$function$;


-- ─────────────────────────────────────────────────────────────
-- 3) get_debt_analytics_summary — access check + status fix
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_debt_analytics_summary(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
DECLARE v_result JSON;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    SELECT json_build_object(
        'total_receivables',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partially_paid') AND i.deleted_at IS NULL
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'overdue_receivables',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partially_paid') AND i.deleted_at IS NULL
                  AND i.due_date < v_today
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'due_today',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partially_paid') AND i.deleted_at IS NULL
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
$function$;


-- ─────────────────────────────────────────────────────────────
-- 4) get_debt_today_tasks — access check + status fix
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_debt_today_tasks(p_company_id uuid)
 RETURNS TABLE(task_type VARCHAR, party_id UUID, party_name TEXT, party_phone TEXT, currency_code TEXT, amount NUMERIC, reference_info TEXT, urgency VARCHAR)
 LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

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
          AND i.type = 'sale' AND i.status IN ('posted', 'partially_paid')
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
$function$;


-- ─────────────────────────────────────────────────────────────
-- 5) get_debt_party_overview — access check + status fix
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_debt_party_overview(p_company_id uuid, p_party_id uuid)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, total_outstanding numeric, overdue_amount numeric, due_today_amount numeric, invoice_count bigint, opening_balance numeric, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

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
        AND i.type = 'sale' AND i.status IN ('posted', 'partially_paid') AND i.deleted_at IS NULL
    WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.phone, pc.name, p.credit_limit;
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 6) get_party_all_balances — access check
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_party_all_balances(p_company_id uuid, p_party_id uuid)
 RETURNS TABLE(party_id uuid, currency_code character varying, balance numeric, transaction_count bigint, last_activity_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id
    ORDER BY pb.currency_code;
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 7) get_party_balance_by_currency — access check
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_party_balance_by_currency(p_company_id uuid, p_party_id uuid, p_currency_code character varying)
 RETURNS TABLE(party_id uuid, currency_code character varying, balance numeric, transaction_count bigint, last_activity_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id AND pb.currency_code = p_currency_code;
END;
$function$;


-- ─────────────────────────────────────────────────────────────
-- 8) record_debt_reminder — access check + template ownership
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_debt_reminder(p_company_id uuid, p_party_id uuid, p_message_text text, p_channel character varying DEFAULT 'whatsapp'::character varying, p_template_id uuid DEFAULT NULL::uuid, p_recipient character varying DEFAULT NULL::character varying, p_related_entity_type character varying DEFAULT NULL::character varying, p_related_entity_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(message_log_id uuid, activity_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_msg_id UUID;
DECLARE v_act_id UUID;
BEGIN
    -- Tenant guard: caller must be a member of the company AND the party
    -- must belong to this company (closes the cross-tenant write path).
    PERFORM public.fn_assert_company_access(p_company_id);

    IF NOT EXISTS (
        SELECT 1 FROM public.parties p
        WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'INVALID_PARTY';
    END IF;

    -- Template ownership: a template from another company must not be used.
    IF p_template_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.debt_message_templates t
        WHERE t.id = p_template_id AND t.company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'INVALID_TEMPLATE';
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
        p_company_id, p_party_id, 'follow_up', 'تذكير دين', p_message_text,
        'completed', 'medium', NOW(), NOW(), auth.uid()
    )
    RETURNING id INTO v_act_id;

    RETURN QUERY SELECT v_msg_id, v_act_id;
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 9) break_overdue_promises — access check + role gate
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.break_overdue_promises(p_company_id uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);
    IF NOT public.user_can_manage_debts(p_company_id) THEN
        RAISE EXCEPTION 'access_denied';
    END IF;

    RETURN QUERY
    UPDATE public.debt_payment_promises
    SET status = 'broken', updated_at = NOW()
    WHERE company_id = p_company_id
      AND status = 'pending'
      AND promise_date < CURRENT_DATE
    RETURNING id;
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 10) complete_promise — access check + role gate + payment
--     validation (payment must belong to the same company/party)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_promise(p_company_id uuid, p_promise_id uuid, p_payment_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_party_id uuid;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);
    IF NOT public.user_can_manage_debts(p_company_id) THEN
        RAISE EXCEPTION 'access_denied';
    END IF;

    -- The promise must exist, belong to this company and be pending.
    SELECT pp.party_id INTO v_party_id
    FROM public.debt_payment_promises pp
    WHERE pp.id = p_promise_id AND pp.company_id = p_company_id AND pp.status = 'pending';
    IF v_party_id IS NULL THEN
        RAISE EXCEPTION 'PROMISE_NOT_FOUND_OR_NOT_PENDING';
    END IF;

    -- If a payment is linked it must be a posted receipt for the SAME party.
    IF p_payment_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.payments pm
        WHERE pm.id = p_payment_id
          AND pm.company_id = p_company_id
          AND pm.type = 'receipt'
          AND pm.status = 'posted'
          AND pm.deleted_at IS NULL
          AND (pm.party_id IS NULL OR pm.party_id = v_party_id)
    ) THEN
        RAISE EXCEPTION 'INVALID_PAYMENT';
    END IF;

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
$function$;


-- ─────────────────────────────────────────────────────────────
-- 11) get_dashboard_summary(p_company_id, p_branch_id) —
--     parties.balance does NOT exist → use the party_balances VIEW
-- ─────────────────────────────────────────────────────────────

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
    'total_debts', COALESCE((SELECT SUM(balance) FROM public.party_balances WHERE company_id=vc AND type='customer' AND balance>0), 0),
    'total_supplier_debts', COALESCE((SELECT SUM(balance) FROM public.party_balances WHERE company_id=vc AND type='supplier' AND balance>0), 0),
    'invoice_count', (SELECT COUNT(*) FROM public.invoices WHERE company_id=vc AND type='sale' AND status!='void' AND deleted_at IS NULL)
  ));
END;
$function$;


-- ─────────────────────────────────────────────────────────────
-- 12) update_invoice_status_on_payment — 'unpaid' is NOT in the
--     invoices_status_check enum → full payment reversal would fail
--     with 23514. Revert to 'posted' instead.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_invoice_status_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- تحديث حالة الفاتورة بعد تغيير paid_amount
  UPDATE invoices
  SET
    status = CASE
      WHEN paid_amount <= 0 THEN
        CASE WHEN status IN ('paid','partially_paid') THEN 'posted' ELSE status END
      WHEN paid_amount >= total_amount - 0.01 THEN 'paid'
      WHEN paid_amount > 0 THEN 'partially_paid'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id
    AND status NOT IN ('draft','cancelled','void');

  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 13) Realtime publication — debt tables (fresh deploys start with
--     an empty publication for these tables → useRealtimeSync was a
--     silent no-op). Re-adding existing tables is a no-op.
-- ─────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_followup_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_payment_promises;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_message_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_message_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_opening_balances;


-- ─────────────────────────────────────────────────────────────
-- 14) pg_cron (guarded): daily auto-break of overdue promises.
--     Runs as service_role (no auth.uid) → dedicated wrapper that
--     skips the user access check and is NOT callable by anon/authenticated.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cron_break_overdue_promises()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_affected integer;
BEGIN
    UPDATE public.debt_payment_promises
    SET status = 'broken', updated_at = NOW()
    WHERE status = 'pending' AND promise_date < CURRENT_DATE;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RETURN v_affected;
END;
$function$;

REVOKE ALL ON FUNCTION public.cron_break_overdue_promises() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cron_break_overdue_promises() FROM anon;
REVOKE ALL ON FUNCTION public.cron_break_overdue_promises() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cron_break_overdue_promises() TO service_role;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'break-overdue-promises-daily') THEN
      PERFORM cron.unschedule('break-overdue-promises-daily');
    END IF;
    PERFORM cron.schedule(
      'break-overdue-promises-daily',
      '0 3 * * *',
      $$SELECT public.cron_break_overdue_promises()$$
    );
  END IF;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 15) Defensive privilege re-assertion (hardening pattern):
--     revoke anon/PUBLIC, grant authenticated.
-- ─────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid,integer,integer,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid,integer,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid,integer,integer,integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_debt_today_tasks(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_debt_today_tasks(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_today_tasks(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_debt_party_overview(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_debt_party_overview(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_party_overview(uuid,uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_party_all_balances(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_party_all_balances(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_party_all_balances(uuid,uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_party_balance_by_currency(uuid,uuid,character varying) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_party_balance_by_currency(uuid,uuid,character varying) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_party_balance_by_currency(uuid,uuid,character varying) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_debt_reminder(uuid,uuid,text,character varying,uuid,character varying,character varying,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_debt_reminder(uuid,uuid,text,character varying,uuid,character varying,character varying,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_debt_reminder(uuid,uuid,text,character varying,uuid,character varying,character varying,uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.break_overdue_promises(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.break_overdue_promises(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.break_overdue_promises(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_promise(uuid,uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_promise(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_promise(uuid,uuid,uuid) TO authenticated;

-- NOTE: user_can_manage_debts (both overloads) is intentionally left
-- executable for RLS policy evaluation (see 20260821000002 — it is one of
-- the 8 helper functions required by policies). Do NOT revoke PUBLIC.


-- ─────────────────────────────────────────────────────────────
-- 16) party_balances_by_currency — align the "debt" definition
--     with party_balances & get_party_statement (AR/AP accounts
--     1100*/2100* only). Previously it summed EVERY journal line
--     carrying party_id (incl. non-AR/AP accounts) → the by-currency
--     breakdown and get_party_all_balances diverged from the report.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.party_balances_by_currency AS
SELECT jel.party_id,
    jel.company_id,
    jel.currency_code,
    sum(COALESCE(jel.debit_amount, 0::numeric)) - sum(COALESCE(jel.credit_amount, 0::numeric)) AS balance,
    count(DISTINCT jel.journal_entry_id) AS transaction_count,
    max(je.entry_date) AS last_activity_date
   FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.deleted_at IS NULL AND je.status = 'posted'::text
     JOIN accounts a ON a.id = jel.account_id
  WHERE jel.deleted_at IS NULL
    AND jel.party_id IS NOT NULL
    AND jel.currency_code IS NOT NULL
    AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
  GROUP BY jel.party_id, jel.company_id, jel.currency_code;

