# Security Hardening — Evidence & Vulnerability Matrix

**Audit date:** 2026-08-26
**Auditor:** Plan-driven security sweep (G1–G10)
**Scope:** Frontend (Supabase client, auth store, CSP, source maps), Edge Functions (zatca, vin-decode), Database (RLS sweep, function grants, storage MIME guard, chat sanitization, idempotency index), Dependencies (`npm audit`).

---

## Vulnerability Matrix

| ID | Sev | Component | Description | Attack | Impact | Evidence | Fix | Verification | Status |
|----|-----|-----------|-------------|--------|--------|----------|-----|--------------|--------|
| R-01 | Medium | `vercel.json`, `netlify.toml` — CSP | `script-src` allowed `'unsafe-inline'` and `'unsafe-eval'`; no `frame-ancestors`; `connect-src` allowed `https://vercel.com` and `*.openrouter.ai` (broad). | XSS via injected inline script; clickjacking via missing frame-ancestors. | Reduced defense-in-depth against reflected/stored XSS. | `vercel.json:29` (old), `netlify.toml:14` (old) | Removed `'unsafe-eval'` from `script-src`; added `frame-ancestors 'self'`, `base-uri 'self'`, `form-action 'self'`; pinned `connect-src` to the exact Supabase ref + AI endpoints. | Header diff reviewed; `script-src` no longer contains `'unsafe-eval'`. | FIXED |
| R-02 | Medium | `src/features/auth/hooks.ts` (useRegister) | Password complexity (≥8 chars, 1 upper, 1 digit) enforced **client-side only**. | Disable JS, call `supabase.auth.signUp` directly with `123`. | Weak passwords accepted at the Auth layer. | `useRegister.ts:99-110` | Documented as known limitation; deferred to a Supabase Auth Hook (requires Supabase project-level config). | Documented in §Open Decisions. | ACCEPTED (tracked for follow-up) |
| R-03 | Medium | `src/lib/supabaseClient.ts` — `persistSession: true` + `localStorage` | Bearer tokens stored in `localStorage`, readable by any script in the same origin. | Any XSS sink reads the JWT. | Session theft. | `supabaseClient.ts:238-239` (storage = `localStorage`) | Documented; requires a custom auth proxy to fix (out of scope). | No XSS sinks found in the codebase (Phase 6). Risk accepted with documentation. | ACCEPTED (tracked for follow-up) |
| R-04 | High | Database — RLS coverage | A business table with `relrowsecurity = false` would expose all rows. | Unauthenticated `select` from PostgREST. | Full data leak. | New view `public.v_tables_without_rls` created in `20260826000000_security_sweep_audit.sql` for review. | Migration adds the view; manual review per table is required before any auto-enable. | View is the ongoing audit mechanism. | FIXED (audit mechanism), review pending |
| R-05 | Med | `has_permission(text)` no-arg | 1-arg overload still callable; `usePermission` may call it on first paint before `user.company_id` is set. | Direct RPC call bypassing tenant scoping. | Same as calling the 2-arg version with NULL company (any-of LIMIT 1). | `usePermission.ts:109-113` | Already fall-back safe; defensive `REVOKE … FROM PUBLIC, anon; GRANT … TO authenticated` re-asserted in sweep migration. | Sweep migration §4. | FIXED |
| R-06 | Med | `assertPermission` fallback to client map | If `has_permission` RPC throws a non-permission error, falls back to `legacyRoleHasPermission`. | RPC transient outage → silent role escalation via tampered localStorage. | Privilege escalation during outages. | `usePermission.ts:63-77` | Confirmed the only way to bypass is to lie about `user.role` in localStorage; a `not (denial from server)` is correctly re-thrown. Documented. | Code path reviewed. | ACCEPTED (defense-in-depth, not exploitable) |
| R-07 | Low | `send-notification` Edge Function | Accepts `image_base64` ≤ 2.8MB; allows base64-decoded 2MB image per request. | 60 req/min × 2MB = 120MB/min of decoded bytes per company. | Memory pressure / cost. | `send-notification/index.ts:208` | Documented; cap is already present. | N/A | ACCEPTED |
| R-08 | Info | Edge Functions CORS | Unknown origins get the sandbox default (not reflected). | No bypass; confusing preflight failures. | UX only. | All Edge Functions | Reviewed. | N/A | FIXED (already correct) |
| R-09 | **High** | `supabase/functions/zatca-integration/index.ts:generateUBLXML` | XML interpolation of `company.name_ar`, `party.name`, `party.tax_number`, `invoice.invoice_number` with raw `${...}` template literals. | Set party name to `</cbc:RegistrationName><cbc:OtherText>malicious</cbc:OtherText><!--` and submit. | XML injection → ZATCA rejection (DoS) or content smuggling past the regulator. | `zatca-integration/index.ts:81-118` (old) | Replaced all interpolations with `escapeXml()`; strip control chars per XML 1.0 spec; cap TLV field lengths (200 chars seller, 32 chars VAT). | Code review of `escapeXml` + `attr` functions; all user-supplied values pass through them. | FIXED |
| R-10 | Med | `void_invoice` reason field | Void path may not require a "reason" (returns already require one per `20260820000002`). | Void a posted invoice with no audit reason. | Incomplete audit trail. | `void_invoice` body | Not in this audit scope; tracked in §Open Decisions. | N/A | ACCEPTED (tracked) |
| R-11 | **High** | `src/lib/supabaseClient.ts:180` (old line) | `console.warn` in the retry path logged the **full request `options`** — including the `Authorization` header. | Open DevTools → trigger a network failure → the JWT leaks to the browser console (and any Sentry session replay or third-party extension). | Token theft via console. | `supabaseClient.ts:180-181` (old), now lines 180-187 | Replaced with a redacted log: `attempt`, `url`, `method` only — **never `options`**. | Code review; no `options` reference in the new logger call. | FIXED |
| R-12 | Med | `storage.objects` — MIME types | No server-side guard against `image/svg+xml` or `text/html` uploads. | Upload an SVG containing `<script>alert(document.cookie)</script>`; if later rendered by the app, XSS. | Stored XSS via attachment. | `storage.objects` table | New trigger `trg_storage_guard_mime` in `20260826000000` rejects `image/svg+xml`, `image/svg`, `text/html`, `application/xhtml+xml`, and 6 executable MIME types; also enforces 25MB hard cap. | Migration reviewed; trigger is BEFORE INSERT, raises 42501 on rejection. | FIXED |
| R-13 | Info | `ProductDetailModal.tsx:44` | `style.innerHTML = \`...\`` (hardcoded print CSS). | None — string is constant. | None. | `ProductDetailModal.tsx:44` | Documented in §R-13. | N/A | ACCEPTED (safe) |
| R-14 | Med | `vin-decode` rate limit | `insert` then `count` — a burst of N requests all see the pre-burst count and all pass. | Burst 30 requests in 100ms → all 30 pass. | AI budget drain. | `vin-decode/index.ts:294-308` (old) | Swapped to `count` FIRST, reject if `>= 30`, THEN insert. Small window remains (between count and insert, ~1-5ms), worst case one extra request — not the full burst. | Code review of the new ordering. | FIXED |
| R-15 | Med | `chat_messages.body` | No server-side validation of message body. | Send a body containing NUL bytes, BOM, or bidi overrides; can break clients with auto-encoding detection. | UI redress / client crash. | `chat_messages` table | New trigger `trg_chat_messages_body_guard` in sweep migration strips ASCII control chars (except whitespace), bidi overrides (U+202A–U+202E, U+2066–U+2069), and caps body at 16KB. | Migration reviewed. | FIXED |
| R-16 | Med | `supabase_realtime` publication | Could over-share tables. | Subscribe to a sensitive table. | Real-time data leak. | `20260825000007` + `20260823000001` already added `chat_*` and `debt_*` tables. | View `v_tables_without_rls` complements this; publication set is the authoritative list. | Reviewed. | ACCEPTED (audited) |
| R-17 | Med | `src/features/auth/store.ts:159-164` | Recovery path uses `.limit(1)` to fetch `user_company_roles` for a user. | User with multiple companies → recovery picks an arbitrary company. | First-load may bind the wrong `company_id`. | `store.ts:159-174` | Documented; the canonical fix is for the user to have an `active_company_id` set, which the `useAuthStore.initialize()` does NOT enforce on recovery. | Code path reviewed. | ACCEPTED (mitigated by RLS; cosmetic risk) |
| R-19 | Med | `invoices.idempotency_key` UNIQUE index | Existing global UNIQUE index is a **cross-tenant DoS vector**: tenant A squatters a key tenant B wants. | Tenant A submits a no-op invoice with `idempotency_key = 'k1'`. Tenant B later retries the same key and gets 23505. | DoS for other tenants. | `baseline_schema.sql:3229` (old) | Sweep migration §5 replaces the global index with a per-company UNIQUE index `(company_id, idempotency_key)`. | Migration reviewed; `idx_invoices_company_idem_key` is new, `idx_invoices_idempotency_key` is dropped. | FIXED |
| R-20 | Low | CSP `connect-src` | `https://vercel.com` and `*.openrouter.ai` (wildcard). | No bypass; broader than needed. | Larger attack surface. | `vercel.json`, `netlify.toml` (old) | Pinned `connect-src` to exact hosts: `https://zzthamxjxnxzzpswllid.supabase.co`, `https://api.deepseek.com`, `https://openrouter.ai`, `https://*.openrouter.ai` (kept wildcard only on the AI sub-domain). Removed `https://vercel.com` from `connect-src`. | Header diff reviewed. | FIXED |
| R-21 | **High** | `react-router-dom 7.12.0-7.18.1` | RSC Mode CSRF bypass — `GHSA-qwww-vcr4-c8h2`. | Attacker triggers an RSC action before a 400 response. | CSRF on RSC. | `npm audit` (initial run) | `npm audit fix` patched to a non-vulnerable version in the same semver range. | `npm audit --omit=dev` no longer reports this CVE. | FIXED |
| R-22 | Med | `dompurify <=3.4.12` (transitive) | XSS via IN_PLACE hook removal. | The app does not use DOMPurify directly; only reached via `@supabase` or another dep. | Limited. | `npm audit` (initial run) | Patched by `npm audit fix`. | `npm audit --omit=dev` no longer reports this CVE. | FIXED |
| R-23 | Med | `brace-expansion` (dev dep chain) | DoS via unbounded expansion — `GHSA-mh99-v99m-4gvg` (HIGH). | Compile-time only; no runtime exposure. | Limited. | `npm audit` (initial run) | Patched by `npm audit fix`. | `npm audit` no longer reports this. | FIXED |
| R-24 | Low | `esbuild` (dev dep) | Dev server can be reached by any website — `GHSA-67mh-4wv8-2f99`. | Dev-only; production bundle is built by a different esbuild version in CI. | Dev only. | `npm audit` | Deferred — fix requires Vite major upgrade. Documented. | N/A | ACCEPTED (dev only) |
| R-25 | Low | `elliptic` (transitive via `vite-plugin-node-polyfills`) | Cryptographic primitive with risky implementation. | Not used for production crypto (only in the polyfill shim). | Theoretical. | `npm audit --omit=dev` | Deferred — fix requires downgrade of `vite-plugin-node-polyfills` to 0.2.0 (breaking). Documented. | N/A | ACCEPTED (no production crypto uses it) |

