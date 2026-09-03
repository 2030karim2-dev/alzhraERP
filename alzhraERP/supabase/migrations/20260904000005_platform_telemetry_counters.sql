-- ==============================================================================
-- Migration: 20260904000005_platform_telemetry_counters.sql
-- Description:
--   1. get_platform_service_telemetry() — lightweight real counters (chat
--      messages, saved VIN analyses, supplier price rows) aggregated with
--      SECURITY DEFINER so the Super Admin Telemetry tab shows real numbers
--      instead of hard-coded text.
--   2. get_admin_companies_count() / get_admin_users_count() — total count
--      helpers (same filters as the paginated list RPCs) so the admin tables
--      can show exact totals and correct last-page state.
-- All functions follow the project security posture:
--   REVOKE from PUBLIC/anon, GRANT to authenticated + service_role.
-- ==============================================================================

-- 1) Service telemetry counters (verified tables only, guarded by existence)
CREATE OR REPLACE FUNCTION public.get_platform_service_telemetry()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_chat_messages bigint := 0;
    v_vin_analyses bigint := 0;
    v_supplier_price_rows bigint := 0;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
        SELECT COUNT(*) INTO v_chat_messages FROM public.chat_messages;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vin_analyses') THEN
        SELECT COUNT(*) INTO v_vin_analyses FROM public.vin_analyses;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_price_history') THEN
        SELECT COUNT(*) INTO v_supplier_price_rows FROM public.supplier_price_history;
    END IF;

    RETURN jsonb_build_object(
        'total_chat_messages', v_chat_messages,
        'total_vin_analyses', v_vin_analyses,
        'total_supplier_price_rows', v_supplier_price_rows
    );
END;
$$;

-- 2) Company count with the exact filters of get_admin_companies_list
CREATE OR REPLACE FUNCTION public.get_admin_companies_count(
    p_search text DEFAULT NULL,
    p_status text DEFAULT NULL
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
      FROM public.companies c
      LEFT JOIN auth.users u ON c.owner_id = u.id
     WHERE (p_search IS NULL
            OR c.name_ar ILIKE '%' || p_search || '%'
            OR c.name_en ILIKE '%' || p_search || '%'
            OR c.tax_number ILIKE '%' || p_search || '%'
            OR c.phone ILIKE '%' || p_search || '%'
            OR u.email ILIKE '%' || p_search || '%')
       AND (p_status IS NULL OR c.subscription_status = p_status);

    RETURN v_count;
END;
$$;

-- 3) User count with the exact filter of get_admin_users_list
CREATE OR REPLACE FUNCTION public.get_admin_users_count(
    p_search text DEFAULT NULL
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
      FROM auth.users u
     WHERE (p_search IS NULL OR u.email ILIKE '%' || p_search || '%');

    RETURN v_count;
END;
$$;

-- 4) Privileges
REVOKE EXECUTE ON FUNCTION public.get_platform_service_telemetry() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_companies_count(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_users_count(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_platform_service_telemetry() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_companies_count(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_users_count(text) TO authenticated, service_role;

-- 5) Resolve-alert audit attribution: link the audit row to the alert's company
--    (previously audit_write was called with a NULL company id even when the
--    alert belonged to a specific tenant).
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
    v_company_id uuid;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    SELECT alert_type, company_id
      INTO v_alert_type, v_company_id
      FROM public.security_alerts
     WHERE id = p_alert_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'التنبيه الأمني بالمعرف % غير موجود', p_alert_id;
    END IF;

    UPDATE public.security_alerts
       SET resolved_at = now(),
           resolved_by = auth.uid(),
           resolution_notes = p_notes
     WHERE id = p_alert_id;

    PERFORM public.audit_write(
        'RESOLVE_SECURITY_ALERT',
        'security_alerts',
        NULL,
        v_company_id,
        jsonb_build_object(
            'alert_id', p_alert_id,
            'alert_type', v_alert_type,
            'company_id', v_company_id,
            'notes', p_notes,
            'resolved_by', auth.uid()
        )
    );

    RETURN true;
END;
$$;
