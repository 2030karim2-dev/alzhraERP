-- ==============================================================================
-- Migration: 20260904000003_super_admin_revoke_and_fixes.sql
-- Description:
--   1. REVOKE EXECUTE on every Super Admin RPC from PUBLIC/anon. Postgres grants
--      EXECUTE to PUBLIC by default on newly created functions, and the Super
--      Admin migrations (20260903000002..20260904000002) only GRANTed to
--      authenticated/service_role without REVOKE. This aligns them with the
--      project security sweep pattern (20260826000000..04).
--   2. Fix the Asia/Riyadh "today invoices" window inside
--      get_platform_system_metrics: date_trunc('day', timezone('Asia/Riyadh',
--      now())) produces a naive `timestamp` that Postgres compares to
--      `created_at` (timestamptz) using the SESSION TimeZone (usually UTC on
--      Supabase), shifting the daily window by +3 hours. The boundary is now
--      converted back to timestamptz explicitly via `AT TIME ZONE`.
-- ==============================================================================

-- 1) Restrict execution of the Super Admin RPCs to authenticated + service_role
REVOKE EXECUTE ON FUNCTION public.get_platform_system_metrics() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_companies_list(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_company_status(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.extend_company_trial(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_users_list(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_super_admin(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_assign_company_plan(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_system_config(text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_security_alert(bigint, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_platform_system_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_companies_list(text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_company_status(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extend_company_trial(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_users_list(text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_super_admin(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_company_plan(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_system_config(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_security_alert(bigint, text) TO authenticated, service_role;

-- NOTE: public.is_super_admin() is intentionally left executable for PUBLIC/anon
-- because RLS policies across the schema evaluate it for every role.

-- 2) Fix today_invoices timezone window + keep metric keys identical
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
    v_riyadh_day_start timestamptz;
    v_result jsonb;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    -- Riyadh (UTC+3) midnight as a real timestamptz boundary.
    v_riyadh_day_start :=
        date_trunc('day', now() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh';

    -- Company stats (mutually exclusive partitions, same as 20260904000002)
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

    SELECT COUNT(*) INTO v_total_users FROM auth.users;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE created_at >= v_riyadh_day_start)
    INTO
        v_total_invoices,
        v_today_invoices
    FROM public.invoices;

    -- AI consumption
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_request_log') THEN
        SELECT COUNT(*) INTO v_total_ai_requests FROM public.ai_request_log;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage_logs') THEN
        SELECT COUNT(*) INTO v_total_ai_requests FROM public.ai_usage_logs;
    END IF;

    -- AI cache savings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_part_lookup_cache') THEN
        SELECT COALESCE(SUM(hit_count), 0) INTO v_ai_cache_hits FROM public.ai_part_lookup_cache;
    END IF;

    -- Unresolved security alerts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_alerts') THEN
        SELECT COUNT(*) INTO v_honeypot_alerts FROM public.security_alerts WHERE resolved_at IS NULL;
    END IF;

    -- CSP violation reports
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

