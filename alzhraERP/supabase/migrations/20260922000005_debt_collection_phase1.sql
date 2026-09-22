-- ============================================================
-- Migration: 20260922000005_debt_collection_phase1.sql
-- ============================================================
-- المرحلة 1 من خارطة تحسين جودة التحصيل ورفع الإنتاجية:
--   A1: إغلاق الوعود تلقائياً عند ترحيل سند القبض
--       (الأقدم أولاً حسب promise_date، بسقف مبلغ السند، لنفس الطرف والعملة)
--   A8: مفتاح عدم التكرار في debt_message_log + معامل في record_debt_reminder
--       (يمنع تسجيل التذكير مرتين عند النقر المزدوج/إعادة المحاولة)
--   A3: شرائح التقادم (aging) في get_debt_analytics_summary
--       — إعادة إنشاء الدالة بذات منطق النسخة الحية المعزول بالفروع
--         والمحوَّل للعملة الأساس + مفتاح aging (تسمياته في الواجهة).
-- ملاحظة ترميز: النصوص الحرفية داخل الدوال إنجليزية، باستثناء عنوان النشاط
--         'تذكير دين' كما في النسخة الحية (لا تغيير سلوك). النشر يجب أن يكون
--         بجسم UTF-8 bytes لأن PowerShell يرمّز النص كـ ASCII فيُسقط العربية.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- A8-أ) أعمدة عدم التكرار ومعرّف المزوّد (الأخير للأتمتة لاحقاً)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.debt_message_log ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.debt_message_log ADD COLUMN IF NOT EXISTS provider_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_debt_message_log_idempotency
  ON public.debt_message_log (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- A1) إغلاق الوعود تلقائياً عند السداد
--     يُشغَّل فقط لسند قبض مُرحّل غير محذوف. لا يمسّ جدول السندات،
--     ويكتب على الوعود فقط (SECURITY DEFINER بلا منح للمستخدمين).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_complete_promises_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_remaining numeric;
    v_p         RECORD;
BEGIN
    IF NEW.company_id IS NULL OR NEW.party_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_remaining := GREATEST(COALESCE(NEW.amount, 0), 0);
    IF v_remaining <= 0 THEN
        RETURN NEW;
    END IF;

    FOR v_p IN
        SELECT pp.id, pp.amount
        FROM public.debt_payment_promises pp
        WHERE pp.company_id = NEW.company_id
          AND pp.party_id   = NEW.party_id
          AND pp.status     = 'pending'
          AND COALESCE(pp.currency_code, 'SAR') = COALESCE(NEW.currency_code, 'SAR')
        ORDER BY pp.promise_date ASC, pp.created_at ASC
    LOOP
        EXIT WHEN v_remaining < v_p.amount;
        UPDATE public.debt_payment_promises
           SET status         = 'completed',
               completed_at   = NOW(),
               updated_at     = NOW(),
               reference_type = 'payment',
               reference_id   = NEW.id
         WHERE id = v_p.id AND status = 'pending';
        v_remaining := v_remaining - v_p.amount;
    END LOOP;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_complete_promises_on_payment ON public.payments;
CREATE TRIGGER trg_complete_promises_on_payment
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (NEW.type = 'receipt' AND NEW.status = 'posted' AND NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.fn_complete_promises_on_payment();

REVOKE ALL ON FUNCTION public.fn_complete_promises_on_payment() FROM anon, PUBLIC, authenticated;

-- ─────────────────────────────────────────────────────────────
-- A8-ب) record_debt_reminder + مفتاح عدم التكرار
--       إعادة الإنشاء للتوقيع التساعي (الوسيط الجديد اختياري، فتبقى
--       الاستدعاءات القديمة صالحة). عند تكرار المفتاح: تُعاد نفس الرسالة
--       بلا سجل أو نشاط جديد (لا استثناء).
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.record_debt_reminder(uuid, uuid, text, character varying, uuid, character varying, character varying, uuid);

