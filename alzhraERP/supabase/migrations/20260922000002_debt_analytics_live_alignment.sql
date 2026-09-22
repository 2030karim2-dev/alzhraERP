-- ============================================================
-- Migration: 20260922000002_debt_analytics_live_alignment.sql
-- ============================================================
-- السياق: تدقيق مباشر على قاعدة الإنتاج (2026-09-22) أظهر أن القاعدة الحية
-- سليمة في بنود P0 المذكورة في 20260922000001 (بوابات الأدوار في دوال
-- الكتابة، الحالات الصحيحة، توقيعا (uuid, uuid) للتحليلات والمهام، قيدا
-- التفرد على debt_followup_config و party_opening_balances) — أي أن تلك
-- الانحدارات موجودة في مسار هجرات المستودع فقط ولا وجود لها حياً؛ ولذلك
-- لا تُنشر 20260922000001 على القاعدة الحية (كانت ستستبدل دوال سليمة،
-- بما فيها get_debt_party_overview الحي الذي يحوّل للعملة الأساس ويعزل
-- الفروع بينما نسخة المستودع لا تفعل).
--
-- الفجوات الحقيقية المتبقية محصورة في get_debt_analytics_summary:
--   [1] نوافذ المحرك مضمّنة (7/30/3) داخلياً → شاشة «الإعدادات»
--       (debt_followup_config) لا تؤثر على مؤشرات النظرة العامة، بخلاف
--       لوحة المتابعة التي تمرر لها الواجهة الإعدادات صراحةً.
--   [2] total_debtors / needs_reminder تعدّان صفوفاً (طرف×عملة) لا عملاء
--       فريدين → رقم «عميل مدين» مضخّم عند تعدد العملات للطرف.
--   [3] أرصدة افتتاحية بفرع NULL تُستبعد لمستخدمي الفروع المحدودة
--       (0 صف حالياً — تحصين مستقبلي).
--
-- الرقعة جراحية: إعادة إنشاء الدالة نفسها بتعديل المواضع الثلاثة فقط،
-- دون المساس بأي دالة أخرى. ملاحظة ترميز: النصوص الحرفية (string literals)
-- داخل الدالة ASCII بالكامل؛ والعربية موجودة في التعليقات فقط (تُنقل UTF-8).
-- ============================================================

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
    v_result JSON;
    v_allowed_branches uuid[];
    v_target_branches uuid[];
    v_due_soon integer;
    v_critical integer;
    v_rem_window integer;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        PERFORM public.fn_assert_company_access(p_company_id);
    END IF;

    -- [1] نوافذ المحرك من إعدادات الشركة المحفوظة (والافتراضي 7/30/3)
    SELECT c.due_soon_days, c.critical_days, c.reminder_window_days
      INTO v_due_soon, v_critical, v_rem_window
      FROM public.debt_followup_config c
     WHERE c.company_id = p_company_id
     LIMIT 1;

    v_due_soon   := COALESCE(v_due_soon, 7);
    v_critical   := COALESCE(v_critical, 30);
    v_rem_window := COALESCE(v_rem_window, 3);

    SELECT ARRAY_AGG(b) INTO v_allowed_branches
    FROM public.get_auth_branches(p_company_id) AS b;

    IF v_allowed_branches IS NULL OR ARRAY_LENGTH(v_allowed_branches, 1) = 0 THEN
        RETURN '{}'::JSON;
    END IF;

    IF p_branch_id IS NOT NULL THEN
        IF NOT (p_branch_id = ANY(v_allowed_branches)) AND NOT public.is_super_admin() THEN
            RETURN '{}'::JSON;
        END IF;
        v_target_branches := ARRAY[p_branch_id];
    ELSE
        v_target_branches := v_allowed_branches;
    END IF;

    WITH dashboard_data AS (
        SELECT * FROM public.get_debt_followup_dashboard(
            p_company_id, v_due_soon, v_critical, v_rem_window, p_branch_id)
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
        -- [2] عدّ العملاء فريداً لكل عملة
        SELECT
            currency_code,
            SUM(outstanding_balance) AS balance,
            COUNT(DISTINCT party_id) AS cnt
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
                WHERE ob.company_id = p_company_id
                  -- [3] تسامح فرع NULL (بيانات قديمة/مشتركة)
                  AND (public.is_super_admin() OR ob.branch_id IS NULL OR ob.branch_id = ANY(v_target_branches))
            ), 0)::NUMERIC,
        'pending_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises pp
                WHERE pp.company_id = p_company_id AND pp.status = 'pending'
                  AND pp.party_id IN (SELECT id FROM public.parties WHERE branch_id = ANY(v_target_branches))
            ), 0),
        'pending_promises_amount',
            COALESCE((SELECT SUM(public.fn_to_base_amount(pp.currency_code, pp.amount, r.rate_to_base))
                FROM public.debt_payment_promises pp
                LEFT JOIN rates r ON r.currency_code = pp.currency_code
                WHERE pp.company_id = p_company_id AND pp.status = 'pending'
                  AND pp.party_id IN (SELECT id FROM public.parties WHERE branch_id = ANY(v_target_branches))
            ), 0)::NUMERIC,
        'broken_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises pp
                WHERE pp.company_id = p_company_id AND pp.status = 'broken'
                  AND pp.party_id IN (SELECT id FROM public.parties WHERE branch_id = ANY(v_target_branches))
            ), 0),
        'broken_promises_amount',
            COALESCE((SELECT SUM(public.fn_to_base_amount(pp.currency_code, pp.amount, r.rate_to_base))
                FROM public.debt_payment_promises pp
                LEFT JOIN rates r ON r.currency_code = pp.currency_code
                WHERE pp.company_id = p_company_id AND pp.status = 'broken'
                  AND pp.party_id IN (SELECT id FROM public.parties WHERE branch_id = ANY(v_target_branches))
            ), 0)::NUMERIC,
        'sent_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log ml
                WHERE ml.company_id = p_company_id AND ml.status = 'sent'
                  AND ml.party_id IN (SELECT id FROM public.parties WHERE branch_id = ANY(v_target_branches))
            ), 0),
        'failed_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log ml
                WHERE ml.company_id = p_company_id AND ml.status = 'failed'
                  AND ml.party_id IN (SELECT id FROM public.parties WHERE branch_id = ANY(v_target_branches))
            ), 0),
        'failed_messages_24h',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log ml
                WHERE ml.company_id = p_company_id AND ml.status = 'failed'
                  AND ml.created_at >= NOW() - INTERVAL '24 hours'
                  AND ml.party_id IN (SELECT id FROM public.parties WHERE branch_id = ANY(v_target_branches))
            ), 0),
        -- [2] عدد العملاء المدينين فريداً (لا صفوف طرف×عملة)
        'total_debtors',
            COALESCE((SELECT COUNT(DISTINCT party_id)::INT FROM dashboard_data WHERE outstanding_balance > 0), 0),
        'needs_reminder',
            COALESCE((SELECT COUNT(DISTINCT party_id)::INT FROM dashboard_data WHERE reminder_status = 'needs_reminder'), 0),
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

REVOKE EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid, uuid) TO authenticated;

