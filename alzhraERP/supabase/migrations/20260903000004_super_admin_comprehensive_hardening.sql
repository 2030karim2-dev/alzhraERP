-- ==============================================================================
-- Migration: 20260903000004_super_admin_comprehensive_hardening.sql
-- Description: Comprehensive hardening for super admin platform hub:
--   1. Strict tenant suspension enforcement in fn_assert_company_access and get_auth_companies
--   2. Correlated subquery optimization for get_admin_companies_list
--   3. Accurate metrics calculation (real AI cache hit count, security_alerts, and non-overlapping company stats)
--   4. Audit logging (audit_write) for all critical admin mutations
--   5. New RPC admin_assign_company_plan
--   6. Hardened RLS policy for system_platform_configs
-- ==============================================================================

-- 1. إنفاذ تعليق الشركات في حارس الوصول العام
CREATE OR REPLACE FUNCTION public.fn_assert_company_access(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- السوبر أدمن يتجاوز حواجز المستأجر للمعاينة والدعم
  IF public.is_super_admin() THEN
    RETURN;
  END IF;

  -- التحقق من عضوية المستدعي في المنشأة
  IF NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied: لا تملك صلاحية الوصول لبيانات هذه الشركة';
  END IF;

  -- التحقق الصارم من أن المنشأة نشطة وغير معلقة
  IF NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = p_company_id AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'access_denied: هذه المنشأة معلقة حالياً من قبل إدارة المنصة. يرجى التواصل مع إدارة النظام';
  END IF;
END;
$function$;

-- 2. إنفاذ تعليق الشركات في سياسات RLS عبر دالة get_auth_companies
CREATE OR REPLACE FUNCTION public.get_auth_companies()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ucr.company_id
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id
  WHERE ucr.user_id = auth.uid()
    AND (c.is_active = true OR public.is_super_admin());
$function$;

-- 3. تصحيح احتساب مؤشرات المنصة الشاملة
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

    -- إحصائيات الشركات بدون ازدواجية وبشكل مانع للتداخل
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE subscription_status = 'active' AND is_active = true),
        COUNT(*) FILTER (WHERE subscription_status = 'trial' AND is_active = true),
        COUNT(*) FILTER (WHERE is_active = false OR subscription_status = 'suspended')
    INTO 
        v_total_companies,
        v_active_companies,
        v_trial_companies,
        v_suspended_companies
    FROM public.companies;

    -- إجمالي المستخدمين
    SELECT COUNT(*) INTO v_total_users FROM auth.users;

    -- إجمالي الفواتير
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))
    INTO 
        v_total_invoices,
        v_today_invoices
    FROM public.invoices;

    -- استهلاك الذكاء الاصطناعي (البحث في جداول الطلبات الفعلية)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_request_log') THEN
        SELECT COUNT(*) INTO v_total_ai_requests FROM public.ai_request_log;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage_logs') THEN
        SELECT COUNT(*) INTO v_total_ai_requests FROM public.ai_usage_logs;
    END IF;

    -- كاش الذكاء الاصطناعي (حساب مجموع hit_count الفعلي)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_part_lookup_cache') THEN
        SELECT COALESCE(SUM(hit_count), 0) INTO v_ai_cache_hits FROM public.ai_part_lookup_cache;
    END IF;

    -- مراقبة الأمان وسجلات الفخاخ من جدول security_alerts الحقيقي
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

