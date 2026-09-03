-- ==============================================================================
-- Migration: 20260904000004_guard_subscription_plan_delete.sql
-- Description:
--   Prevent deleting a subscription plan that is still referenced by companies
--   (companies.plan_id). The baseline FK uses ON DELETE SET NULL, which would
--   silently detach customers from their paid plan. This BEFORE DELETE trigger
--   raises a clear Arabic error instead, so the Super Admin must first unlink
--   the plan from the affected companies.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_guard_subscription_plan_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.companies WHERE plan_id = OLD.id) THEN
        RAISE EXCEPTION 'لا يمكن حذف باقة الاشتراك: لا تزال مرتبطة بمنشآت. ألغِ ربطها أولاً ثم أعد المحاولة.';
    END IF;
    RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_guard_subscription_plan_delete() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_guard_subscription_plan_delete() FROM authenticated;

DROP TRIGGER IF EXISTS trg_guard_subscription_plan_delete ON public.subscription_plans;
CREATE TRIGGER trg_guard_subscription_plan_delete
BEFORE DELETE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.fn_guard_subscription_plan_delete();
