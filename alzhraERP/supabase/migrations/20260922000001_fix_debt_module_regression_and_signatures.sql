-- ============================================================
-- Migration: 20260922000001_fix_debt_module_regression_and_signatures.sql
-- ============================================================
-- الغرض: إصلاح انحدارات قسم الديون والتحصيل المكتشفة في مراجعة 2026-09-22
--
-- السياق:
--   سلسلة patch_rpc_security_part2/3/4 (20260916000014-16) أعادت كتابة
--   دوال الديون بنسخ قديمة ألغت إصلاحات ADR-011 (20260823000001) وتوحيد
--   وحدات العملات (20260911000001/2):
--     1) break_overdue_promises / complete_promise: فقدان بوابة
--        user_can_manage_debts وفحص صلاحية السند المرتبط (INVALID_PAYMENT)
--        → أي عضو بالشركة يستطيع كسر/إتمام الوعود عبر RPC يتجاوز RLS.
--     2) record_debt_reminder: فقدان فحص ملكية القالب (INVALID_TEMPLATE).
--     3) get_debt_analytics_summary / get_debt_today_tasks /
--        get_debt_party_overview: عادت حالة 'partial' غير الصالحة
--        (ليست في invoices_status_check) بدل 'partially_paid' → الفواتير
--        المسددة جزئياً والمؤكدة تُستبعد كلياً؛ وعاد الجمع الخام بين
--        العملات دون تحويل للعملة الأساس (تضخيم/خلط YER مع SAR).
--   كما أن الواجهة تمرر p_branch_id للتحليلات والمهام بينما التواقيع
--   النهائية تقبل p_company_id فقط → PGRST202 صامتة تُمتص بالواجهة
--   فتظهر النظرة العامة أصفاراً ومهام اليوم فارغة.
--   وأخيراً: upsert إعدادات المتابعة والأرصدة الافتتاحية يعتمد قيود
--   تفرد غير موجودة مادياً (onConflict تفشل بـ 42P10).
--
-- الإصلاحات:
--   1) debt_followup_config(company_id) و
--      party_opening_balances(company_id,party_id,currency_code):
--      قيود تفرد فريدة بعد تسوية أي تكرارات قائمة.
--   2) get_debt_followup_dashboard: تُقرأ نوافذ المحرك من
--      debt_followup_config عند تمرير NULL (الإعدادات تصبح فعّالة)،
--      وتسامح سجلات الفرع NULL كبيانات مشتركة على مستوى الشركة.
--   3) get_debt_analytics_summary: توقيع جديد (uuid, uuid DEFAULT NULL)
--      مع عزل فروع كامل (get_auth_branches)، الحالات الصحيحة، تحويل موحد
--      عبر fn_to_base_amount، by_currency للعملاء المدينين فقط، وعدّ
--      عملاء فريدين (DISTINCT party_id).
--   4) get_debt_today_tasks: توقيع (uuid, uuid DEFAULT NULL) + الحالات
--      الصحيحة + فلترة فروع.
--   5) get_debt_party_overview: الحالات الصحيحة.
--   6) استعادة بوابات الكتابة الثلاث (record/break/complete) كاملة.
--   7) إعادة تأكيد الامتيازات (REVOKE anon/PUBLIC، GRANT authenticated).
--
-- التوافق: الاستدعاءات بوسيط واحد (كملف الاختبارات) تبقى صالحة عبر
-- DEFAULT NULL، والاستدعاءات بوسيطين من الواجهة تتطابق مع التوقيع الجديد.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 0) قيود التفرد المفقودة (بعد تسوية التكرارات — نُبقي الأحدث تحديثاً)
-- ─────────────────────────────────────────────────────────────

