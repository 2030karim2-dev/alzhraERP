-- ==============================================================================
-- Migration: 20260904000008_security_logs_pagination.sql
-- Description:
--   بديل القراءة المباشرة من جدولي security_alerts / csp_reports في واجهة
--   السوبر أدمن، مع ترقيم صفحات وفلترة حالة المعالجة على الخادم:
--     • get_security_alerts_page(p_limit, p_offset, p_resolved) + count
--     • get_csp_reports_page(p_limit, p_offset)                + count
--   الحد الأقصى للصفحة 200 (يمنع استنزاف الموارد)، ونفس النمط الأمني المعتمد:
--   SECURITY DEFINER + is_super_admin() داخلياً + REVOKE من PUBLIC/anon.
-- ==============================================================================

-- 1) صفحات تنبيهات الأمان
CREATE OR REPLACE FUNCTION public.get_security_alerts_page(
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0,
    p_resolved boolean DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    detected_at timestamptz,
    alert_type text,
    severity text,
    user_id uuid,
    company_id uuid,
    source_ip text,
    user_agent text,
    details jsonb,
    resolved_at timestamptz,
    resolved_by uuid,
    resolution_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_limit int := GREATEST(LEAST(COALESCE(p_limit, 50), 200), 1);
    v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    RETURN QUERY
    SELECT sa.id,
           sa.detected_at,
           sa.alert_type,
           sa.severity,
           sa.user_id,
           sa.company_id,
           sa.source_ip,
           sa.user_agent,
           sa.details,
           sa.resolved_at,
           sa.resolved_by,
           sa.resolution_notes
      FROM public.security_alerts sa
     WHERE (
            p_resolved IS NULL
            OR (p_resolved = true AND sa.resolved_at IS NOT NULL)
            OR (p_resolved = false AND sa.resolved_at IS NULL)
           )
     ORDER BY sa.detected_at DESC, sa.id DESC
     LIMIT v_limit OFFSET v_offset;
END;
$$;

-- 2) عدد تنبيهات الأمان المطابقة (لترقيم الصفحات بدقة)
CREATE OR REPLACE FUNCTION public.get_security_alerts_count(
    p_resolved boolean DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_count bigint;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    SELECT COUNT(*)
      INTO v_count
      FROM public.security_alerts sa
     WHERE (
            p_resolved IS NULL
            OR (p_resolved = true AND sa.resolved_at IS NOT NULL)
            OR (p_resolved = false AND sa.resolved_at IS NULL)
           );

    RETURN v_count;
END;
$$;

-- 3) صفحات تقارير CSP
CREATE OR REPLACE FUNCTION public.get_csp_reports_page(
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id bigint,
    received_at timestamptz,
    document_uri text,
    blocked_uri text,
    violated_directive text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_limit int := GREATEST(LEAST(COALESCE(p_limit, 50), 200), 1);
    v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    RETURN QUERY
    SELECT cr.id,
           cr.received_at,
           cr.document_uri,
           cr.blocked_uri,
           cr.violated_directive
      FROM public.csp_reports cr
     ORDER BY cr.received_at DESC, cr.id DESC
     LIMIT v_limit OFFSET v_offset;
END;
$$;

-- 4) عدد تقارير CSP
CREATE OR REPLACE FUNCTION public.get_csp_reports_count()
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_count bigint;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.csp_reports;
    RETURN v_count;
END;
$$;

-- 5) الصلاحيات — نفس نمط 20260904000003/20260904000005
REVOKE EXECUTE ON FUNCTION public.get_security_alerts_page(int, int, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_security_alerts_count(boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_csp_reports_page(int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_csp_reports_count() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_security_alerts_page(int, int, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_security_alerts_count(boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_csp_reports_page(int, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_csp_reports_count() TO authenticated, service_role;
