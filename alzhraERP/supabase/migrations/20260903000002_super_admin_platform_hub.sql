-- ==============================================================================
-- Migration: 20260903000002_super_admin_platform_hub.sql
-- Description: Platform management functions, system metrics, configs and super admin tooling
-- ==============================================================================

-- 1. جدول إعدادات المنصة ومفاتيح الميزات (System Platform Configs)
CREATE TABLE IF NOT EXISTS public.system_platform_configs (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.system_platform_configs ENABLE ROW LEVEL SECURITY;

-- قراءة الإعدادات متاحة للجميع (لتفقد وضع الصيانة قبل/أثناء الجلسة)
DROP POLICY IF EXISTS "system_configs_select_public" ON public.system_platform_configs;
CREATE POLICY "system_configs_select_public" 
    ON public.system_platform_configs 
    FOR SELECT 
    TO public 
    USING (true);

-- التعديل والحذف والإضافة محصور حصراً بالسوبر أدمن
DROP POLICY IF EXISTS "system_configs_write_super_admin" ON public.system_platform_configs;
CREATE POLICY "system_configs_write_super_admin" 
    ON public.system_platform_configs 
    FOR ALL 
    TO authenticated 
    USING (public.is_super_admin()) 
    WITH CHECK (public.is_super_admin());

-- تهيئة الإعدادات الافتراضية
INSERT INTO public.system_platform_configs (key, value)
VALUES 
    ('maintenance_mode', '{"enabled": false, "message": "النظام يخضع حالياً لأعمال صيانة مجدولة لتحسين الخدمات. سنعود قريباً.", "estimated_end": null}'::jsonb),
    ('feature_flags', '{"ai_assistance": true, "vin_intelligence": true, "supplier_portal": true, "internal_chat": true, "offline_sync": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. دالة إحصائيات النظام الشاملة (System Telemetry & Metrics)
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
    -- التحقق الأمني الصارم
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    -- إحصائيات الشركات
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_active = true),
        COUNT(*) FILTER (WHERE subscription_status = 'trial'),
        COUNT(*) FILTER (WHERE subscription_status = 'suspended' OR is_active = false)
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

    -- استهلاك الذكاء الاصطناعي إن وُجد الجدول
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_usage_logs') THEN
        SELECT COUNT(*) INTO v_total_ai_requests FROM public.ai_usage_logs;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_part_lookup_cache') THEN
        SELECT COUNT(*) INTO v_ai_cache_hits FROM public.ai_part_lookup_cache;
    END IF;

    -- مراقبة الأمان والـ Honeypot
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_honeypot_logs') THEN
        SELECT COUNT(*) INTO v_honeypot_alerts FROM public.security_honeypot_logs;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'csp_reports') THEN
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

-- 3. دالة استعراض الشركات وإدارتها للسوبر أدمن
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
    SELECT 
        c.id,
        c.name_ar,
        c.name_en,
        c.tax_number,
        c.base_currency,
        c.owner_id,
        u.email::text AS owner_email,
        c.phone,
        c.is_active,
        c.subscription_status,
        c.trial_ends_at,
        c.plan_id,
        sp.name_ar AS plan_name,
        COALESCE(ucr.users_cnt, 0) AS user_count,
        COALESCE(br.branches_cnt, 0) AS branch_count,
        COALESCE(inv.invoices_cnt, 0) AS invoice_count,
        c.created_at
    FROM public.companies c
    LEFT JOIN auth.users u ON c.owner_id = u.id
    LEFT JOIN public.subscription_plans sp ON c.plan_id = sp.id
    LEFT JOIN (
        SELECT company_id, COUNT(DISTINCT user_id) AS users_cnt 
        FROM public.user_company_roles 
        GROUP BY company_id
    ) ucr ON c.id = ucr.company_id
    LEFT JOIN (
        SELECT company_id, COUNT(b.id) AS branches_cnt 
        FROM public.branches b
        GROUP BY company_id
    ) br ON c.id = br.company_id
    LEFT JOIN (
        SELECT company_id, COUNT(i.id) AS invoices_cnt 
        FROM public.invoices i
        GROUP BY company_id
    ) inv ON c.id = inv.company_id
    WHERE 
        (p_search IS NULL OR c.name_ar ILIKE '%' || p_search || '%' OR c.tax_number ILIKE '%' || p_search || '%' OR u.email ILIKE '%' || p_search || '%')
        AND (p_status IS NULL OR c.subscription_status = p_status)
    ORDER BY c.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 4. دالة تفعيل أو تعليق شركة
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
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    UPDATE public.companies
    SET 
        is_active = p_is_active,
        subscription_status = COALESCE(p_status, subscription_status),
        updated_at = now()
    WHERE id = p_company_id;

    RETURN true;
END;
$$;

-- 5. دالة تمديد فترة التجربة
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

    UPDATE public.companies
    SET 
        trial_ends_at = GREATEST(COALESCE(trial_ends_at, now()), now()) + (p_days || ' days')::interval,
        subscription_status = 'trial',
        is_active = true,
        updated_at = now()
    WHERE id = p_company_id
    RETURNING trial_ends_at INTO v_new_expiry;

    RETURN v_new_expiry;
END;
$$;

-- 6. دالة استعراض المستخدمين عالمياً
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
    SELECT 
        u.id AS user_id,
        u.email::text,
        u.created_at,
        EXISTS(SELECT 1 FROM public.super_admins sa WHERE sa.user_id = u.id) AS is_super_admin,
        COUNT(DISTINCT ucr.company_id) AS companies_count,
        ARRAY_AGG(DISTINCT c.name_ar) FILTER (WHERE c.name_ar IS NOT NULL) AS company_names
    FROM auth.users u
    LEFT JOIN public.user_company_roles ucr ON u.id = ucr.user_id
    LEFT JOIN public.companies c ON ucr.company_id = c.id
    WHERE 
        (p_search IS NULL OR u.email ILIKE '%' || p_search || '%')
    GROUP BY u.id, u.email, u.created_at
    ORDER BY u.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 7. دالة تعيين أو سحب صلاحية السوبر أدمن
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

    IF p_make_super_admin THEN
        INSERT INTO public.super_admins (user_id)
        VALUES (p_target_user_id)
        ON CONFLICT DO NOTHING;
    ELSE
        DELETE FROM public.super_admins
        WHERE user_id = p_target_user_id;
    END IF;

    RETURN true;
END;
$$;

-- 8. منح الصلاحيات للأدوار
GRANT EXECUTE ON FUNCTION public.get_platform_system_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_companies_list(text, text, int, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_company_status(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extend_company_trial(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_users_list(text, int, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_super_admin(uuid, boolean) TO authenticated, service_role;

-- 9. بذر السوبر أدمن الأساسي من مستخدمي النظام المعتمدين
INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users 
WHERE email IN ('2030.karim2@gmail.com', 'seen.soq@gmail.com')
ON CONFLICT DO NOTHING;
