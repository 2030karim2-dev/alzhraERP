-- ==============================================================================
-- Migration: 20260903000003_fix_admin_rpc_not_found_checks.sql
-- Description: Add FOUND checks to toggle_company_status and extend_company_trial
-- ==============================================================================

-- إصلاح دالة toggle_company_status — إضافة فحص وجود الشركة
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

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة', p_company_id;
    END IF;

    RETURN true;
END;
$$;

-- إصلاح دالة extend_company_trial — إضافة فحص وجود الشركة
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

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة أو لا يمكن تمديد فترتها التجريبية', p_company_id;
    END IF;

    RETURN v_new_expiry;
END;
$$;
