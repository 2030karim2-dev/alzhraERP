-- ============================================================
-- FIX: verify_company_access picked an arbitrary company for
--      multi-company users.
--
-- Every new user gets an auto-created company
-- (trigger on_auth_user_created_setup_company → setup_new_company),
-- and invited users then get a SECOND user_company_roles row.
-- `user_profiles` is a LEFT JOIN view (profiles ⋈ user_company_roles)
-- that returns ONE ROW PER MEMBERSHIP, so:
--
--   SELECT company_id INTO v_user_company_id FROM user_profiles WHERE id=...;
--
-- bound an arbitrary (often wrong) company → get_dashboard_summary,
-- get_*_stats, commit_payment, etc. failed with
-- 42501 "Access denied: لا تملك صلاحية الوصول لبيانات هذه الشركة".
--
-- Fix: validate membership for the REQUESTED company directly via
-- user_company_roles (the same model fn_assert_company_access uses);
-- fall back to any membership only when no company was requested.
-- Signature unchanged → privileges preserved. Date: 2026-08-20
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_company_access(p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_user_company_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Requested company: validate membership directly. user_profiles is a
  -- derived LEFT JOIN view that returns one row per membership and made
  -- SELECT ... INTO pick an arbitrary (wrong) company for multi-company users.
  IF p_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = v_user_id AND ucr.company_id = p_company_id
    ) THEN
      RAISE EXCEPTION 'Access denied: لا تملك صلاحية الوصول لبيانات هذه الشركة' USING ERRCODE = '42501';
    END IF;
    RETURN p_company_id;
  END IF;

  -- No requested company: fall back to any company the user belongs to.
  SELECT company_id INTO v_user_company_id
  FROM public.user_company_roles
  WHERE user_id = v_user_id
  LIMIT 1;
  IF v_user_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company' USING ERRCODE = '42501';
  END IF;
  RETURN v_user_company_id;
END;
$function$;
