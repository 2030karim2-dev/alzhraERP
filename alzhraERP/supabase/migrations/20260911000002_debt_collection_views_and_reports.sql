-- ============================================================
-- Migration: 20260911000002_debt_collection_views_and_reports.sql
-- ============================================================
-- الغرض (الجزء الثاني من تدقيق الديون والتحصيل):
--   * إزالة الضرب المزدوج للعملة من party_balances (القيود الآن موحّدة
--     بالعملة الأساس من الجزء الأول) وتحويل الأرصدة الافتتاحية بدالة
--     fn_to_base_amount الموحّدة.
--   * party_balances_by_currency: التجميع بالقيمة الأجنبية لكل عملة
--     (foreign_amount) بدل خلط عملات غير قابلة للجمع، مع تضمين الأرصدة
--     الافتتاحية ومعالجة الأطراف 'both' بعلامة حسب كود الحساب 1100/2100.
--   * توحيد تحويل العملة في get_debt_analytics_summary و get_debt_party_overview
--     و report_debt_aging بدالة fn_to_base_amount (تدعم divide/multiply
--     والمعكوس < 1) بدل الضرب الأعمى في rate_to_base.
--   * إضافة حالة 'confirmed' إلى كل استعلامات الفواتير في ديون المتابعة
--     (كانت الفواتير المؤكدة الحديثة غائبة عن التحصيل).
--   * كشف الحساب get_party_statement: ترتيب ثابت زمنياً (created_at) بدل
--     الترتيب المعجمي لواصفات UUID التي أفسدت الرصيد التراكمي.
--   * get_dashboard_summary: تحويل الأرصدة الافتتاحية الموحّد + 'confirmed'.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) party_balances — القيود الأساس لا تعاد تحويلها (Double Fix)
--    أرصدة الافتتاح تُحوَّل عن طريق fn_to_base_amount
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.party_balances AS
WITH journal_bals AS (
    SELECT
        jel.party_id,
        jel.company_id,
        SUM(
            CASE
                WHEN a.code LIKE '1100%' THEN jel.debit_amount - jel.credit_amount
                WHEN a.code LIKE '2100%' THEN jel.credit_amount - jel.debit_amount
                ELSE jel.debit_amount - jel.credit_amount
            END
        )::NUMERIC(14,2) AS journal_balance
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted' AND je.deleted_at IS NULL
    JOIN public.accounts a ON a.id = jel.account_id
    WHERE jel.deleted_at IS NULL AND (a.code LIKE '1100%' OR a.code LIKE '2100%') AND jel.party_id IS NOT NULL
    GROUP BY jel.party_id, jel.company_id
),
opening_bals AS (
    SELECT
        ob.party_id,
        ob.company_id,
        SUM(
            public.fn_to_base_amount(
                ob.currency_code,
                ob.amount,
                (SELECT er.rate_to_base FROM public.exchange_rates er
                 WHERE er.company_id = ob.company_id AND er.currency_code = ob.currency_code
                 ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1)
            )
            * CASE
                WHEN p.type = 'supplier' THEN (CASE WHEN ob.direction = 'credit' THEN 1 ELSE -1 END)
                ELSE (CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END)
              END
        )::NUMERIC(14,2) AS opening_balance
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id
    GROUP BY ob.party_id, ob.company_id
)
SELECT
    p.id AS party_id,
    p.company_id,
    p.type,
    (COALESCE(jb.journal_balance, 0) + COALESCE(ob.opening_balance, 0))::NUMERIC(14,2) AS balance
FROM public.parties p
LEFT JOIN journal_bals jb ON jb.party_id = p.id AND jb.company_id = p.company_id
LEFT JOIN opening_bals ob ON ob.party_id = p.id AND ob.company_id = p.company_id
WHERE p.deleted_at IS NULL;

