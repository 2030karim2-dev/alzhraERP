# ADR-012: Trust Boundaries and Security Architecture Map

## Status

Accepted

## Date

2026-08-26

## Context

A comprehensive security audit of the Al-Zahra ERP system identified the
need for an explicit map of trust boundaries and the data flow across
them. This ADR captures the current state after the 2026-08-26 security
hardening sweep, so future engineers and security reviewers have a single
reference for "what protects what."

## Data Flow (top to bottom)

```
┌──────────────────────────────────────────────────────────────────┐
│ BROWSER (untrusted)                                              │
│  - React 19 SPA, HashRouter                                      │
│  - localStorage: auth_token, user_data (XSS-readable, mitigated) │
│  - Service Worker: none                                           │
└──────────────────────────────────────────────────────────────────┘
              │  Bearer JWT (anon key + access_token)
              │  All requests go to *.supabase.co
              ▼
┌──────────────────────────────────────────────────────────────────┐
│ SUPABASE GATEWAY (PostgREST, Realtime, Storage, Edge Functions)  │
│  - JWT verified by GoTrue                                         │
│  - RLS applied on every PostgREST query                           │
│  - RLS bypassed for service_role (Edge Functions only)            │
└──────────────────────────────────────────────────────────────────┘
              │
   ┌──────────┴──────────┬────────────────┬────────────────┐
   │                     │                │                │
   ▼                     ▼                ▼                ▼
┌─────────┐      ┌──────────────┐  ┌──────────┐  ┌──────────────┐
│PostgREST│      │ Edge         │  │ Realtime │  │ Storage      │
│         │      │ Functions    │  │ channel  │  │ (bucketed)   │
└─────────┘      └──────────────┘  └──────────┘  └──────────────┘
   │                     │                │                │
   │ SQL over 391 RLS    │ Deno isolates  │ Postgres       │ storage.objects
   │ policies            │ + service_role │ logical        │ policies +
   │                     │ key            │ replication    │ MIME guard
   ▼                     ▼                ▼                ▼
┌──────────────────────────────────────────────────────────────────┐
│ POSTGRES (single database, 156 tables, 286+ public functions)    │
│  - 391 RLS policies, default-deny                                 │
│  - SECURITY DEFINER on most write RPCs, search_path pinned        │
│  - fn_assert_company_access() / verify_company_access() /         │
│    get_user_company_id() / get_auth_companies() gate every write  │
│  - Triggers: posted-journal immutability, audit, stock sync      │
│  - v_security_definer_no_search_path / v_functions_public_execute│
│    / v_api_v1_missing_tenant_guard — ongoing audit views          │
└──────────────────────────────────────────────────────────────────┘
```

## Trust Boundaries

### Boundary 1: Browser ↔ Supabase Gateway

- **Threat:** XSS, CSRF (mitigated by JWT-in-Authorization-header),
  token theft via DevTools/Sentry.
- **Controls:**
  - CSP `script-src` without `'unsafe-eval'`, with `frame-ancestors 'self'`,
    `base-uri 'self'`, `form-action 'self'`. See `vercel.json` /
    `netlify.toml`.
  - HSTS, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff,
    Permissions-Policy (camera=self, mic/geo off).
  - Source maps OFF in production (`vite.config.ts:51` `sourcemap: false`).
  - Anon key only; no service role / AI keys in the bundle.
  - `console.warn` in network retry path strips `Authorization` from
    logs (R-11, `supabaseClient.ts:183-187`).
- **Residual risk:** `localStorage` holds the access token. Any XSS
  sink can read it. Mitigated by the lack of `innerHTML` /
  `dangerouslySetInnerHTML` sinks (only one hardcoded print CSS).
  Long-term: httpOnly cookies via an auth proxy (R-03, deferred).

### Boundary 2: Supabase Gateway ↔ Postgres

- **Threat:** PostgREST exposes every table by default; without RLS, all
  rows are visible. RLS is the only safety net.
- **Controls:**
  - 391 RLS policies, default-deny per the project ADR-002.
  - `v_tables_without_rls` view (created in 20260826000000) lists any
    RLS-disabled business table; manual review per row is the ongoing
    audit mechanism.
  - SECURITY DEFINER functions: 339 instances in the migration history,
    **all** with `SET search_path TO 'public'` or `''`. Verified by the
    `v_security_definer_no_search_path` view.
  - Sensitive tables (`audit_logs`, `role_permissions`) are NOT in
    the `supabase_realtime` publication (verified in
    `test_security_authorization.sql` § 9).
- **Residual risk:** a future migration could add a table without RLS.
  The audit view + the pre-merge checklist must catch this.

### Boundary 3: Authenticated user ↔ Other tenants

- **Threat:** cross-tenant data read/write. R-26 (api_v1_*) was the
  biggest example: 39 functions in the baseline accepted `p_company_id`
  but did not verify the caller was a member of that company.
