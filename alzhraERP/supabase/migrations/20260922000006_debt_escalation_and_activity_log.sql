-- ============================================================
-- Migration: 20260922000006_debt_escalation_and_activity_log.sql
-- ============================================================
-- المرحلة 2ا من خارطة التحصيل: خط التصعيد + سجل أنشطة التواصل
--
--   1) debt_followup_config: عتبات خط التصعيد
--      (stage_call_days=30 / stage_visit_days=60 / stage_legal_days=90)
--      — تُحسب المرحلة في اللوحة من أيام التأخير مقابل هذه العتبات.
--   2) get_debt_followup_dashboard: عمود escalation_stage
--      (monitor → reminder → call → visit → legal) + قراءة العتبات من
--      الإعدادات (بلا تغيير في تواقيع الواجهة).
--   3) log_collection_activity: تسجيل نشاط تحصيل (اتصال/زيارة/بريد/ملاحظة)
--      مع النتيجة وإجراء تالٍ مجدول (صفان: منجز + مجدول).
--   4) get_party_collection_timeline: آخر أنشطة الطرف (الخط الزمني).
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) عتبات خط التصعيد في إعدادات المتابعة
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.debt_followup_config
  ADD COLUMN IF NOT EXISTS stage_call_days  integer NOT NULL DEFAULT 30;
ALTER TABLE public.debt_followup_config
  ADD COLUMN IF NOT EXISTS stage_visit_days integer NOT NULL DEFAULT 60;
ALTER TABLE public.debt_followup_config
  ADD COLUMN IF NOT EXISTS stage_legal_days integer NOT NULL DEFAULT 90;

ALTER TABLE public.debt_followup_config
  DROP CONSTRAINT IF EXISTS debt_followup_config_stage_call_days_check;
ALTER TABLE public.debt_followup_config
  ADD CONSTRAINT debt_followup_config_stage_call_days_check
    CHECK (stage_call_days >= 1 AND stage_call_days <= 365);
ALTER TABLE public.debt_followup_config
  DROP CONSTRAINT IF EXISTS debt_followup_config_stage_visit_days_check;
ALTER TABLE public.debt_followup_config
  ADD CONSTRAINT debt_followup_config_stage_visit_days_check
    CHECK (stage_visit_days >= 1 AND stage_visit_days <= 365);
ALTER TABLE public.debt_followup_config
  DROP CONSTRAINT IF EXISTS debt_followup_config_stage_legal_days_check;
ALTER TABLE public.debt_followup_config
  ADD CONSTRAINT debt_followup_config_stage_legal_days_check
    CHECK (stage_legal_days >= 1 AND stage_legal_days <= 365);