ALTER VIEW public.party_balances SET (security_invoker = true);
-- ─────────────────────────────────────────────────────────────
-- 2) party_balances_by_currency — قيم أجنبية لكل عملة + افتتاحيات
--    + إشارة 'both' حسب كود الحساب
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.party_balances_by_currency AS
WITH journal_bals AS (
    SELECT
        jel.party_id,
        jel.company_id,
        jel.currency_code,
        SUM(
            CASE
              WHEN jel.currency_code IS NOT NULL AND UPPER(TRIM(jel.currency_code)) <> 'SAR'
              THEN
                COALESCE(NULLIF(jel.foreign_amount, 0),
                    (CASE WHEN a.code LIKE '1100%' THEN jel.debit_amount - jel.credit_amount
                          WHEN a.code LIKE '2100%' THEN jel.credit_amount - jel.debit_amount
                          ELSE jel.debit_amount - jel.credit_amount END))
                * CASE
                    WHEN a.code LIKE '1100%' THEN CASE WHEN jel.debit_amount >= jel.credit_amount THEN 1 ELSE -1 END
                    WHEN a.code LIKE '2100%' THEN CASE WHEN jel.credit_amount >= jel.debit_amount THEN 1 ELSE -1 END
                    ELSE CASE WHEN jel.debit_amount >= jel.credit_amount THEN 1 ELSE -1 END
                  END
              ELSE
                CASE
                    WHEN a.code LIKE '1100%' THEN jel.debit_amount - jel.credit_amount
                    WHEN a.code LIKE '2100%' THEN jel.credit_amount - jel.debit_amount
                    ELSE jel.debit_amount - jel.credit_amount
                END
            END
        )::numeric(14,2) AS balance,
        count(DISTINCT jel.journal_entry_id)::integer AS transaction_count,
        max(je.entry_date)::date AS last_activity_date
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.deleted_at IS NULL AND je.status = 'posted'
    JOIN public.accounts a ON a.id = jel.account_id
    WHERE jel.deleted_at IS NULL
      AND jel.party_id IS NOT NULL
      AND jel.currency_code IS NOT NULL
      AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
    GROUP BY jel.party_id, jel.company_id, jel.currency_code
),
opening_bals AS (
    SELECT
        ob.party_id,
        ob.company_id,
        ob.currency_code,
        SUM(
            CASE
                WHEN p.type = 'supplier' THEN (CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE -ob.amount END)
                ELSE (CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
            END
        )::numeric(14,2) AS balance,
        0::integer AS transaction_count,
        NULL::date AS last_activity_date
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id
    GROUP BY ob.party_id, ob.company_id, ob.currency_code
)
SELECT
    COALESCE(jb.party_id, ob.party_id) AS party_id,
    COALESCE(jb.company_id, ob.company_id) AS company_id,
    COALESCE(jb.currency_code, ob.currency_code) AS currency_code,
    (COALESCE(jb.balance, 0)::numeric(14,2) + COALESCE(ob.balance, 0)::numeric(14,2))::numeric(14,2) AS balance,
    (COALESCE(jb.transaction_count, 0)::integer + COALESCE(ob.transaction_count, 0)::integer)::integer AS transaction_count,
    COALESCE(jb.last_activity_date, ob.last_activity_date)::date AS last_activity_date
FROM journal_bals jb
FULL OUTER JOIN opening_bals ob
  ON ob.party_id = jb.party_id AND ob.company_id = jb.company_id AND ob.currency_code = jb.currency_code;

ALTER VIEW public.party_balances_by_currency SET (security_invoker = true);
-- ─────────────────────────────────────────────────────────────
-- 3) get_debt_followup_dashboard — إضافة حالة 'confirmed'
--    (نسخة 20260823000001 مع فلتر الحالات المحدّث)
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
          AND i.status IN ('posted', 'confirmed', 'partially_paid')
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