DELETE FROM public.debt_followup_config a
USING public.debt_followup_config b
WHERE a.company_id = b.company_id
  AND a.id <> b.id
  AND (b.updated_at, b.id) > (a.updated_at, a.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_debt_followup_config_company
  ON public.debt_followup_config (company_id);

DELETE FROM public.party_opening_balances a
USING public.party_opening_balances b
WHERE a.company_id = b.company_id
  AND a.party_id = b.party_id
  AND a.currency_code = b.currency_code
  AND a.id <> b.id
  AND (b.updated_at, b.id) > (a.updated_at, a.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_party_opening_company_party_currency
  ON public.party_opening_balances (company_id, party_id, currency_code);

-- ─────────────────────────────────────────────────────────────
-- 1) get_debt_followup_dashboard — يبقى التوقيع السداسي (المفرد بعد
--    إسقاط التحميل الزائد الغامض 42725) مع:
--    * نوافذ المحرك: المعامل الصريح ← إعدادات الشركة المحفوظة ← الافتراضي.
--    * تسامح الفرع NULL (بيانات قديمة/مشتركة) في فلاتر الفروع.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_debt_followup_dashboard(
    p_company_id uuid,
    p_due_soon_days integer DEFAULT NULL::integer,
    p_critical_days integer DEFAULT NULL::integer,
    p_reminder_window_days integer DEFAULT NULL::integer,
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
    v_cfg record;
    v_due_soon integer;
    v_critical integer;
    v_rem_window integer;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    -- نوافذ المحرك: القيمة الصريحة تتقدم، ثم إعدادات الشركة المحفوظة،
    -- ثم الافتراضي. (يجعل شاشة «الإعدادات» فعّالة فعلاً)
    SELECT c.due_soon_days, c.critical_days, c.reminder_window_days
      INTO v_cfg
      FROM public.debt_followup_config c
     WHERE c.company_id = p_company_id
     LIMIT 1;

    v_due_soon   := COALESCE(p_due_soon_days,        v_cfg.due_soon_days,        7);
    v_critical   := COALESCE(p_critical_days,        v_cfg.critical_days,        30);
    v_rem_window := COALESCE(p_reminder_window_days, v_cfg.reminder_window_days, 3);

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
          AND (v_is_super OR v_has_all_branches OR i.branch_id IS NULL OR i.branch_id = ANY(v_target_branches))
        GROUP BY i.party_id, i.currency_code
    ),
    opening_balances AS (
        SELECT
            ob.party_id,
            ob.currency_code,
            SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END) AS opening_amount
        FROM public.party_opening_balances ob
        WHERE ob.company_id = p_company_id
          AND (v_is_super OR v_has_all_branches OR ob.branch_id IS NULL OR ob.branch_id = ANY(v_target_branches))
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
          AND (v_is_super OR v_has_all_branches OR pp.branch_id IS NULL OR pp.branch_id = ANY(v_target_branches))
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
                 AND (v_today - c.oldest_due_date) >= v_critical THEN 'critical'
            WHEN c.oldest_due_date IS NOT NULL AND c.oldest_due_date < v_today THEN 'overdue'
            WHEN c.next_due_date = v_today THEN 'due_today'
            WHEN c.next_due_date IS NOT NULL
                 AND c.next_due_date <= v_today + v_due_soon THEN 'due_soon'
            ELSE 'current'
        END AS classification,
        CASE
            WHEN lr.last_reminded_at IS NOT NULL
                 AND lr.last_reminded_at >= NOW() - make_interval(days => v_rem_window)
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
      AND (v_is_super OR v_has_all_branches OR p.branch_id IS NULL OR p.branch_id = ANY(v_target_branches))
    LEFT JOIN public.party_categories pc ON pc.id = p.category_id
    LEFT JOIN promise_summary ps ON ps.party_id = c.party_id
    LEFT JOIN last_reminders lr ON lr.party_id = c.party_id
    LEFT JOIN last_contacts lc ON lc.customer_id = c.party_id
    WHERE c.outstanding_balance > 0
    ORDER BY c.overdue_amount DESC NULLS LAST, days_overdue DESC NULLS LAST
    LIMIT p_limit;
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 2) get_debt_analytics_summary — توقيع (uuid, uuid DEFAULT NULL)
--    * الحالات الصحيحة ('partially_paid' بدل 'partial' غير الصالحة).
--    * تحويل موحد للعملة الأساس عبر fn_to_base_amount.
--    * عزل فروع كامل مطابق للوحة المتابعة (get_auth_branches).
--    * by_currency للعملاء المدينين فقط + عدّ عملاء فريدين.
-- ─────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_debt_analytics_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_debt_analytics_summary(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid
)
 RETURNS json
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
            RETURN json_build_object(
                'total_receivables', 0, 'overdue_receivables', 0, 'due_today', 0,
                'opening_balances_total', 0, 'pending_promises', 0,
                'pending_promises_amount', 0, 'broken_promises', 0,
                'broken_promises_amount', 0, 'sent_messages', 0,
                'failed_messages', 0, 'failed_messages_24h', 0,
                'total_debtors', 0, 'needs_reminder', 0, 'by_currency', '[]'::json);
        END IF;
    END IF;

    IF p_branch_id IS NOT NULL THEN
        IF NOT (p_branch_id = ANY(v_allowed_branches)) AND NOT v_is_super THEN
            RETURN json_build_object(
                'total_receivables', 0, 'overdue_receivables', 0, 'due_today', 0,
                'opening_balances_total', 0, 'pending_promises', 0,
                'pending_promises_amount', 0, 'broken_promises', 0,
                'broken_promises_amount', 0, 'sent_messages', 0,
                'failed_messages', 0, 'failed_messages_24h', 0,
                'total_debtors', 0, 'needs_reminder', 0, 'by_currency', '[]'::json);
        END IF;
        v_target_branches := ARRAY[p_branch_id];
    ELSE
        v_target_branches := v_allowed_branches;
        SELECT (COUNT(*) = (SELECT COUNT(*) FROM public.branches WHERE company_id = p_company_id))
        INTO v_has_all_branches
        FROM unnest(v_allowed_branches);
    END IF;

    RETURN (
    WITH dashboard_data AS (
        SELECT * FROM public.get_debt_followup_dashboard(p_company_id, NULL, NULL, NULL, p_branch_id)
    ),
    rates AS (
        SELECT DISTINCT ON (currency_code)
            currency_code,
            rate_to_base
        FROM public.exchange_rates
        WHERE company_id = p_company_id
        ORDER BY currency_code, effective_date DESC, created_at DESC
    ),
    converted AS (
        SELECT
            d.*,
            public.fn_to_base_amount(d.currency_code, d.outstanding_balance, COALESCE(r.rate_to_base, 1)) AS converted_balance,
            public.fn_to_base_amount(d.currency_code, d.overdue_amount,     COALESCE(r.rate_to_base, 1)) AS converted_overdue
        FROM dashboard_data d
        LEFT JOIN rates r ON r.currency_code = d.currency_code
    )
    SELECT json_build_object(
        'total_receivables',
            COALESCE((SELECT SUM(c2.converted_balance) FROM converted c2
                WHERE c2.outstanding_balance > 0), 0)::NUMERIC,
        'overdue_receivables',
            COALESCE((SELECT SUM(c2.converted_overdue) FROM converted c2
                WHERE c2.overdue_amount > 0), 0)::NUMERIC,
        'due_today',
            COALESCE((SELECT SUM(c2.converted_balance) FROM converted c2
                WHERE c2.classification = 'due_today'), 0)::NUMERIC,
        'opening_balances_total',
            COALESCE((SELECT SUM(
                     public.fn_to_base_amount(ob.currency_code, ob.amount, COALESCE(r.rate_to_base, 1))
                     * CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END)
                 FROM public.party_opening_balances ob
                 LEFT JOIN rates r ON r.currency_code = ob.currency_code
                 WHERE ob.company_id = p_company_id
                   AND (v_is_super OR v_has_all_branches
                        OR ob.branch_id IS NULL OR ob.branch_id = ANY(v_target_branches))), 0)::NUMERIC,
        'pending_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises pp
                WHERE pp.company_id = p_company_id AND pp.status = 'pending'
                  AND (v_is_super OR v_has_all_branches
                       OR pp.branch_id IS NULL OR pp.branch_id = ANY(v_target_branches))), 0),
        'pending_promises_amount',
            COALESCE((SELECT SUM(public.fn_to_base_amount(pp.currency_code, pp.amount, COALESCE(r.rate_to_base, 1)))
                FROM public.debt_payment_promises pp
                LEFT JOIN rates r ON r.currency_code = pp.currency_code
                WHERE pp.company_id = p_company_id AND pp.status = 'pending'
                  AND (v_is_super OR v_has_all_branches
                       OR pp.branch_id IS NULL OR pp.branch_id = ANY(v_target_branches))), 0)::NUMERIC,
        'broken_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises pp
                WHERE pp.company_id = p_company_id AND pp.status = 'broken'
                  AND (v_is_super OR v_has_all_branches
                       OR pp.branch_id IS NULL OR pp.branch_id = ANY(v_target_branches))), 0),
        'broken_promises_amount',
            COALESCE((SELECT SUM(public.fn_to_base_amount(pp.currency_code, pp.amount, COALESCE(r.rate_to_base, 1)))
                FROM public.debt_payment_promises pp
                LEFT JOIN rates r ON r.currency_code = pp.currency_code
                WHERE pp.company_id = p_company_id AND pp.status = 'broken'
                  AND (v_is_super OR v_has_all_branches
                       OR pp.branch_id IS NULL OR pp.branch_id = ANY(v_target_branches))), 0)::NUMERIC,
        'sent_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log ml
                WHERE ml.company_id = p_company_id AND ml.status = 'sent'
                  AND (v_is_super OR v_has_all_branches
                       OR ml.branch_id IS NULL OR ml.branch_id = ANY(v_target_branches))), 0),
        'failed_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log ml
                WHERE ml.company_id = p_company_id AND ml.status = 'failed'
                  AND (v_is_super OR v_has_all_branches
                       OR ml.branch_id IS NULL OR ml.branch_id = ANY(v_target_branches))), 0),
        'failed_messages_24h',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log ml
                WHERE ml.company_id = p_company_id AND ml.status = 'failed'
                  AND ml.created_at >= NOW() - INTERVAL '24 hours'
                  AND (v_is_super OR v_has_all_branches
                       OR ml.branch_id IS NULL OR ml.branch_id = ANY(v_target_branches))), 0),
        'total_debtors',
            COALESCE((SELECT COUNT(DISTINCT c2.party_id) FROM converted c2
                WHERE c2.outstanding_balance > 0), 0),
        'needs_reminder',
            COALESCE((SELECT COUNT(DISTINCT c2.party_id) FROM converted c2
                WHERE c2.reminder_status = 'needs_reminder'
                  AND c2.outstanding_balance > 0), 0),
        'by_currency',
            COALESCE((SELECT json_agg(json_build_object(
                        'currency', x.currency_code,
                        'balance', x.balance,
                        'count', x.cnt) ORDER BY x.balance DESC)
                FROM (SELECT d.currency_code,
                             SUM(d.outstanding_balance) AS balance,
                             COUNT(DISTINCT d.party_id) AS cnt
                      FROM dashboard_data d
                      WHERE d.outstanding_balance > 0
                      GROUP BY d.currency_code) x), '[]'::json)
    ));
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 3) get_debt_today_tasks — توقيع (uuid, uuid DEFAULT NULL)
--    * الحالات الصحيحة ('partially_paid' بدل 'partial' غير الصالحة)
--      وإدراج 'confirmed' كما في لوحة المتابعة.
--    * عزل فروع كامل مطابق للوحة المتابعة.
-- ─────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_debt_today_tasks(uuid);