-- ─────────────────────────────────────────────────────────────
-- 3) log_collection_activity — تسجيل نشاط تحصيل + إجراء تالٍ
--    الأنواع الصالحة مطابقة لقيد customer_activities_activity_type_check.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_collection_activity(
    p_company_id uuid,
    p_party_id uuid,
    p_activity_type character varying,
    p_subject text,
    p_outcome text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_next_action_date date DEFAULT NULL,
    p_priority character varying DEFAULT 'medium'::character varying
)
 RETURNS TABLE(action_id uuid, next_action_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_action_id UUID;
    v_next_id   UUID;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    IF NOT EXISTS (
        SELECT 1 FROM public.parties p
        WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'INVALID_PARTY';
    END IF;

    IF p_activity_type NOT IN ('call', 'email', 'meeting', 'visit', 'note', 'task') THEN
        RAISE EXCEPTION 'INVALID_ACTIVITY_TYPE';
    END IF;
    IF p_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        RAISE EXCEPTION 'INVALID_PRIORITY';
    END IF;
    IF COALESCE(p_subject, '') = '' THEN
        RAISE EXCEPTION 'SUBJECT_REQUIRED';
    END IF;

    -- صف الإجراء المنجز
    INSERT INTO public.customer_activities (
        company_id, customer_id, activity_type, subject, description,
        outcome, status, priority, completed_at, created_by
    ) VALUES (
        p_company_id, p_party_id, p_activity_type, p_subject, COALESCE(p_notes, ''),
        p_outcome, 'completed', p_priority, NOW(), auth.uid()
    )
    RETURNING id INTO v_action_id;

    -- الإجراء التالي المجدول (اختياري)
    IF p_next_action_date IS NOT NULL THEN
        INSERT INTO public.customer_activities (
            company_id, customer_id, activity_type, subject, description,
            status, priority, scheduled_at, created_by
        ) VALUES (
            p_company_id, p_party_id, 'task', 'إجراء تالٍ: ' || p_subject,
            COALESCE(p_notes, ''), 'pending', p_priority, p_next_action_date::timestamptz, auth.uid()
        )
        RETURNING id INTO v_next_id;
    END IF;

    RETURN QUERY SELECT v_action_id, v_next_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_collection_activity(uuid, uuid, character varying, text, text, text, date, character varying) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.log_collection_activity(uuid, uuid, character varying, text, text, text, date, character varying) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4) get_party_collection_timeline — آخر أنشطة الطرف (خط زمني)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_party_collection_timeline(
    p_company_id uuid,
    p_party_id uuid,
    p_limit integer DEFAULT 20
)
 RETURNS TABLE(id uuid, activity_type character varying, subject text, description text, outcome text, status character varying, priority character varying, scheduled_at timestamp with time zone, completed_at timestamp with time zone, created_at timestamp with time zone, creator_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    RETURN QUERY
    SELECT
        ca.id,
        ca.activity_type::character varying,
        ca.subject,
        ca.description,
        ca.outcome,
        ca.status::character varying,
        ca.priority::character varying,
        ca.scheduled_at,
        ca.completed_at,
        ca.created_at,
        pr.full_name::TEXT AS creator_name
    FROM public.customer_activities ca
    LEFT JOIN public.profiles pr ON pr.id = ca.created_by
    WHERE ca.company_id = p_company_id
      AND ca.customer_id = p_party_id
    ORDER BY COALESCE(ca.completed_at, ca.scheduled_at, ca.created_at) DESC
    LIMIT GREATEST(COALESCE(p_limit, 20), 1);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_party_collection_timeline(uuid, uuid, integer) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_party_collection_timeline(uuid, uuid, integer) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2) get_debt_followup_dashboard + escalation_stage
--    نفس منطق النسخة الحية (عزل الفروع، التصنيف، الترتيب) مع:
--    * عمود escalation_stage: monitor/reminder/call/visit/legal
--    * قراءة عتبات التصعيد من debt_followup_config (والافتراضي 30/60/90)
--      — لا تغيير في التوقيع، فلا أثر على الواجهة القائمة.
--      (تغيير نوع الإرجاع يستلزم DROP ثم CREATE — تحميل واحد فقط بعد 42725.)
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer);