REVOKE EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer) TO authenticated;
-- ─────────────────────────────────────────────────────────────
-- 4) get_debt_today_tasks — إضافة حالة 'confirmed'
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
          AND i.type = 'sale' AND i.status IN ('posted', 'confirmed', 'partially_paid')
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

REVOKE EXECUTE ON FUNCTION public.get_debt_today_tasks(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_today_tasks(uuid) TO authenticated;
-- ─────────────────────────────────────────────────────────────
-- 5) get_debt_party_overview — تحويل موحّد للعملة + 'confirmed'
--    (الإصدار القديم كان يجمع عملات مختلفة بلا تحويل)
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
            THEN public.fn_to_base_amount(i.currency_code, i.total_amount - COALESCE(i.paid_amount, 0), i.exchange_rate) ELSE 0 END), 0)::NUMERIC
            + COALESCE((SELECT SUM(
                public.fn_to_base_amount(ob.currency_code, ob.amount,
                    (SELECT er.rate_to_base FROM public.exchange_rates er
                     WHERE er.company_id = p_company_id AND er.currency_code = ob.currency_code
                     ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1))
                * CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END)
                FROM public.party_opening_balances ob
                WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id), 0)::NUMERIC
            AS total_outstanding,
        COALESCE(SUM(CASE WHEN i.due_date < v_today
            THEN public.fn_to_base_amount(i.currency_code, i.total_amount - COALESCE(i.paid_amount, 0), i.exchange_rate) ELSE 0 END), 0)::NUMERIC AS overdue_amount,
        COALESCE(SUM(CASE WHEN i.due_date = v_today
            THEN public.fn_to_base_amount(i.currency_code, i.total_amount - COALESCE(i.paid_amount, 0), i.exchange_rate) ELSE 0 END), 0)::NUMERIC AS due_today_amount,
        COUNT(i.id) AS invoice_count,
        COALESCE((SELECT SUM(
            public.fn_to_base_amount(ob.currency_code, ob.amount,
                (SELECT er.rate_to_base FROM public.exchange_rates er
                 WHERE er.company_id = p_company_id AND er.currency_code = ob.currency_code
                 ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1))
            * CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END)
            FROM public.party_opening_balances ob
            WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id), 0)::NUMERIC AS opening_balance,
        EXISTS (SELECT 1 FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'broken') AS has_broken_promise,
        COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'pending'), 0)::BIGINT AS pending_promise_count,
        COALESCE((SELECT SUM(public.fn_to_base_amount(pp.currency_code, pp.amount,
            (SELECT er.rate_to_base FROM public.exchange_rates er
             WHERE er.company_id = p_company_id AND er.currency_code = pp.currency_code
             ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1))) FROM public.debt_payment_promises pp
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
        AND i.type = 'sale' AND i.status IN ('posted', 'confirmed', 'partially_paid') AND i.deleted_at IS NULL
    WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.phone, pc.name, p.credit_limit;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_debt_party_overview(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_party_overview(uuid, uuid) TO authenticated;
-- ─────────────────────────────────────────────────────────────
-- 6) get_debt_analytics_summary — تحويل موحّد عبر fn_to_base_amount
--    (كان يضرب في rate_to_base أعمى فيتضخم YER 410x)
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
    IF auth.uid() IS NOT NULL THEN
        PERFORM public.fn_assert_company_access(p_company_id);
    END IF;

    WITH dashboard_data AS (
        SELECT * FROM public.get_debt_followup_dashboard(p_company_id)
    ),
    rates AS (
        SELECT DISTINCT ON (currency_code)
            currency_code,
            rate_to_base
        FROM public.exchange_rates
        WHERE company_id = p_company_id
        ORDER BY currency_code, effective_date DESC, created_at DESC
    ),
    converted_debtors AS (
        SELECT
            d.*,
            public.fn_to_base_amount(d.currency_code, d.outstanding_balance, r.rate_to_base) AS converted_balance,
            public.fn_to_base_amount(d.currency_code, d.overdue_amount, r.rate_to_base) AS converted_overdue
        FROM dashboard_data d
        LEFT JOIN rates r ON r.currency_code = d.currency_code
    ),
    currency_agg AS (
        SELECT
            currency_code,
            SUM(outstanding_balance) AS balance,
            COUNT(*) AS cnt
        FROM dashboard_data
        WHERE outstanding_balance > 0
        GROUP BY currency_code
    )
    SELECT json_build_object(
        'total_receivables',
            COALESCE((SELECT SUM(converted_balance) FROM converted_debtors WHERE outstanding_balance > 0), 0)::NUMERIC,
        'overdue_receivables',
            COALESCE((SELECT SUM(converted_overdue) FROM converted_debtors WHERE overdue_amount > 0), 0)::NUMERIC,
        'due_today',
            COALESCE((SELECT SUM(converted_balance) FROM converted_debtors WHERE classification = 'due_today'), 0)::NUMERIC,
        'opening_balances_total',
            COALESCE((SELECT SUM(
                    public.fn_to_base_amount(ob.currency_code, ob.amount, r.rate_to_base)
                    * CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END
                )
                FROM public.party_opening_balances ob
                LEFT JOIN rates r ON r.currency_code = ob.currency_code
                WHERE ob.company_id = p_company_id), 0)::NUMERIC,
        'pending_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'pending'), 0),
        'pending_promises_amount',
            COALESCE((SELECT SUM(public.fn_to_base_amount(pp.currency_code, pp.amount, r.rate_to_base))
                FROM public.debt_payment_promises pp
                LEFT JOIN rates r ON r.currency_code = pp.currency_code
                WHERE pp.company_id = p_company_id AND pp.status = 'pending'), 0)::NUMERIC,
        'broken_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'broken'), 0),
        'broken_promises_amount',
            COALESCE((SELECT SUM(public.fn_to_base_amount(pp.currency_code, pp.amount, r.rate_to_base))
                FROM public.debt_payment_promises pp
                LEFT JOIN rates r ON r.currency_code = pp.currency_code
                WHERE pp.company_id = p_company_id AND pp.status = 'broken'), 0)::NUMERIC,
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
            COALESCE((SELECT COUNT(*)::INT FROM dashboard_data WHERE outstanding_balance > 0), 0),
        'needs_reminder',
            COALESCE((SELECT COUNT(*)::INT FROM dashboard_data WHERE reminder_status = 'needs_reminder'), 0),
        'by_currency',
            (SELECT json_agg(json_build_object(
                'currency', ca.currency_code,
                'balance', ca.balance,
                'count', ca.cnt))
             FROM currency_agg ca)
    ) INTO v_result;
    RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) TO authenticated, service_role;
-- ─────────────────────────────────────────────────────────────
-- 7) report_debt_aging — تحويل موحّد + 'confirmed'
-- ─────────────────────────────────────────────────────────────

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
    COALESCE(pr.name, 'نقدي') as customer_name,
    SUM(public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate)) as total,
    SUM(CASE WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days'
        THEN public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate) ELSE 0 END) as days_0_30,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '31 days'
        THEN public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate) ELSE 0 END) as days_31_60,
    SUM(CASE WHEN i.due_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE - INTERVAL '61 days'
        THEN public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate) ELSE 0 END) as days_61_90,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days'
        THEN public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate) ELSE 0 END) as days_90_plus
  FROM public.invoices i
  LEFT JOIN public.parties pr ON pr.id = i.party_id
  WHERE i.company_id = p_company_id
    AND i.type = 'sale'
    AND i.status IN ('posted', 'confirmed', 'partially_paid')
    AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    AND i.deleted_at IS NULL
  GROUP BY pr.id, pr.name
  ORDER BY total DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.report_debt_aging(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_debt_aging(uuid) TO authenticated;
-- ─────────────────────────────────────────────────────────────
-- 8) get_party_statement — ترتيب زمني مستقر (created_at)
--    بدل الترتيب المعجمي لواصفات UUID الذي أفسد الرصيد التراكمي،
--    مع إشارة supplier/both حسب نوع الطرف كالنسخة السابقة.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_party_statement(p_company_id uuid, p_party_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_movements json;
  v_party_type text;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  SELECT type INTO v_party_type
  FROM public.parties
  WHERE id = p_party_id AND company_id = p_company_id;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.entry_date, t.created_at, t.line_id), '[]'::json)
  INTO v_movements
  FROM (
    SELECT sub.line_id, sub.entry_date, sub.created_at, sub.ref, sub.operation_type, sub.description, sub.type,
           sub.debit, sub.credit, sub.currency,
           SUM(
             CASE
               WHEN v_party_type = 'supplier' THEN sub.credit - sub.debit
               ELSE sub.debit - sub.credit
             END
           ) OVER (
             PARTITION BY sub.currency
             ORDER BY sub.entry_date, sub.created_at, sub.line_id
             ROWS UNBOUNDED PRECEDING
           ) AS balance
    FROM (
      SELECT ob.id::text AS line_id,
             ob.entry_date,
             ob.created_at,
             'OB' AS ref,
             'رصيد افتتاحي' AS operation_type,
             COALESCE(ob.notes, 'رصيد افتتاحي') AS description,
             'opening_balance' AS type,
             CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE 0 END AS debit,
             CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE 0 END AS credit,
             ob.currency_code AS currency
      FROM public.party_opening_balances ob
      WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id

      UNION ALL

      SELECT jel.id::text AS line_id, je.entry_date,
        jel.created_at,
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
        jel.currency_code AS currency
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      JOIN public.accounts a ON a.id = jel.account_id
      WHERE je.company_id = p_company_id AND je.status='posted' AND je.deleted_at IS NULL AND jel.deleted_at IS NULL
        AND jel.party_id = p_party_id AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
    ) sub
  ) t;

  RETURN v_movements;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_party_statement(uuid,uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_party_statement(uuid,uuid) TO authenticated;
-- ─────────────────────────────────────────────────────────────
-- 9) get_dashboard_summary — تحويل افتتاحيات موحّد + 'confirmed'
--    (النسخة الحية من 20260908000012 مع تصحيح حصص العملة)
-- ─────────────────────────────────────────────────────────────

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
DECLARE
    vc uuid;
    v_effective_branch uuid;
    v_is_admin boolean;
    v_opening_cust_debts NUMERIC;
    v_opening_supp_debts NUMERIC;
