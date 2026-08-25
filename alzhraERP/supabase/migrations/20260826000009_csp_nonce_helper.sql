-- ============================================================
-- Migration: 20260826000009_csp_nonce_helper.sql
-- Date: 2026-08-26
-- Severity: INFORMATIONAL (defense in depth)
--
-- PURPOSE:
-- Provide a server-side helper for noncing the CSP header.
-- The frontend must:
--   1) Fetch a fresh nonce per page load from this RPC.
--   2) Inject <script nonce="..."> tags in index.html.
--   3) Set the CSP header to include 'nonce-...'.
--
-- This migration only provides the RPC; the Vite plugin and
-- index.html change is a separate frontend task (deferred until
-- the team can verify Tailwind/Vite don't break).
--
-- The RPC is intentionally cheap (a single random 128-bit value
-- encoded as base64) and requires no auth (any page load
-- triggers it).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_csp_nonce()
RETURNS text
LANGUAGE sql
STABLE
AS $func$
  -- 16 bytes = 128 bits, base64-encoded. Sufficient entropy.
  SELECT encode(gen_random_bytes(16), 'base64');
$func$;

REVOKE EXECUTE ON FUNCTION public.get_csp_nonce() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_csp_nonce() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_csp_nonce() TO anon;
GRANT EXECUTE ON FUNCTION public.get_csp_nonce() TO authenticated;

COMMENT ON FUNCTION public.get_csp_nonce() IS
  'Returns a 128-bit random nonce, base64-encoded. The frontend
  fetches this once per page load and uses it to noncify inline
  <script> tags. The same nonce is set in the CSP header.';

NOTIFY pgrst, 'reload schema';

COMMIT;