CREATE OR REPLACE FUNCTION public.get_debt_today_tasks(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(task_type character varying, party_id uuid, party_name text, party_phone text, currency_code text, amount numeric, reference_info text, urgency character varying)
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
    SELECT * FROM (
        -- 1) فواتير مستحقة اليوم (بالحالات الصحيحة كاملة)
        SELECT 'due_today'::VARCHAR AS task_type,
            i.party_id, p.name::TEXT AS party_name, p.phone::TEXT AS party_phone,
            i.currency_code::TEXT AS currency_code,
            (i.total_amount - COALESCE(i.paid_amount, 0))::NUMERIC AS amount,
            COALESCE(i.invoice_number, i.id::TEXT)::TEXT AS reference_info,
            'high'::VARCHAR AS urgency
        FROM public.invoices i
        JOIN public.parties p ON p.id = i.party_id AND p.deleted_at IS NULL
        WHERE i.company_id = p_company_id
          AND i.type = 'sale'
          AND i.status IN ('posted', 'confirmed', 'partially_paid')
          AND i.due_date = v_today AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
          AND (v_is_super OR v_has_all_branches
               OR i.branch_id IS NULL OR i.branch_id = ANY(v_target_branches))

        UNION ALL

        -- 2) وعود سداد مستحقة اليوم
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
          AND (v_is_super OR v_has_all_branches
               OR pp.branch_id IS NULL OR pp.branch_id = ANY(v_target_branches))

        UNION ALL

        -- 3) وعود متجاوزة ما زالت قائمة (أولوية قصوى)
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
          AND (v_is_super OR v_has_all_branches
               OR pp.branch_id IS NULL OR pp.branch_id = ANY(v_target_branches))

        UNION ALL

        -- 4) رسائل فاشلة اليوم
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
          AND (v_is_super OR v_has_all_branches
               OR dm.branch_id IS NULL OR dm.branch_id = ANY(v_target_branches))
    ) sub
    ORDER BY CASE sub.urgency
        WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
        sub.amount DESC NULLS LAST;
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 4) get_debt_party_overview — الحالات الصحيحة ('partially_paid' بدل
--    'partial' غير الصالحة، وإدراج 'confirmed' كما في لوحة المتابعة).
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
        AND i.type = 'sale' AND i.status IN ('posted', 'confirmed', 'partially_paid') AND i.deleted_at IS NULL
    WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.phone, pc.name, p.credit_limit;
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 5) استعادة بوابات الكتابة الثلاث (كانت أُسقطت في patch_rpc_security)
-- ─────────────────────────────────────────────────────────────

