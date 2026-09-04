-- ==============================================================================
-- Migration: 20260904000002_super_admin_comprehensive_fixes.sql
-- Description: Comprehensive fixes for Super Admin platform hub:
--   1. Trigger on super_admins to prevent self-deletion or deleting the last super admin
--   2. RPC admin_update_system_config with audit logging and updated_by attribution
--   3. RPC admin_resolve_security_alert with audit logging
--   4. Enhanced extend_company_trial returning JSON with both new expiry and status
--   5. Accurate system metrics (including past_due and cancelled companies + Asia/Riyadh timezone)
--   6. High-performance CTE pagination for get_admin_users_list
-- ==============================================================================

-- 1. منع حذف النفس أو حذف آخر سوبر أدمن في المنصة عبر Trigger ذري
CREATE OR REPLACE FUNCTION public.fn_guard_super_admin_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_remaining_count bigint;
BEGIN
    -- منع حذف الحساب الحالي للنفس لتجنب القفل
    IF OLD.user_id = auth.uid() THEN
        RAISE EXCEPTION 'access_denied: لا يمكنك إزالة صلاحية السوبر أدمن عن حسابك الخاص لتجنب إقفال النظام';
    END IF;

    -- منع حذف آخر سوبر أدمن في المنصة
    SELECT COUNT(*) INTO v_remaining_count FROM public.super_admins WHERE user_id <> OLD.user_id;
    IF v_remaining_count = 0 THEN
        RAISE EXCEPTION 'integrity_error: لا يمكن إزالة هذا الحساب لأنه السوبر أدمن الأخير المتبقي في المنصة';
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_super_admin_delete ON public.super_admins;
CREATE TRIGGER trg_guard_super_admin_delete
BEFORE DELETE ON public.super_admins
FOR EACH ROW
EXECUTE FUNCTION public.fn_guard_super_admin_delete();