-- 4. تحسين أداء استعلام استعراض الشركات وإضافة البحث بالاسم الإنجليزي والهاتف
CREATE OR REPLACE FUNCTION public.get_admin_companies_list(
    p_search text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    name_ar text,
    name_en text,
    tax_number text,
    base_currency text,
    owner_id uuid,
    owner_email text,
    phone text,
    is_active boolean,
    subscription_status text,
    trial_ends_at timestamptz,
    plan_id uuid,
    plan_name text,
    user_count bigint,
    branch_count bigint,
    invoice_count bigint,
    created_at timestamptz
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
    WITH filtered_companies AS (
        SELECT 
            c.id,
            c.name_ar,
            c.name_en,
            c.tax_number,
            c.base_currency,
            c.owner_id,
            c.phone,
            c.is_active,
            c.subscription_status,
            c.trial_ends_at,
            c.plan_id,
            c.created_at
        FROM public.companies c
        LEFT JOIN auth.users u ON c.owner_id = u.id
        WHERE 
            (p_search IS NULL 
             OR c.name_ar ILIKE '%' || p_search || '%' 
             OR c.name_en ILIKE '%' || p_search || '%'
             OR c.tax_number ILIKE '%' || p_search || '%' 
             OR c.phone ILIKE '%' || p_search || '%'
             OR u.email ILIKE '%' || p_search || '%')
            AND (p_status IS NULL OR c.subscription_status = p_status)
        ORDER BY c.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        fc.id,
        fc.name_ar,
        fc.name_en,
        fc.tax_number,
        fc.base_currency,
        fc.owner_id,
        u.email::text AS owner_email,
        fc.phone,
        fc.is_active,
        fc.subscription_status,
        fc.trial_ends_at,
        fc.plan_id,
        sp.name_ar AS plan_name,
        (SELECT COUNT(DISTINCT ucr.user_id) FROM public.user_company_roles ucr WHERE ucr.company_id = fc.id) AS user_count,
        (SELECT COUNT(b.id) FROM public.branches b WHERE b.company_id = fc.id) AS branch_count,
        (SELECT COUNT(inv.id) FROM public.invoices inv WHERE inv.company_id = fc.id) AS invoice_count,
        fc.created_at
    FROM filtered_companies fc
    LEFT JOIN auth.users u ON fc.owner_id = u.id
    LEFT JOIN public.subscription_plans sp ON fc.plan_id = sp.id
    ORDER BY fc.created_at DESC;
END;
$$;

-- 5. تحصين دالة toggle_company_status وتوثيق التدقيق
CREATE OR REPLACE FUNCTION public.toggle_company_status(
    p_company_id uuid,
    p_is_active boolean,
    p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_prev_status text;
    v_prev_active boolean;
    v_new_status text;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    SELECT subscription_status, is_active 
    INTO v_prev_status, v_prev_active
    FROM public.companies 
    WHERE id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة', p_company_id;
    END IF;

    v_new_status := COALESCE(p_status, CASE WHEN p_is_active THEN 'active' ELSE 'suspended' END);

    UPDATE public.companies
    SET 
        is_active = p_is_active,
        subscription_status = v_new_status,
        updated_at = now()
    WHERE id = p_company_id;

    -- توثيق التدقيق
    PERFORM public.audit_write(
        'TOGGLE_COMPANY_STATUS',
        'companies',
        p_company_id,
        p_company_id,
        jsonb_build_object(
            'prev_active', v_prev_active,
            'new_active', p_is_active,
            'prev_status', v_prev_status,
            'new_status', v_new_status,
            'actor', auth.uid()
        )
    );

    RETURN true;
END;
$$;

-- 6. تحصين دالة extend_company_trial وتوثيق التدقيق
CREATE OR REPLACE FUNCTION public.extend_company_trial(
    p_company_id uuid,
    p_days integer
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_new_expiry timestamptz;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    IF p_days IS NULL OR p_days <= 0 THEN
        RAISE EXCEPTION 'عدد الأيام للتمديد يجب أن يكون أكبر من صفر';
    END IF;

    UPDATE public.companies
    SET 
        trial_ends_at = GREATEST(COALESCE(trial_ends_at, now()), now()) + make_interval(days => p_days),
        subscription_status = 'trial',
        is_active = true,
        updated_at = now()
    WHERE id = p_company_id
    RETURNING trial_ends_at INTO v_new_expiry;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة أو لا يمكن تمديد فترتها التجريبية', p_company_id;
    END IF;

    -- توثيق التدقيق
    PERFORM public.audit_write(
        'EXTEND_COMPANY_TRIAL',
        'companies',
        p_company_id,
        p_company_id,
        jsonb_build_object(
            'days_added', p_days, 
            'new_expiry', v_new_expiry, 
            'actor', auth.uid()
        )
    );

    RETURN v_new_expiry;
END;
$$;

-- 7. إضافة دالة تعيين باقة اشتراك للمنشأة (admin_assign_company_plan)
CREATE OR REPLACE FUNCTION public.admin_assign_company_plan(
    p_company_id uuid,
    p_plan_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_plan_name text := NULL;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    IF p_plan_id IS NOT NULL THEN
        SELECT name_ar INTO v_plan_name FROM public.subscription_plans WHERE id = p_plan_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'باقة الاشتراك المحددة غير موجودة';
        END IF;
    END IF;

    UPDATE public.companies
    SET 
        plan_id = p_plan_id,
        updated_at = now()
    WHERE id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة', p_company_id;
    END IF;

    PERFORM public.audit_write(
        'ASSIGN_COMPANY_PLAN',
        'companies',
        p_company_id,
        p_company_id,
        jsonb_build_object(
            'new_plan_id', p_plan_id, 
            'plan_name', v_plan_name, 
            'actor', auth.uid()
        )
    );

    RETURN true;
END;
$$;

-- 8. تحصين دالة toggle_super_admin وتوثيق التدقيق
CREATE OR REPLACE FUNCTION public.toggle_super_admin(
    p_target_user_id uuid,
    p_make_super_admin boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    -- منع المستخدم من إزالة نفسه من السوبر أدمن تفادياً لإغلاق النظام
    IF p_target_user_id = auth.uid() AND NOT p_make_super_admin THEN
        RAISE EXCEPTION 'لا يمكنك سحب صلاحية السوبر أدمن عن حسابك الخاص لتجنب إقفال النظام';
    END IF;

    -- فحص وجود المستخدم
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
        RAISE EXCEPTION 'المستخدم بالمعرف % غير مسجل بالنظام', p_target_user_id;
    END IF;

    IF p_make_super_admin THEN
        INSERT INTO public.super_admins (user_id)
        VALUES (p_target_user_id)
        ON CONFLICT DO NOTHING;
    ELSE
        DELETE FROM public.super_admins
        WHERE user_id = p_target_user_id;
    END IF;

    PERFORM public.audit_write(
        CASE WHEN p_make_super_admin THEN 'PROMOTE_SUPER_ADMIN' ELSE 'REVOKE_SUPER_ADMIN' END,
        'super_admins',
        p_target_user_id,
        NULL,
        jsonb_build_object(
            'target_user_id', p_target_user_id, 
            'made_super_admin', p_make_super_admin, 
            'actor', auth.uid()
        )
    );

    RETURN true;
END;
$$;

-- 9. تحصين سياسة RLS لجدول إعدادات المنصة
DROP POLICY IF EXISTS "system_configs_select_public" ON public.system_platform_configs;
CREATE POLICY "system_configs_select_public" 
    ON public.system_platform_configs 
    FOR SELECT 
    TO public 
    USING (
        key IN ('maintenance_mode', 'feature_flags')
        OR public.is_super_admin()
    );

-- 10. منح الصلاحيات للدوال الجديدة
GRANT EXECUTE ON FUNCTION public.admin_assign_company_plan(uuid, uuid) TO authenticated, service_role;