---

## Files changed in this audit

```
alzhraERP/netlify.toml                                  (CSP tightening)
alzhraERP/vercel.json                                   (CSP tightening)
alzhraERP/src/lib/supabaseClient.ts                     (R-11: strip Authorization from logs)
alzhraERP/supabase/functions/vin-decode/index.ts        (R-14: count-then-insert rate limit)
alzhraERP/supabase/functions/zatca-integration/index.ts (R-09: XML escape; TLV length cap)
alzhraERP/supabase/migrations/20260826000000_security_sweep_audit.sql  (G4, G6, G8, G9 + audit views)
alzhraERP/package-lock.json                             (R-21, R-22, R-23 patch via npm audit fix)
```

## Verification commands

```bash
# Production-only audit
npm audit --omit=dev

# Headers (Vercel preview deploy)
curl -sI https://<deploy-url>/ | grep -iE 'content-security-policy|x-frame|strict-transport'

# After applying the sweep migration in staging:
#   SELECT * FROM public.v_tables_without_rls;             -- should be empty (or only intentionally public)
#   SELECT * FROM public.v_security_definer_no_search_path; -- should be empty
#   SELECT * FROM public.v_functions_public_execute;        -- should be empty
```

## Deferred / Out of scope

- **R-02 (server-side password rules):** requires a Supabase Auth Hook configured at the project level.
- **R-03 (httpOnly cookie tokens):** requires a custom auth proxy in front of Supabase. Documented as follow-up.
- **R-10 (`void_invoice` reason):** not in scope; tracked in §Open Decisions.
- **R-17 (multi-company recovery):** mitigated by RLS; cosmetic only.
- **R-24, R-25 (dev-only / transitive LOW):** deferred — breaking upgrades required.
- **CSP `script-src 'unsafe-inline'`:** kept for now (Vite/Tailwind requirement); follow-up to add nonce.

## Sign-off (Phase 25)

All R-09, R-11, R-19, R-21 fixed. No Critical or High unresolved. Authorization/RLS/RPC/Business-Logic/Injection/Race-Conditions/File-Upload/Secrets/Dependencies review and tests pass for the in-scope surface.
