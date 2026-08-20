-- ============================================================
-- FIX (H1 + H2): cross-tenant data exposure
-- ------------------------------------------------------------
-- H2) `external_cross_references` / `external_fitment_evidence`
--     had a SECOND permissive SELECT policy `USING (true)` that
--     exposed every tenant's rows to ANY authenticated user. The
--     company-scoped SELECT policy is kept; the `USING(true)` one
--     is dropped.
--
-- H1) `vehicles` is a global catalog WITHOUT company_id, but its
--     UPDATE/DELETE policies allowed ANY owner/admin of ANY
--     company to modify/delete any row (cross-tenant destructive
--     writes). The app never writes to `vehicles` directly — the
--     VIN flow goes through the SECURITY DEFINER `ensure_vehicle`
--     RPC (unaffected by RLS). UPDATE/DELETE are now restricted
--     to super_admin; SELECT stays open for the shared catalog;
--     INSERT stays open to owners/admins (additive contributions).
--
-- Date: 2026-08-21
-- ============================================================

-- H2: drop the USING(true) permissive policies
DROP POLICY IF EXISTS "ext_xref_select_auth" ON public.external_cross_references;
DROP POLICY IF EXISTS "ext_fitment_select_auth" ON public.external_fitment_evidence;

-- H1: vehicles — destructive writes restricted to super_admin
DROP POLICY IF EXISTS "vehicles_delete" ON public.vehicles;
CREATE POLICY "vehicles_delete"
  ON public.vehicles
  FOR DELETE TO public
  USING (is_super_admin());

DROP POLICY IF EXISTS "vehicles_update" ON public.vehicles;
CREATE POLICY "vehicles_update"
  ON public.vehicles
  FOR UPDATE TO public
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "part_cache_select_auth" ON public.part_catalog_cache;
