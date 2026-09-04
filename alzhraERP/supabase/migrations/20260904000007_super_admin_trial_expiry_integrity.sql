-- ==============================================================================
-- Migration: 20260904000007_super_admin_trial_expiry_integrity.sql
-- Description:
--   1) toggle_company_status — تحصين إعادة التفعيل:
--        • التحقق من صلاحية p_status قبل الكتابة (رسالة عربية واضحة بدل خطأ CHECK).
--        • لا تُستعاد حالة 'trial' إذا كانت التجربة منتهية (trial_ends_at <= now()
--          أو NULL) — تُحوَّل إلى 'past_due' لتظهر في لوحة السوبر أدمن كمنشأة
--          متأخرة السداد بدل الاستمرار بالعمل مجاناً بحالة تجريبية منتهية.
--   2) fn_transition_expired_trials() — تحويل تلقائي يومي للتجارب المنتهية
--      النشطة إلى 'past_due' مع توثيق ملخص في سجل التدقيق (بدون حجب الوصول —
--      قرار التعليق يبقى بيد السوبر أدمن عبر واجهة الإدارة).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1) toggle_company_status — إعادة التفعيل تحترم انتهاء التجربة
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

    -- تحقق صريح من القيمة المرسلة (بديل رسالة CHECK CONSTRAINT الغامضة)
    IF p_status IS NOT NULL
       AND p_status NOT IN ('trial', 'active', 'past_due', 'cancelled', 'suspended') THEN
        RAISE EXCEPTION 'حالة الاشتراك المرسلة غير صالحة: %', p_status;
    END IF;

    SELECT subscription_status, is_active, trial_ends_at, plan_id
      INTO v_prev_status, v_prev_active, v_trial_ends, v_plan_id
      FROM public.companies
     WHERE id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة', p_company_id;
    END IF;

    IF p_is_active THEN
        IF p_status IS NULL OR p_status IN ('active', 'suspended') THEN
            IF v_prev_status NOT IN ('suspended', 'active') THEN
                -- استرجاع الحالة السابقة، لكن تجربة منتهية لا تُستعاد كتجربة
                IF v_prev_status = 'trial'
                   AND (v_trial_ends IS NULL OR v_trial_ends <= now()) THEN
                    v_new_status := 'past_due';
                ELSE
                    v_new_status := v_prev_status;
                END IF;
            ELSIF v_plan_id IS NOT NULL THEN
                v_new_status := 'active';
            ELSIF v_trial_ends IS NOT NULL AND v_trial_ends > now() THEN
                v_new_status := 'trial';
            ELSIF v_trial_ends IS NOT NULL THEN
                -- تجربة منتهية بلا باقة: علّمها كمتأخرة السداد بدل active مفتوحة
                v_new_status := 'past_due';
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
            'trial_ends_at', v_trial_ends,
            'actor', auth.uid()
        )
    );

    RETURN true;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2) تحويل يومي للتجارب المنتهية النشطة إلى 'past_due' (بدون حجب الوصول)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_transition_expired_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_count integer;
    v_ids uuid[];
BEGIN
    SELECT array_agg(c.id), count(*)::int
      INTO v_ids, v_count
      FROM public.companies c
     WHERE c.subscription_status = 'trial'
       AND c.is_active = true
       AND c.trial_ends_at IS NOT NULL
       AND c.trial_ends_at < now();

    IF COALESCE(v_count, 0) > 0 THEN
        UPDATE public.companies
           SET subscription_status = 'past_due',
               updated_at = now()
         WHERE id = ANY (v_ids)
           AND subscription_status = 'trial'
           AND is_active = true
           AND trial_ends_at IS NOT NULL
           AND trial_ends_at < now();

        PERFORM public.audit_write(
            'TRIAL_EXPIRED_TRANSITIONS',
            'companies',
            NULL,
            NULL,
            jsonb_build_object(
                'transitioned', v_count,
                'company_ids', to_jsonb(v_ids),
                'ran_at', now()
            )
        );
    END IF;

    RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_transition_expired_trials() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_transition_expired_trials() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_transition_expired_trials() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_transition_expired_trials() TO service_role;

-- pg_cron: يومياً 01:30 UTC (قبل ذروة العمل في توقيت الرياض)
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trial-expiry-daily') THEN
      PERFORM cron.unschedule('trial-expiry-daily');
    END IF;
    PERFORM cron.schedule(
      'trial-expiry-daily',
      '30 1 * * *',
      $$SELECT public.fn_transition_expired_trials()$$
    );
  END IF;
END $do$;

