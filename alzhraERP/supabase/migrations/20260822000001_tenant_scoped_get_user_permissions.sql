-- ============================================================
-- FIX: company-scoped get_user_permissions overload
-- ------------------------------------------------------------
-- Root cause: `get_user_permissions()` (no args) returns permissions
-- for the user's role snapshot in `user_profiles` — a single arbitrary
-- row — regardless of the company the user is currently operating in.
-- An admin in Company A therefore saw Company B's menu gates, and the
-- sidebar could show actions that RLS would later reject (or hide
-- actions the user legitimately has in the active company).
--
-- This adds a company-scoped overload mirroring the pattern from
-- migration 20260821000005 (has_permission(p_permission, p_company_id)),
-- reading the multi-company membership from `user_company_roles`.
-- The frontend (usePermission.ts) now passes p_company_id.
--
-- The no-arg original is preserved for backward compatibility.
-- Date: 2026-08-22
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_company_id uuid)
 RETURNS TABLE(permission text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT rp.permission
    FROM public.role_permissions rp
    JOIN public.user_company_roles ucr ON ucr.role = rp.role
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = p_company_id
    ORDER BY rp.permission;
$function$;

-- Follow the project hardening pattern: authenticated only.
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid) FROM PUBLIC;