BEGIN
    vc := public.verify_company_access(p_company_id);
    v_is_admin := public.is_main_branch_or_admin(vc);

    IF v_is_admin THEN
        v_effective_branch := p_branch_id;
    ELSE
        v_effective_branch := public.get_user_branch_id(vc);
    END IF;

    -- Opening customer debts (تحويل موحّد عبر fn_to_base_amount)
    SELECT COALESCE(SUM(
        public.fn_to_base_amount(
            ob.currency_code,
            ob.amount,
            (SELECT er.rate_to_base FROM public.exchange_rates er
             WHERE er.company_id = vc AND er.currency_code = ob.currency_code
             ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1))
        * CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END
    ), 0) INTO v_opening_cust_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'customer' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (v_effective_branch IS NULL OR ob.branch_id = v_effective_branch OR p.branch_id = v_effective_branch);

    -- Opening supplier debts
    SELECT COALESCE(SUM(
        public.fn_to_base_amount(
            ob.currency_code,
            ob.amount,
            (SELECT er.rate_to_base FROM public.exchange_rates er
             WHERE er.company_id = vc AND er.currency_code = ob.currency_code
             ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1))
        * CASE WHEN ob.direction = 'credit' THEN 1 ELSE -1 END
    ), 0) INTO v_opening_supp_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'supplier' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (v_effective_branch IS NULL OR ob.branch_id = v_effective_branch OR p.branch_id = v_effective_branch);
    RETURN (SELECT jsonb_build_object(
        'total_sales', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
              ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
            END
          ), 2) FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'sale'
            AND i.status IN ('posted','paid','confirmed','partially_paid')
            AND i.deleted_at IS NULL
            AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
            AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)), 0),
        'total_purchases', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
              ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
            END
          ), 2) FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND i.status IN ('posted','paid','confirmed','partially_paid')
            AND i.deleted_at IS NULL
            AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
            AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)), 0),
        'total_expenses', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN e.currency_code = 'SAR' OR e.currency_code IS NULL OR sc.is_base THEN e.amount
              WHEN sc.exchange_operator = 'divide' AND e.exchange_rate > 0 THEN e.amount / e.exchange_rate
              ELSE e.amount * COALESCE(e.exchange_rate, 1)
            END
          ), 2) FROM public.expenses e
          LEFT JOIN public.supported_currencies sc ON sc.code = e.currency_code
          WHERE e.company_id = vc AND e.status IN ('posted','paid') AND e.deleted_at IS NULL
            AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
            AND (p_date_to IS NULL OR e.expense_date <= p_date_to)
            AND (v_effective_branch IS NULL OR e.branch_id = v_effective_branch)), 0),
        'receipt_bonds', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN p.currency_code = 'SAR' OR p.currency_code IS NULL OR sc.is_base THEN p.amount
              WHEN sc.exchange_operator = 'divide' AND p.exchange_rate > 0 THEN p.amount / p.exchange_rate
              ELSE p.amount * COALESCE(p.exchange_rate, 1)
            END
          ), 2) FROM public.payments p
          LEFT JOIN public.supported_currencies sc ON sc.code = p.currency_code
          WHERE p.company_id = vc AND p.type = 'receipt' AND p.status = 'posted' AND p.deleted_at IS NULL
            AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
            AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
            AND (v_effective_branch IS NULL OR p.branch_id = v_effective_branch)), 0),
        'payment_bonds', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN p.currency_code = 'SAR' OR p.currency_code IS NULL OR sc.is_base THEN p.amount
              WHEN sc.exchange_operator = 'divide' AND p.exchange_rate > 0 THEN p.amount / p.exchange_rate
              ELSE p.amount * COALESCE(p.exchange_rate, 1)
            END
          ), 2) FROM public.payments p
          LEFT JOIN public.supported_currencies sc ON sc.code = p.currency_code
          WHERE p.company_id = vc AND p.type = 'disbursement' AND p.status = 'posted' AND p.deleted_at IS NULL
            AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
            AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
            AND (v_effective_branch IS NULL OR p.branch_id = v_effective_branch)), 0),
        'total_debts', (COALESCE((SELECT ROUND(SUM(
            public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate)
          ), 2)
          FROM public.invoices i
          WHERE i.company_id = vc AND i.type = 'sale'
            AND i.status IN ('posted','confirmed','partially_paid')
            AND i.deleted_at IS NULL
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_cust_debts),
        'total_supplier_debts', (COALESCE((SELECT ROUND(SUM(
            public.fn_to_base_amount(i.currency_code, (i.total_amount - COALESCE(i.paid_amount, 0)), i.exchange_rate)
          ), 2)
          FROM public.invoices i
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND i.status IN ('posted','confirmed','partially_paid')
            AND i.deleted_at IS NULL
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_supp_debts),
        'invoice_count', (SELECT COUNT(*) FROM public.invoices
            WHERE company_id = vc AND type = 'sale'
              AND status NOT IN ('draft','void')
              AND deleted_at IS NULL
              AND (p_date_from IS NULL OR issue_date >= p_date_from)
              AND (p_date_to IS NULL OR issue_date <= p_date_to)
              AND (v_effective_branch IS NULL OR branch_id = v_effective_branch))
    ));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated, service_role;

COMMIT;