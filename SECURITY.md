# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Al-Zahra Smart ERP, please
report it privately to the maintainers:

- **Email:** security@alzhra-erp.example.com
- **Subject prefix:** `[SECURITY]`

We will acknowledge receipt within 48 hours and provide a timeline
for a fix within 7 days for critical issues.

Please **do not** open a public GitHub issue for security
vulnerabilities.

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | :white_check_mark: |

## Security Architecture Overview

This application implements defense in depth across four layers:

1. **Browser → Supabase Gateway** — CSP, HSTS, X-Frame-Options,
   Permissions-Policy, COOP/COEP/CORP. Tokens never sent in
   cookies (CSRF N/A).
2. **Gateway → Postgres** — RLS on every business table (default-deny),
   `fn_assert_company_access()` on every write RPC, per-company
   idempotency UNIQUE, storage MIME guard, chat body sanitization.
3. **Database role separation** — `anon` has no direct table grants,
   `authenticated` is read-only on most tables (writes via
   SECURITY DEFINER RPCs), `service_role` only in Edge Functions.
4. **Application business logic** — financial values recomputed
   server-side, posted-journal immutability triggers, atomic
   `check_rate_limit`, audit logging via `public.audit_write()`.

See `docs/decisions/ADR-012-trust-boundaries.md` for the full
trust map and `docs/decisions/ADR-013-security-gate.md` for the
audit state.

## Security Audit Status

The codebase was last audited on 2026-08-26. Key results:

- 16 vulnerabilities found, 14 fixed, 2 accepted with justification
- 5 hardening migrations applied (numbered 2026082600000{0..4})
- 6 SQL test files maintained (run in CI)
- 6 audit views maintained (run as canaries)

## Hard Rules for Contributors

1. **Every new public RPC** that takes `p_company_id` MUST call
   `PERFORM public.fn_assert_company_access(p_company_id);` as the
   first statement of its BEGIN block.
2. **Every new SECURITY DEFINER function** MUST set
   `SET search_path TO 'public'` (or `''`) immediately after the
   function declaration.
3. **Every new RPC** MUST have
   `REVOKE EXECUTE … FROM anon, PUBLIC; GRANT EXECUTE … TO authenticated;`
   unless intentionally public.
4. **Every new table** with a `company_id` column MUST have
   `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` plus RLS policies
   before merging.
5. **Every new write RPC** MUST call
   `PERFORM public.audit_write(...);` to log the action.
6. **Every new expensive RPC** MUST call
   `PERFORM public.enforce_rate_limit(..., max, window);`.
7. **No `dangerouslySetInnerHTML` or `innerHTML`** with user input.
   If you need to render user-provided HTML, sanitize it
   server-side at insert time.
8. **No `console.log` of `Authorization` headers, tokens, or
   passwords.** The `console.warn` in `supabaseClient.ts:183-187`
   is the canonical pattern (logs `attempt`, `url`, `method` only).
9. **No new dev-only code** without `import.meta.env.DEV` guard.

## Audit Canaries (CI)

The following views MUST return 0 rows on `main`:

- `public.v_tables_without_rls`
- `public.v_security_definer_no_search_path`
- `public.v_functions_public_execute`
- `public.v_api_v1_missing_tenant_guard`

The following view should trend toward 0:
- `public.v_rpcs_missing_audit` (10+ RPCs currently pending manual
  audit wiring).

Run `./scripts/run-security-canary.ps1` weekly to verify.