-- 5-أ) record_debt_reminder — استعادة فحص ملكية القالب (INVALID_TEMPLATE)
CREATE OR REPLACE FUNCTION public.record_debt_reminder(p_company_id uuid, p_party_id uuid, p_message_text text, p_channel character varying DEFAULT 'whatsapp'::character varying, p_template_id uuid DEFAULT NULL::uuid, p_recipient character varying DEFAULT NULL::character varying, p_related_entity_type character varying DEFAULT NULL::character varying, p_related_entity_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(message_log_id uuid, activity_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_msg_id UUID;
DECLARE v_act_id UUID;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    -- Tenant guard: party must belong to this company
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

-- 5-ب) break_overdue_promises — استعادة بوابة الأدوار
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

-- 5-ج) complete_promise — بوابة الأدوار + التحقق من السند المرتبط
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
-- 6) إعادة تأكيد الامتيازات (defensive hardening pattern):
--    سحب anon/PUBLIC ومنح authenticated فقط.
-- ─────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_debt_today_tasks(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_debt_today_tasks(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_today_tasks(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_debt_party_overview(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_party_overview(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_debt_reminder(uuid, uuid, text, character varying, uuid, character varying, character varying, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_debt_reminder(uuid, uuid, text, character varying, uuid, character varying, character varying, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.break_overdue_promises(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.break_overdue_promises(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_promise(uuid, uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_promise(uuid, uuid, uuid) TO authenticated;

COMMIT;











