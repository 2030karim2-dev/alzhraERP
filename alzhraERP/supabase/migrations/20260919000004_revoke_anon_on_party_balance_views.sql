-- ============================================================
-- Migration: 20260919000003_revoke_anon_on_party_balance_views.sql
-- Description:
--   Closes an unauthenticated data-exposure hole on the party balance views.
--
--   Both views are created with `security_invoker = false`
--   (see 20260919000001_deep_database_audit_hardening_and_remediation.sql), so
--   the RLS of their underlying tables is NOT evaluated for the caller. Combined
--   with the anon SELECT grant that `20260919000001` added, ANY holder of the
--   public anon key could read every company's receivable/payable balances via
--   `/rest/v1/party_balances`.
--
--   The SPA never reads these views unauthenticated — parties/api.ts always runs
--   with a signed-in session and filters by company_id, with the dedicated
--   RPCs (get_party_balances_by_company / get_party_currencies_by_company) as the
--   primary path. Revoking anon therefore has ZERO functional impact.
--
--   Applied live on 2026-09-19 and verified:
--     anon_select = false, authenticated_select = true, service_role_select = true
--
--   STILL OPEN (backend, requires an informed decision):
--     `security_invoker = false` keeps the underlying RLS bypassed for
--     authenticated callers too, so a signed-in user can still read other
--     tenants' balances by omitting the company_id filter. Re-enable
--     `security_invoker = true` (with RLS coverage / a company guard inside the
--     view) once the reporting access path is re-tested.
-- ============================================================

REVOKE SELECT ON public.party_balances FROM anon;
REVOKE SELECT ON public.party_balances_by_currency FROM anon;

NOTIFY pgrst, 'reload schema';
