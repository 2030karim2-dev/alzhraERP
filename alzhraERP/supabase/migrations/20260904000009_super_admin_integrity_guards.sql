-- ==============================================================================
-- Migration: 20260904000009_super_admin_integrity_guards.sql
-- Description:
--   1) extend_company_trial:
--        • Block extending trials for suspended or cancelled or inactive companies.
--        • Raise explicit Arabic error requiring reactivation via toggle_company_status.
--   2) admin_assign_company_plan:
--        • Automatically transition subscription_status to 'active' when a plan
--          is assigned to an active company (fixes status getting stuck in 'past_due'/'trial').
--        • When plan is unlinked (p_plan_id IS NULL), correctly transition to
--          'trial' if trial is still live, or 'past_due' if expired.
--        • Comprehensive audit logging with prev_status and new_status.
--   3) Security privileges: REVOKE from PUBLIC/anon, GRANT to authenticated/service_role.
--   4) toggle_company_status: عند التعليق تُحفَظ الحالة الملغاة/المتأخرة
--        ('cancelled'/'past_due') بدل استبدالها بـ 'suspended'؛ فإعادة التفعيل
--        تستعيد الحالة الأصلية بدل تحويلها خطأً إلى 'active'. الحجب الفعلي يبقى
--        عبر is_active = false (fn_assert_company_access / get_auth_companies).
--        الواجهة (deriveStatusAfterToggle/companyStatusLabel) متزامنة مع هذا السلوك.
-- ==============================================================================

-- 1) extend_company_trial — الحماية الصارمة من تفعيل المنشآت الموقوفة/الملغاة
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
    v_is_active boolean;
    v_plan_id uuid;
    v_final_status text;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    IF p_days IS NULL OR p_days <= 0 THEN
        RAISE EXCEPTION 'عدد الأيام للتمديد يجب أن يكون أكبر من صفر';
    END IF;

    IF p_days > 365 THEN
        RAISE EXCEPTION 'لا يمكن تمديد الفترة التجريبية لأكثر من 365 يوماً في المرة الواحدة';
    END IF;

    SELECT subscription_status, is_active, plan_id
      INTO v_status, v_is_active, v_plan_id
      FROM public.companies
     WHERE id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة أو لا يمكن تمديد فترتها التجريبية', p_company_id;
    END IF;

    -- حظر تمديد التجربة للمنشآت الموقوفة أو الملغاة لمنع كسر قرارات الحظر
    IF v_is_active = false OR v_status IN ('suspended', 'cancelled') THEN
        RAISE EXCEPTION 'لا يمكن تمديد الفترة التجريبية لمنشأة موقوفة أو ملغاة. يرجى إعادة تفعيل المنشأة أولاً';
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

-- 2) admin_assign_company_plan — مزامنة حالة الاشتراك تلقائياً عند تعيين/إلغاء الباقة
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
    v_prev_status text;
    v_is_active boolean;
    v_trial_ends timestamptz;
    v_new_status text;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super Admin privilege required';
    END IF;

    SELECT subscription_status, is_active, trial_ends_at
      INTO v_prev_status, v_is_active, v_trial_ends
      FROM public.companies
     WHERE id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الشركة بالمعرف % غير موجودة', p_company_id;
    END IF;

    IF p_plan_id IS NOT NULL THEN
        SELECT name_ar INTO v_plan_name FROM public.subscription_plans WHERE id = p_plan_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'باقة الاشتراك المحددة غير موجودة';
        END IF;

        -- عند تعيين باقة مدفوعة لمنشأة مفعلة، ترقيتها تلقائياً إلى 'active'
        IF v_is_active THEN
            v_new_status := 'active';
        ELSE
            v_new_status := v_prev_status;
        END IF;
    ELSE
        -- عند إلغاء تعيين الباقة، تقييم الحالة وفق سريان التجربة
        IF v_is_active THEN
            IF v_trial_ends IS NOT NULL AND v_trial_ends > now() THEN
                v_new_status := 'trial';
            ELSE
                v_new_status := 'past_due';
            END IF;
        ELSE
            v_new_status := v_prev_status;
        END IF;
    END IF;

    UPDATE public.companies
       SET plan_id = p_plan_id,
           subscription_status = v_new_status,
           updated_at = now()
     WHERE id = p_company_id;

    PERFORM public.audit_write(
        'ASSIGN_COMPANY_PLAN',
        'companies',
        p_company_id,
        p_company_id,
        jsonb_build_object(
            'new_plan_id', p_plan_id, 
            'plan_name', v_plan_name,
            'prev_status', v_prev_status,
            'new_status', v_new_status,
            'actor', auth.uid()
        )
    );

    RETURN true;
END;
$$;

-- 3) تقييد الصلاحيات
REVOKE EXECUTE ON FUNCTION public.extend_company_trial(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_assign_company_plan(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.extend_company_trial(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_company_plan(uuid, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4) toggle_company_status — التعليق يحفظ الحالة الملغاة/المتأخرة الأصلية
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
                -- استرجاع الحالة الأصلية، لكن تجربة منتهية لا تُستعاد كتجربة
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
                v_new_status := 'past_due';
            ELSE
                v_new_status := 'active';
            END IF;
        ELSE
            v_new_status := p_status;
        END IF;
    ELSE
        -- التعليق: is_active = false هو الحاجز الفعلي للوصول، لذلك نحافظ على
        -- الحالة الملغاة/المتأخرة حتى تستعيدها إعادة التفعيل، وكل حالة أخرى تتحول 'suspended'.
        IF v_prev_status IN ('past_due', 'cancelled') THEN
            v_new_status := v_prev_status;
        ELSE
            v_new_status := 'suspended';
        END IF;
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

REVOKE EXECUTE ON FUNCTION public.toggle_company_status(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_company_status(uuid, boolean, text) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5) toggle_super_admin — تحصين منع إزالة النفس ومنع سحب آخر سوبر أدمن
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_super_admin(
    p_target_user_id uuid,
    p_make_super_admin boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_admin_count bigint;
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

    -- منع حذف آخر سوبر أدمن في المنصة
    IF NOT p_make_super_admin AND EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = p_target_user_id) THEN
        SELECT COUNT(*) INTO v_admin_count FROM public.super_admins;
        IF v_admin_count <= 1 THEN
            RAISE EXCEPTION 'لا يمكن سحب صلاحية السوبر أدمن الأخير في النظام لمنع الإغلاق التام للمنصة';
        END IF;
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

REVOKE EXECUTE ON FUNCTION public.toggle_super_admin(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_super_admin(uuid, boolean) TO authenticated, service_role;


