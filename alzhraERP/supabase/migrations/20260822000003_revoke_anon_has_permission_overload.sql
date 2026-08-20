-- ============================================================
-- HARDENING: revoke anon/PUBLIC EXECUTE from the company-scoped
-- has_permission(text, uuid) overload
-- ------------------------------------------------------------
-- The 2-arg overload was added by migration 20260821000005 but never
-- hardened; like the 1-arg version (revoked in 20260819000004) it
-- should be executable by `authenticated` only. Anonymous callers
-- always get false (auth.uid() is NULL inside the SECURITY DEFINER
-- body), so this is defense-in-depth, not a leak fix.
-- Date: 2026-08-22
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.has_permission(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(text, uuid) TO authenticated;