CREATE OR REPLACE FUNCTION public.record_debt_reminder(
    p_company_id uuid,
    p_party_id uuid,
    p_message_text text,
    p_channel character varying DEFAULT 'whatsapp'::character varying,
    p_template_id uuid DEFAULT NULL::uuid,
    p_recipient character varying DEFAULT NULL::character varying,
    p_related_entity_type character varying DEFAULT NULL::character varying,
    p_related_entity_id uuid DEFAULT NULL::uuid,
    p_idempotency_key text DEFAULT NULL
)
 RETURNS TABLE(message_log_id uuid, activity_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_msg_id  UUID;
    v_act_id  UUID;
    v_existing UUID;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    -- إعادة محاولة/نقر مزدوج: أعد الرسالة المسجلة بدل إنشاء سجل جديد
    IF p_idempotency_key IS NOT NULL THEN
        SELECT ml.id INTO v_existing
        FROM public.debt_message_log ml
        WHERE ml.company_id = p_company_id
          AND ml.idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_existing IS NOT NULL THEN
            RETURN QUERY SELECT v_existing, NULL::UUID;
            RETURN;
        END IF;
    END IF;

    -- حارس المستأجر: يجب أن ينتمي الطرف لنفس الشركة
    IF NOT EXISTS (
        SELECT 1 FROM public.parties p
        WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'INVALID_PARTY';
    END IF;

    -- ملكية القالب: لا يجوز استخدام قالب شركة أخرى
    IF p_template_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.debt_message_templates t
        WHERE t.id = p_template_id AND t.company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'INVALID_TEMPLATE';
    END IF;

    INSERT INTO public.debt_message_log (
        company_id, party_id, channel, template_id, message_text,
        status, recipient, related_entity_type, related_entity_id,
        created_by, sent_at, idempotency_key
    ) VALUES (
        p_company_id, p_party_id, p_channel, p_template_id, p_message_text,
        'sent', p_recipient, p_related_entity_type, p_related_entity_id,
        auth.uid(), NOW(), p_idempotency_key
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

REVOKE EXECUTE ON FUNCTION public.record_debt_reminder(uuid, uuid, text, character varying, uuid, character varying, character varying, uuid, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.record_debt_reminder(uuid, uuid, text, character varying, uuid, character varying, character varying, uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- A3) get_debt_analytics_summary + شرائح التقادم
--     إعادة الإنشاء بذات منطق النسخة الحية (عزل الفروع + تحويل العملة
--     الأساس + عدّ العملاء فريداً + نوافذ الإعدادات) وإضافة مفتاح
--     aging: مصفوفة [{key,value,count}] بلا تسميات (التسميات في الواجهة).
-- ─────────────────────────────────────────────────────────────
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

    -- نوافذ المحرك من إعدادات الشركة المحفوظة (والافتراضي 7/30/3)
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
        -- شرائح التقادم: تكديس حسب أقدم استحقاق للطرف (days_overdue من اللوحة)
        'aging',
            (SELECT json_build_array(
                json_build_object(
                    'key', 'b0_30',
                    'value', COALESCE(SUM(converted_balance) FILTER (WHERE COALESCE(days_overdue, 0) <= 30), 0)::NUMERIC,
                    'count', COUNT(DISTINCT party_id) FILTER (WHERE COALESCE(days_overdue, 0) <= 30)),
                json_build_object(
                    'key', 'b31_60',
                    'value', COALESCE(SUM(converted_balance) FILTER (WHERE days_overdue > 30 AND days_overdue <= 60), 0)::NUMERIC,
                    'count', COUNT(DISTINCT party_id) FILTER (WHERE days_overdue > 30 AND days_overdue <= 60)),
                json_build_object(
                    'key', 'b61_90',
                    'value', COALESCE(SUM(converted_balance) FILTER (WHERE days_overdue > 60 AND days_overdue <= 90), 0)::NUMERIC,
                    'count', COUNT(DISTINCT party_id) FILTER (WHERE days_overdue > 60 AND days_overdue <= 90)),
                json_build_object(
                    'key', 'b90_plus',
                    'value', COALESCE(SUM(converted_balance) FILTER (WHERE days_overdue > 90), 0)::NUMERIC,
                    'count', COUNT(DISTINCT party_id) FILTER (WHERE days_overdue > 90))
             ) FROM converted_debtors),
        'opening_balances_total',
            COALESCE((SELECT SUM(
                    public.fn_to_base_amount(ob.currency_code, ob.amount, r.rate_to_base)
                    * CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END
                )
                FROM public.party_opening_balances ob
                LEFT JOIN rates r ON r.currency_code = ob.currency_code
                WHERE ob.company_id = p_company_id
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
GRANT  EXECUTE ON FUNCTION public.get_debt_analytics_summary(uuid, uuid) TO authenticated;

COMMIT;