- **Controls (after the 2026-08-26 sweep):**
  - Every api_v1_* function that takes `p_company_id` now calls
    `PERFORM public.fn_assert_company_access(p_company_id)` as the
    first statement of its BEGIN block. Migration:
    `20260826000001_fix_api_v1_cross_tenant_vulnerability.sql`.
  - `api_v1_sys_worker_heartbeat` (no `p_company_id`) is revoked
    from `authenticated` and granted only to `service_role`.
  - `api_v1_sys_is_feature_enabled` (optional `p_company_id`) only
    runs the guard when a non-null `p_company_id` is passed.
  - `v_api_v1_missing_tenant_guard` view lists any future function
    that lacks the guard; the security test harness fails if any rows
    are present.
  - Storage policies for `invoices` and `company-assets` buckets now
    require the caller's `company_id` (extracted from the object path's
    first segment) to be in `get_auth_companies()`.
    Migration: `20260826000002_storage_per_bucket_tenant_policies.sql`.
  - `file_attachments` RLS tightened from `TO public` to `TO authenticated`.

### Boundary 4: Database role ↔ Other database roles

- **Threat:** privilege escalation via GRANTs or SECURITY DEFINER.
- **Controls:**
  - `anon` has NO direct table grants; all data access goes through
    PostgREST + RLS or SECURITY DEFINER RPCs.
  - `authenticated` has SELECT-only on most tables, all writes via
    SECURITY DEFINER RPCs.
  - `service_role` is used only by Edge Functions and is NOT in the
    frontend bundle.
  - `v_functions_public_execute` view lists any function still
    EXECUTE-able by the PUBLIC role; the security test harness fails
    if any rows are present.
  - Cross-schema writes from SECURITY DEFINER are bounded by the
    pinned `search_path`.

## Defense in Depth Layers

1. **Network:** HTTPS only (Supabase enforces), HSTS preload.
2. **Auth:** JWT with auto-refresh, no cookies, sign-out clears
   React Query cache + IndexedDB.
3. **Authorization:** RLS on tables, role permissions via
   `has_permission()` RPC, per-company tenant scoping in
   `fn_assert_company_access()`.
4. **Input validation:** server-side `format`, `::uuid`, range checks
   in SECURITY DEFINER RPCs (see `submit_vendor_quotation_revision` for
   the canonical pattern).
5. **Business logic:** server-side recalculation of totals, line
   balancing checks, fiscal-year guards, posted-journal immutability
   triggers.
6. **Audit:** `audit_logs`, `audit_logs_archive`,
   `procurement_audit_logs`, `notification_log`, `debt_message_log`,
   `debt_payment_promises`. CHECK constraint on `audit_logs.action`
   ensures it is non-empty.
7. **MIME / file-type guard:** `storage_guard_dangerous_mime`
   trigger rejects SVG, HTML, and executables at insert time.
8. **Chat sanitization:** `chat_guard_body` trigger strips control
   characters and bidi overrides, caps body at 16KB.
9. **Idempotency:** per-company UNIQUE on
   `invoices(company_id, idempotency_key)`. (R-19: was global, which
   enabled cross-tenant DoS; fixed in 20260826000000.)
10. **CSP + headers:** `script-src` no `'unsafe-eval'`,
    `frame-ancestors 'self'`, `base-uri 'self'`, `form-action 'self'`.

## Open Residual Risks (documented, not fixed in this sweep)

- **R-02:** Password complexity enforced client-side only. Requires a
  Supabase Auth Hook (project-level config).
- **R-03:** `localStorage` tokens are XSS-readable. Requires a custom
  auth proxy.
- **R-24, R-25:** `esbuild` (dev) and `elliptic` (transitive) CVEs
  require breaking upgrades of `vite` and `vite-plugin-node-polyfills`.
- **CSP `script-src 'unsafe-inline'`:** required for the Vite-generated
  inline scripts; tightening to a nonce requires a Vite plugin change.
- **R-13:** `style.innerHTML` (hardcoded print CSS) is a code-pattern
  hazard but not a live XSS sink.

## Verification Artifacts

- `alzhraERP/supabase/tests/test_security_authorization.sql`
- `alzhraERP/supabase/tests/test_api_v1_cross_tenant.sql`
- `alzhraERP/supabase/tests/test_rls_isolation.sql`
- `alzhraERP/docs/security-hardening-2026-08-26.md` (vulnerability matrix)
- `alzhraERP/plans/baseline_functions_audit.csv` (full 286-function index)
- `alzhraERP/plans/all_migrations_function_audit.csv` (38 migrations ×
  function markers)

## Consequences

- All new RPCs that take `p_company_id` MUST call
  `fn_assert_company_access(p_company_id)` as the first statement.
  Code reviewers should check this.
- All new SECURITY DEFINER functions MUST set `SET search_path TO 'public'`
  or `SET search_path TO ''` immediately after the function
  declaration.
- All new tables with a `company_id` column MUST have RLS enabled
  before merging the migration.
- The `v_api_v1_missing_tenant_guard` view should be queried in CI
  and must return zero rows.
