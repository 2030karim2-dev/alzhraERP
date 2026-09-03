-- ==============================================================================
-- Migration: 20260904000001_super_admin_status_integrity.sql
-- Description:
--   Data-integrity fixes on top of 20260903000004:
--     1) toggle_company_status: when reactivating a company, restore the most
--        meaningful subscription status (keeps 'trial'/'past_due'/'cancelled')
--        instead of blindly forcing 'active' and erasing the trial state.
--     2) extend_company_trial: never downgrade an active paid company to 'trial'.
--   Both keep the audit_write trail introduced in 20260903000004.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1) toggle_company_status — إعادة التفعيل تستعيد الحالة الأكثر دلالة
-- ------------------------------------------------------------------------------
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
    v_trial_ends timestamptz;
    v_plan_id uuid;
    v_new_status text;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    SELECT subscription_status, is_active, trial_ends_at, plan_id
      INTO v_prev_status, v_prev_active, v_trial_ends, v_plan_id
      FROM public.companies
     WHERE id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة', p_company_id;
    END IF;

    IF p_is_active THEN
        -- إعادة تفعيل حساب الشركة
        IF p_status IS NULL OR p_status IN ('active', 'suspended') THEN
            IF v_prev_status NOT IN ('suspended', 'active') THEN
                -- استرجاع الحالة السابقة (مثال: كانت trial قبل التعليق)
                v_new_status := v_prev_status;
            ELSIF v_plan_id IS NOT NULL THEN
                v_new_status := 'active';
            ELSIF v_trial_ends IS NOT NULL AND v_trial_ends > now() THEN
                v_new_status := 'trial';
            ELSE
                v_new_status := 'active';
            END IF;
        ELSE
            v_new_status := p_status;
        END IF;
    ELSE
        v_new_status := 'suspended';
    END IF;

    UPDATE public.companies
       SET is_active = p_is_active,
           subscription_status = v_new_status,
           updated_at = now()
     WHERE id = p_company_id;

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
            'requested_status', p_status,
            'actor', auth.uid()
        )
    );

    RETURN true;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2) extend_company_trial — لا تخفض شركة مدفوعة نشطة إلى حالة trial
-- ------------------------------------------------------------------------------
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
    v_status text;
    v_plan_id uuid;
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

    UPDATE public.companies
       SET trial_ends_at = GREATEST(COALESCE(trial_ends_at, now()), now()) + make_interval(days => p_days),
           subscription_status = CASE
               WHEN v_status = 'active' AND v_plan_id IS NOT NULL THEN 'active'
               ELSE 'trial'
           END,
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
            'actor', auth.uid()
        )
    );

    RETURN v_new_expiry;
END;
$$;