CREATE OR REPLACE FUNCTION public.get_debt_followup_dashboard(
    p_company_id uuid,
    p_due_soon_days integer DEFAULT 7,
    p_critical_days integer DEFAULT 30,
    p_reminder_window_days integer DEFAULT 3,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_limit integer DEFAULT NULL::integer
)
 RETURNS TABLE(party_id uuid, party_name text, party_phone text, category text, credit_limit numeric, currency_code text, outstanding_balance numeric, overdue_amount numeric, oldest_due_date date, next_due_date date, days_overdue integer, classification text, reminder_status text, last_reminded_at timestamp with time zone, last_contact_date timestamp with time zone, has_broken_promise boolean, pending_promise_count bigint, pending_promise_amount numeric, pending_promise_date date, invoice_count bigint, opening_balance numeric, escalation_stage text)
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
    v_stage_call integer;
    v_stage_visit integer;
    v_stage_legal integer;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    -- عتبات خط التصعيد من الإعدادات (والافتراضي 30/60/90)
    SELECT c.stage_call_days, c.stage_visit_days, c.stage_legal_days
      INTO v_stage_call, v_stage_visit, v_stage_legal
      FROM public.debt_followup_config c
     WHERE c.company_id = p_company_id
     LIMIT 1;

    v_stage_call  := COALESCE(v_stage_call, 30);
    v_stage_visit := COALESCE(v_stage_visit, 60);
    v_stage_legal := COALESCE(v_stage_legal, 90);

    v_is_super := public.is_super_admin() OR current_user IN ('postgres', 'supabase_admin');

    SELECT ARRAY_AGG(b) INTO v_allowed_branches
    FROM public.get_auth_branches(p_company_id) AS b;

    IF v_allowed_branches IS NULL OR ARRAY_LENGTH(v_allowed_branches, 1) = 0 THEN
        IF v_is_super THEN
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
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
          AND i.deleted_at IS NULL
          AND i.party_id IS NOT NULL
          AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
          AND (p_branch_id IS NOT NULL OR v_is_super OR v_has_all_branches OR i.branch_id = ANY(v_target_branches))
        GROUP BY i.party_id, i.currency_code
    ),
    opening_balances AS (
        SELECT
            ob.party_id,
            ob.currency_code,
            SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END) AS opening_amount
        FROM public.party_opening_balances ob
        WHERE ob.company_id = p_company_id
          AND (p_branch_id IS NULL OR ob.branch_id = p_branch_id)
          AND (p_branch_id IS NOT NULL OR v_is_super OR v_has_all_branches OR ob.branch_id = ANY(v_target_branches))
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
        WHERE (COALESCE(id.outstanding, 0) + COALESCE(ob.opening_amount, 0)) > 0
    ),
    ranked_candidates AS (
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
            c.invoice_count,
            c.opening_balance
        FROM combined c
        JOIN public.parties p ON p.id = c.party_id AND p.deleted_at IS NULL
          AND (p_branch_id IS NULL OR p.branch_id = p_branch_id OR p.branch_id IS NULL)
        LEFT JOIN public.party_categories pc ON pc.id = p.category_id
        ORDER BY c.overdue_amount DESC NULLS LAST, days_overdue DESC NULLS LAST
        LIMIT p_limit
    )
    SELECT
        rc.party_id,
        rc.party_name,
        rc.party_phone,
        rc.category,
        rc.credit_limit,
        rc.currency_code,
        rc.outstanding_balance,
        rc.overdue_amount,
        rc.oldest_due_date,
        rc.next_due_date,
        rc.days_overdue,
        rc.classification,
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
        rc.invoice_count,
        rc.opening_balance,
        -- خط التصعيد: الإجراء المقترح حسب أيام التأخير (مرحلة = عتبة أولى تجاوزها)
        CASE
            WHEN rc.days_overdue >= v_stage_legal THEN 'legal'
            WHEN rc.days_overdue >= v_stage_visit THEN 'visit'
            WHEN rc.days_overdue >= v_stage_call  THEN 'call'
            WHEN rc.days_overdue >  p_critical_days THEN 'reminder'
            ELSE 'monitor'
        END AS escalation_stage
    FROM ranked_candidates rc
    LEFT JOIN LATERAL (
        SELECT
            BOOL_OR(pp.status = 'broken') AS has_broken_promise,
            COUNT(*) FILTER (WHERE pp.status = 'pending') AS pending_promise_count,
            SUM(pp.amount) FILTER (WHERE pp.status = 'pending') AS pending_promise_amount,
            MIN(pp.promise_date) FILTER (WHERE pp.status = 'pending') AS pending_promise_date
        FROM public.debt_payment_promises pp
        WHERE pp.company_id = p_company_id AND pp.party_id = rc.party_id
    ) ps ON true
    LEFT JOIN LATERAL (
        SELECT ml.created_at AS last_reminded_at
        FROM public.debt_message_log ml
        WHERE ml.company_id = p_company_id AND ml.party_id = rc.party_id AND ml.status = 'sent'
        ORDER BY ml.created_at DESC
        LIMIT 1
    ) lr ON true
    LEFT JOIN LATERAL (
        SELECT ca.created_at AS last_contact_date
        FROM public.customer_activities ca
        WHERE ca.company_id = p_company_id AND ca.customer_id = rc.party_id
        ORDER BY ca.created_at DESC
        LIMIT 1
    ) lc ON true
    ORDER BY rc.overdue_amount DESC NULLS LAST, rc.days_overdue DESC NULLS LAST;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer, uuid, integer) TO authenticated;

COMMIT;