-- 2. دالة تحديث إعدادات المنصة الموثقة أمنياً (admin_update_system_config)
CREATE OR REPLACE FUNCTION public.admin_update_system_config(
    p_key text,
    p_value jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_prev_value jsonb := NULL;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    IF p_key IS NULL OR trim(p_key) = '' THEN
        RAISE EXCEPTION 'مفتاح الإعداد لا يمكن أن يكون فارغاً';
    END IF;

    SELECT value INTO v_prev_value
    FROM public.system_platform_configs
    WHERE key = p_key;

    INSERT INTO public.system_platform_configs (key, value, updated_at, updated_by)
    VALUES (p_key, p_value, now(), auth.uid())
    ON CONFLICT (key) DO UPDATE
    SET 
        value = EXCLUDED.value,
        updated_at = now(),
        updated_by = auth.uid();

    -- توثيق أمني في سجلات التدقيق
    PERFORM public.audit_write(
        'UPDATE_SYSTEM_CONFIG',
        'system_platform_configs',
        NULL,
        NULL,
        jsonb_build_object(
            'config_key', p_key,
            'prev_value', v_prev_value,
            'new_value', p_value,
            'actor', auth.uid()
        )
    );

    RETURN true;
END;
$$;

-- 3. دالة معالجة التنبيهات الأمنية (admin_resolve_security_alert)
CREATE OR REPLACE FUNCTION public.admin_resolve_security_alert(
    p_alert_id bigint,
    p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_alert_type text;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    SELECT alert_type INTO v_alert_type
    FROM public.security_alerts
    WHERE id = p_alert_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'التنبيه الأمني بالمعرف % غير موجود', p_alert_id;
    END IF;

    UPDATE public.security_alerts
    SET 
        resolved_at = now(),
        resolved_by = auth.uid(),
        resolution_notes = p_notes
    WHERE id = p_alert_id;

    -- توثيق المعالجة
    PERFORM public.audit_write(
        'RESOLVE_SECURITY_ALERT',
        'security_alerts',
        NULL,
        NULL,
        jsonb_build_object(
            'alert_id', p_alert_id,
            'alert_type', v_alert_type,
            'notes', p_notes,
            'resolved_by', auth.uid()
        )
    );

    RETURN true;
END;
$$;

-- 4. تحسين دالة تمديد التجربة لترجع التاريخ والحالة الجديدة معاً (extend_company_trial)
-- ملاحظة حرجة: PostgreSQL يمنع تغيير نوع الإرجاع عبر CREATE OR REPLACE
-- ("cannot change return type of existing function")، والدالة في الترحيلات
-- السابقة (20260903000002/3/4 و 20260904000001) تعيد timestamptz بينما هذه
-- النسخة تعيد jsonb — لذا يجب DROP أولاً وإلا فشلت سلسلة الترحيلات كاملة.
DROP FUNCTION IF EXISTS public.extend_company_trial(uuid, integer);
CREATE OR REPLACE FUNCTION public.extend_company_trial(
    p_company_id uuid,
    p_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_new_expiry timestamptz;
    v_status text;
    v_plan_id uuid;
    v_final_status text;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    IF p_days IS NULL OR p_days <= 0 THEN
        RAISE EXCEPTION 'عدد الأيام للتمديد يجب أن يكون أكبر من صفر';
    END IF;

    SELECT subscription_status, plan_id
      INTO v_status, v_plan_id
      FROM public.companies
     WHERE id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة أو لا يمكن تمديد فترتها التجريبية', p_company_id;
    END IF;

    v_final_status := CASE
        WHEN v_status = 'active' AND v_plan_id IS NOT NULL THEN 'active'
        ELSE 'trial'
    END;

    UPDATE public.companies
       SET trial_ends_at = GREATEST(COALESCE(trial_ends_at, now()), now()) + make_interval(days => p_days),
           subscription_status = v_final_status,
           is_active = true,
           updated_at = now()
     WHERE id = p_company_id
     RETURNING trial_ends_at INTO v_new_expiry;

    PERFORM public.audit_write(
        'EXTEND_COMPANY_TRIAL',
        'companies',
        p_company_id,
        p_company_id,
        jsonb_build_object(
            'days_added', p_days,
            'previous_status', v_status,
            'new_expiry', v_new_expiry,
            'new_status', v_final_status,
            'actor', auth.uid()
        )
    );

    RETURN jsonb_build_object(
        'trial_ends_at', v_new_expiry,
        'subscription_status', v_final_status
    );
END;
$$;

-- 5. احتساب إحصائيات المنصة بدقة ومنع تسرب الحالات واحتساب اليوم بتوقيت السعودية
CREATE OR REPLACE FUNCTION public.get_platform_system_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_total_companies bigint := 0;
    v_active_companies bigint := 0;
    v_trial_companies bigint := 0;
    v_suspended_companies bigint := 0;
    v_past_due_companies bigint := 0;
    v_cancelled_companies bigint := 0;
    v_total_users bigint := 0;
    v_total_invoices bigint := 0;
    v_today_invoices bigint := 0;
    v_total_ai_requests bigint := 0;
    v_ai_cache_hits bigint := 0;
    v_honeypot_alerts bigint := 0;
    v_csp_reports bigint := 0;
    v_result jsonb;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    -- إحصائيات دقيقة لجميع حالات الشركات دون استثناء أو ازدواجية
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE subscription_status = 'active' AND is_active = true),
        COUNT(*) FILTER (WHERE subscription_status = 'trial' AND is_active = true),
        COUNT(*) FILTER (WHERE is_active = false OR subscription_status = 'suspended'),
        COUNT(*) FILTER (WHERE subscription_status = 'past_due' AND is_active = true),
        COUNT(*) FILTER (WHERE subscription_status = 'cancelled' AND is_active = true)
    INTO 
        v_total_companies,
        v_active_companies,
        v_trial_companies,
        v_suspended_companies,
        v_past_due_companies,
        v_cancelled_companies
    FROM public.companies;

    -- إجمالي المستخدمين
    SELECT COUNT(*) INTO v_total_users FROM auth.users;

    -- إجمالي الفواتير واحتساب فواتير اليوم بتوقيت الرياض (UTC+3)
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', timezone('Asia/Riyadh', now())))
    INTO 
        v_total_invoices,
        v_today_invoices
    FROM public.invoices;

    -- استهلاك الذكاء الاصطناعي
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_request_log') THEN
        SELECT COUNT(*) INTO v_total_ai_requests FROM public.ai_request_log;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage_logs') THEN
        SELECT COUNT(*) INTO v_total_ai_requests FROM public.ai_usage_logs;
    END IF;

    -- كاش الذكاء الاصطناعي
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_part_lookup_cache') THEN
        SELECT COALESCE(SUM(hit_count), 0) INTO v_ai_cache_hits FROM public.ai_part_lookup_cache;
    END IF;

    -- مراقبة الأمان وسجلات الفخاخ النشطة غير المحلولة
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_alerts') THEN
        SELECT COUNT(*) INTO v_honeypot_alerts FROM public.security_alerts WHERE resolved_at IS NULL;
    END IF;

    -- تقارير الـ CSP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'csp_reports') THEN
        SELECT COUNT(*) INTO v_csp_reports FROM public.csp_reports;
    END IF;

    v_result := jsonb_build_object(
        'total_companies', v_total_companies,
        'active_companies', v_active_companies,
        'trial_companies', v_trial_companies,
        'suspended_companies', v_suspended_companies,
        'past_due_companies', v_past_due_companies,
        'cancelled_companies', v_cancelled_companies,
        'total_users', v_total_users,
        'total_invoices', v_total_invoices,
        'today_invoices', v_today_invoices,
        'total_ai_requests', v_total_ai_requests,
        'ai_cache_hits', v_ai_cache_hits,
        'honeypot_alerts', v_honeypot_alerts,
        'csp_reports', v_csp_reports,
        'fetched_at', now()
    );

    RETURN v_result;
END;
$$;

-- 6. تحسين أداء استعلام المستخدمين عبر CTE
CREATE OR REPLACE FUNCTION public.get_admin_users_list(
    p_search text DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    user_id uuid,
    email text,
    created_at timestamptz,
    is_super_admin boolean,
    companies_count bigint,
    company_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    RETURN QUERY
    WITH paginated_users AS (
        SELECT u.id, u.email::text, u.created_at
        FROM auth.users u
        WHERE (p_search IS NULL OR u.email ILIKE '%' || p_search || '%')
        ORDER BY u.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        pu.id AS user_id,
        pu.email,
        pu.created_at,
        EXISTS(SELECT 1 FROM public.super_admins sa WHERE sa.user_id = pu.id) AS is_super_admin,
        COUNT(DISTINCT ucr.company_id) AS companies_count,
        ARRAY_AGG(DISTINCT c.name_ar) FILTER (WHERE c.name_ar IS NOT NULL) AS company_names
    FROM paginated_users pu
    LEFT JOIN public.user_company_roles ucr ON pu.id = ucr.user_id
    LEFT JOIN public.companies c ON ucr.company_id = c.id
    GROUP BY pu.id, pu.email, pu.created_at
    ORDER BY pu.created_at DESC;
END;
$$;

-- 7. منح الصلاحيات للأدوار
GRANT EXECUTE ON FUNCTION public.admin_update_system_config(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_security_alert(bigint, text) TO authenticated, service_role;
