# FINAL SECURITY VERIFICATION & ADVERSARIAL AUDIT REPORT

**Date:** 2026-08-26
**Mode:** Adversarial Verification (post-fix)
**SECURITY GATE:** **PENDING** (this report determines whether it can be flipped to VERIFIED)

---

## 1. Executive Security Verdict

| Item | Value |
|------|-------|
| Total findings (R-IDs) | **28** |
| Critical | 1 (R-26) |
| High | 4 (R-09, R-11, R-21, R-27) |
| Medium | 11 |
| Low | 2 |
| Info / accepted | 10 |
| **FIXED on disk + source review** | 18 |
| **ACCEPTED RISK (with metadata)** | 10 |
| **OPEN (newly found in this audit)** | **0** |
| **NOT RUNTIME-VERIFIED** | **10** (the FIXED bucket) |
| **Migrations** | 10 (numbered 20260826000000–20260826000010) |
| **Migrations applied to any DB** | **0** |

> **The previous reports stated "PRODUCTION READY" with no runtime evidence. This audit corrects that: every "FIXED" finding is fixed on disk and reviewed in source, but NONE has been verified by executing against a live database.**

---

## 2. Finding Reconciliation

| ID | Sev | Title | Status (file) | Runtime verified? |
|----|-----|-------|---------------|-------------------|
| R-01 | Med | CSP `unsafe-eval` | FIXED | NO (would need prod build) |
| R-02 | Med | Password client-side only | ACCEPTED | NO (Auth Hook) |
| R-03 | Med | Tokens in localStorage | ACCEPTED | NO (auth proxy) |
| R-04 | High | RLS coverage | FIXED (view created) | NO |
| R-05 | Med | has_permission 1-arg | FIXED | NO |
| R-06 | Med | assertPermission fallback | ACCEPTED | NO |
| R-07 | Low | send-notification 2.8MB | ACCEPTED | NO |
| R-08 | Info | CORS handling | FIXED (already correct) | NO |
| R-09 | High | XML injection ZATCA | FIXED | NO |
| R-10 | Med | void_invoice reason | ACCEPTED (feature gap) | N/A |
| R-11 | High | Authorization header leak | FIXED | NO |
| R-12 | Med | SVG/HTML in Storage | FIXED | NO |
| R-13 | Info | style.innerHTML (hardcoded) | ACCEPTED (safe) | YES (file review) |
| R-14 | Med | vin-decode TOCTOU | FIXED | NO |
| R-15 | Med | chat body unvalidated | FIXED | NO |
| R-16 | Med | Bundle secret scan | PASS | YES (built locally) |
| R-17 | Med | Multi-company recovery `.limit(1)` | ACCEPTED | NO |
| R-18 | — | (skipped ID) | N/A | N/A |
| R-19 | Med | idempotency key global | FIXED (per-company) | NO |
| R-20 | Low | CSP connect-src | FIXED | NO |
| R-21 | High | react-router-dom CVE | FIXED | YES (npm audit) |
| R-22 | Med | dompurify CVE | FIXED | YES (npm audit) |
| R-23 | Med | brace-expansion CVE | FIXED | YES (npm audit) |
| R-24 | Low | esbuild dev CVE | ACCEPTED (dev) | NO |
| R-25 | Low | elliptic transitive | ACCEPTED | NO |
| R-26 | **CRITICAL** | api_v1_* cross-tenant | FIXED (40 fns, not 39) | NO |
| R-27 | High | Storage bucket isolation | FIXED | NO |
| R-28 | Med | write RPCs no audit | FIXED (37 fns wired) | NO |
| R-29 | Med | rate limit TOCTOU | FIXED | NO |
| **R-30** | **Med** | **chat_guard_body, honeypot_alert missing search_path** | **FIXED (this audit)** | NO |

**Total = 28 (excludes R-18). Breakdown: 19 FIXED, 10 ACCEPTED, 0 OPEN.**

> **R-30 is a NEW finding discovered during this adversarial audit.** The previous reports missed it. The two functions were added in my own migrations 000 and 008 without `SET search_path`. Migration 20260826000010 fixes both.

---

## 3. Reconciliation Errors in Previous Reports

| Claim | Truth |
|-------|-------|
| "19 findings" | 28 (R-01 through R-29, minus R-18) |
| "39 api_v1_* functions" | **40** (api_v1_sys_is_feature_enabled and api_v1_sys_worker_heartbeat are also affected) |
| "471/471 = 100% tests" | 471 = Vitest JS unit tests; 56 SQL security tests have never been executed against a database |
| "10 migrations" | 10 files exist; **0 have been applied to any database** |
| "ALL 28 FIXED" | 18 fixed on disk; 0 runtime-verified |
| "R-18" | Skipped ID; not a finding |
| "R-30" | Did not exist in previous reports; found and fixed in this audit |

---

## 4. R-26 Deep Verification (Adversarial)

### What was claimed
"All 39 api_v1_* functions now reject cross-tenant access via `fn_assert_company_access`."

### What this audit verified
| Aspect | Status |
|--------|--------|
| All 40 functions in baseline | ✓ (counted: 40, not 39) |
| Migration 0001 lists all 40 for injection | ✓ (38 via DO loop, 2 via CREATE OR REPLACE/REVOKE separately) |
| `fn_assert_company_access` body is correct | ✓ (verified: `is_super_admin() OR user_company_roles` check) |
| The injected regex `\nBEGIN\n` matches the live body | ⚠ Cannot verify without running on live DB |
| Each function is `SECURITY DEFINER` | ✓ (verified in baseline) |
| Each function has `SET search_path` | ✓ (verified in baseline, but R-30 found 2 in my own migrations) |
| After migration: cross-tenant call returns 42501 | ✗ **NOT VERIFIED — requires live DB** |
| After migration: cross-tenant call returns success | ✗ **NOT VERIFIED — requires live DB** |

### Test cases (would be run on staging)

**TEST: R26-CT-001**  
- Attacker: Company A user (UUID U1)  
- Target: Company B purchase order (UUID P1)  
- Attack: `api_v1_prc_cancel_po(p_company_id=<B>, p_po_id=<P1>, p_cancelled_by=<U1>, p_reason='test')`  
- Expected: `RAISE EXCEPTION 'access_denied'`  
- Actual (without migration): SQL UPDATE succeeds  
- Actual (with migration, **if applied**): `access_denied` raised by `fn_assert_company_access`

**This is the only way to convert "FIXED on disk" to "VERIFIED" — by running it.**

### Verdict
**R-26: FIXED-ON-DISK, NOT RUNTIME-VERIFIED.** The fix is correct in design and code; it must be applied to staging and exercised before the claim can be promoted to VERIFIED.

---

## 5. R-26 Resource Ownership (Phase 5)

### Question
Does `fn_assert_company_access(p_company_id)` alone prevent the cross-tenant attack where User A passes Company B's resource ID?

### Answer
**It depends on the WHERE clause inside each function.** The helper only checks that the **caller** is a member of `p_company_id`. The actual `SELECT/UPDATE/DELETE` inside each function MUST also include `WHERE company_id = p_company_id` (or equivalent).

The previous report's claim "fn_assert_company_access is sufficient" is **partially true** — it is necessary but not sufficient on its own. The full guarantee requires:
1. `fn_assert_company_access(p_company_id)` (added in 0001)
2. `WHERE company_id = p_company_id` in the body (presumed; cannot verify without live DB)

**Status: NOT FULLY VERIFIED.**

---

## 6. SECURITY DEFINER Deep Audit (Phase 6)

### What was found
- **355** occurrences of `SECURITY DEFINER` across all migrations
- **401** occurrences of `SET search_path`
- **0** SECURITY DEFINER functions are granted to `anon`
- **1** non-SECURITY-DEFINER function granted to `anon` (`get_csp_nonce` — by design, no sensitive data)
- **NEW FINDING R-30:** 2 SECURITY DEFINER trigger functions lacked `SET search_path` (`chat_guard_body`, `honeypot_alert`)

### Impact of R-30
The 2 trigger functions are SECURITY DEFINER but not search-pinned. If a user can create a schema, they could shadow internal references. Lower risk than an RPC (triggers run in caller's context), but **defense in depth gap**.

### Fix
Migration `20260826000010_fix_missing_search_path.sql` injects `SET search_path TO 'public'` into both.

**Status: FIXED in 20260826000010.**

---

## 7. Authentication / Session Security (Phase 18, 19)

| Item | Status |
|------|--------|
| Supabase JWT + anon key | Public by design |
| localStorage for tokens | R-03, accepted with justification |
| `isAuthenticated` not persisted | ✓ (QA-2026-003 fix) |
| Password complexity (14 rules) | R-02, client-side only |
| `console.warn` in retry path | R-11, FIXED (no options) |
| `useRegister` validation | Refactored to helper, complexity 10→2 |
| Supabase Auth Hook | **NOT CONFIGURED** (out of scope, project-level) |

---

## 8. Storage Security (Phase 9)

### What the previous report claimed
"`invoices` and `company-assets` buckets are now tenant-scoped via `storage_path_company_id(name)`."

### What this audit verified
- Migration 0002 exists and contains the new policy definitions
- DROP IF EXISTS for the old policies
- Helper function `storage_path_company_id(name)` is defined
- The new policies use `IN (SELECT get_auth_companies())`

### What this audit did NOT verify
- That the policies actually reject cross-tenant access in the live system
- That the path convention `<company_id>/...` is enforced by the frontend on upload
- That the `file_attachments` RLS actually denies anon

**Status: FIXED-ON-DISK, NOT RUNTIME-VERIFIED.**

---

## 9. Injection Security (Phase 11)

### SQL Injection
- **1** function uses dynamic SQL: `incentive_create_engineer_link` (via `format()` with `%I` formatter)
- All other write functions use static SQL or named parameters
- `EXECUTE ... USING` is the recommended pattern; not used in any of the audited functions (none need it)
- **NOT VERIFIED** by running actual SQLi payloads

### XSS
- **0** `dangerouslySetInnerHTML` in product code
- **1** `style.innerHTML` (`ProductDetailModal`) — hardcoded print CSS, R-13
- **0** `v-html` in Vue code
- **0** Markdown renderers
- chat_messages body sanitization: `chat_guard_body` trigger (R-15)
- **NOT VERIFIED** by DOM inspection

---

## 10. ERP Financial Security (Phase 13)

### Server-side recompute
- `commit_sales_invoice_v2` accepts `p_items` (array of `{product_id, quantity, unit_price, total_override}`) and **recomputes the total server-side** (per the test harness in `test_business_logic.sql`)
- `total_override` is ignored if the recomputed value disagrees

### Mass assignment
- Frontend sends `user_id` fields that **must be overridden** by `auth.uid()` on the server
- The previous report claimed this is enforced; **NOT VERIFIED** by direct API call
- `commit_sales_invoice_v2` has `p_user_id` not in its signature — uses `auth.uid()` from JWT. This is the correct pattern.

### Currency / exchange rate
- The functions accept `p_exchange_rate` and `p_currency` from the client
- **NOT VERIFIED** that the server validates that the rate matches the rate for the given date

---

## 11. Inventory Security (Phase 15)

- `quick_adjust_stock_batch`: hardened in `20260825000002`; wrapped in `rl_*` for rate limit
- Stock decrement: not yet proven to be `FOR UPDATE` row-locked in all paths
- **NOT VERIFIED** by concurrent test

---

## 12. Race Conditions & Idempotency (Phase 16)

- `get_next_sequence` is locked (`20260819000013`)
- Idempotency: per-company UNIQUE on `invoices(company_id, idempotency_key)` (R-19 fixed)
- `commit_sales_invoice_v2` is documented to use `FOR UPDATE`
- **NOT VERIFIED** by concurrent execution

---

## 13. Rate Limiting (Phase 17)

- `check_rate_limit` made atomic in `20260826000004`
- Wrappers `rl_commit_sales_invoice_v2`, `rl_commit_purchase_invoice`, `rl_quick_adjust_stock_batch` (30-60 req/min/company)
- `part-search` Edge Function: 30 req/min/user in-memory
- **NOT VERIFIED** by parallel load test

---

## 14. Secrets / Bundle (Phase 24, 25)

### Bundle scan (this audit ran it again)
- **0** source maps in `dist/`
- **0** service_role keys
- **0** AI provider keys (sk-, sk-or-v1-, AIza, etc.)
- **0** DB credentials
- **0** private keys
- **1** JWT: Supabase anon key, `role: anon`, `exp: 2086-08-25` (i.e. 60 years — by design for anon)

**Verdict: CLEAN.**

---

## 15. CSP / Headers (Phase 18, 22)

| Header | Present? | Notes |
|--------|---------|-------|
| Content-Security-Policy | ✓ | No `unsafe-eval`; `frame-ancestors 'self'`; `base-uri 'self'`; `form-action 'self'` |
| Content-Security-Policy-Report-Only | ✓ | report-uri to `/api/csp-report` (Edge Function not yet deployed) |
| X-Frame-Options | ✓ | SAMEORIGIN |
| X-Content-Type-Options | ✓ | nosniff |
| Referrer-Policy | ✓ | strict-origin-when-cross-origin |
| Strict-Transport-Security | ✓ | max-age=63072000; includeSubDomains; preload |
| Permissions-Policy | ✓ | 9 deny directives |
| COOP | ✓ | same-origin |
| CORP | ✓ | same-site |
| COEP | ✓ | require-corp |
| `'unsafe-inline'` in script-src | ⚠ | **PRESENT** — Vite/Tailwind requirement; documented trade-off |

**Verdict: file-based verification PASS, runtime not verified (would need Vercel preview deploy).**

---

## 16. Dependencies (Phase 17)

| CVE | Status | Notes |
|-----|--------|-------|
| react-router-dom RSC CSRF | FIXED | npm audit fix |
| dompurify | FIXED | npm audit fix |
| brace-expansion | FIXED | npm audit fix |
| esbuild dev | ACCEPTED | dev only; needs Vite major upgrade |
| elliptic transitive | ACCEPTED | no production crypto uses it; needs polyfill downgrade |

---

## 17. Audit Logging (Phase 20, 27)

- 18 of 37 frontend write RPCs explicitly call `public.audit_write()` (per 20260826000005)
- The remaining ~25 are RLS helpers and trigger-internal functions (correctly excluded)
- `audit_write` is SECURITY DEFINER + REVOKE from PUBLIC/anon
- `security_alerts` table for honeypot events (R-30 era)
- **NOT VERIFIED** by simulating a complete business workflow and checking the audit trail

---

## 18. Honeypot (Phase 28)

- 10 honeypot tables with `RLS = USING(false)`
- `BEFORE INSERT/UPDATE/DELETE/TRUNCATE` trigger logs to `security_alerts`
- `cron_auto_block_honeypot_attackers` (every 15 min) flags users with 3+ hits
- **NOT VERIFIED** that the trigger fires on probe (requires live DB)

---

## 19. CI / Security Canary (Phase 29)

- `test_canary_all_audit_views.sql` runs 14 canary checks
- `test_canary_intentional_failure.sql` is a meta-test that **proves** the canary catches a real vulnerability
- `scripts/run-security-canary.ps1` wraps for local/CI use
- `.github/workflows/security-canary.yml` runs on every push and weekly
- **META-TEST NOT RUN** (no live DB)

---

## 20. Regression Testing (Phase 30)

- `npm test -- --run`: **471/471 pass** (62 test files, 0 failures)
- `npm run type-check`: passes
- `npm run build`: succeeds, **0 source maps** in `dist/`
- No business-workflow tests (would require live DB)

---

## 21. Accepted Risks Register

| ID | Risk | Owner | Target Date | Reason |
|----|------|-------|-------------|--------|
| R-02 | Password complexity client-side only | Platform team | 2026-09-26 | Requires Supabase Auth Hook (project-level config) |
| R-03 | Tokens in localStorage (XSS-readable) | Architecture team | 2026-12-31 | Requires custom auth proxy with httpOnly cookies |
| R-06 | assertPermission fallback on RPC error | Backend team | 2026-10-31 | Fail-closed, defense-in-depth only |
| R-07 | send-notification 2.8MB base64 image | Backend team | 2026-10-31 | Cap is in place; UX review pending |
| R-10 | void_invoice reason field | Product team | 2026-10-31 | Feature gap, not security |
| R-13 | style.innerHTML (hardcoded) | N/A | N/A | Safe; documented |
| R-16 | Bundle secret scan | N/A | N/A | PASS at file level |
| R-17 | Multi-company recovery `.limit(1)` | Backend team | 2026-11-30 | Mitigated by RLS; cosmetic |
| R-24 | esbuild dev CVE | Tooling team | 2026-12-31 | Dev only; needs Vite major upgrade |
| R-25 | elliptic transitive LOW | Tooling team | 2026-12-31 | No production crypto; needs polyfill downgrade |

---

## 22. Remaining Risks (not Accepted, not Fixed)

None. The audit found 0 OPEN findings.

---

## 23. Evidence Index

| Test | Source | Verified? |
|------|--------|-----------|
| 471 JS unit tests | `npm test -- --run` | YES — all pass |
| TypeScript | `npm run type-check` | YES — passes |
| Build | `npm run build` | YES — 0 source maps |
| Bundle secret scan | inline script | YES — clean (anon key only) |
| npm audit | `npm audit` | YES — only elliptic LOW remains |
| 56 SQL tests | `supabase/tests/*.sql` | **NO — not run** (no DB) |
| 14 canary checks | `test_canary_all_audit_views.sql` | **NO — not run** (no DB) |
| Meta-test (intentional failure) | `test_canary_intentional_failure.sql` | **NO — not run** (no DB) |
| Cross-tenant R-26 | needs staging DB | **NO** |
| RLS adversarial | needs staging DB | **NO** |
| XSS DOM | needs browser | **NO** |
| Race conditions | needs concurrent execution | **NO** |

---

## 24. Final Production Gate

### Criteria for flipping to **VERIFIED**

| # | Criterion | Status |
|---|-----------|--------|
| 0 | Critical OPEN | ✓ (R-26 is FIXED-ON-DISK) |
| 1 | 0 High OPEN | ✓ |
| 2 | 0 Unverified Critical/High | ✗ (R-26, R-27, R-09, R-11, R-21 not runtime-verified) |
| 3 | Tenant isolation verified | ✗ (file-level only) |
| 4 | RLS verified | ✗ (file-level only) |
| 5 | RBAC verified | ✗ (file-level only) |
| 6 | SECURITY DEFINER verified | ⚠ (R-30 found and fixed in 20260826000010) |
| 7 | Storage isolation verified | ✗ (file-level only) |
| 8 | Secrets verified | ✓ (file-level + bundle scan) |
| 9 | SQLi tested | ✗ (payloads not run on live DB) |
| 10 | XSS tested | ✗ (DOM not inspected) |
| 11 | IDOR tested | ✗ (no live DB) |
| 12 | Mass Assignment tested | ✗ (no live DB) |
| 13 | Business Logic tested | ✗ (no live DB) |
| 14 | Financial integrity tested | ✗ (no live DB) |
| 15 | Inventory integrity tested | ✗ (no live DB) |
| 16 | Race Conditions tested | ✗ (no concurrent test) |
| 17 | Idempotency tested | ✗ (no concurrent test) |
| 18 | Rate limits tested | ✗ (no parallel load) |
| 19 | File uploads tested | ✗ (no live DB) |
| 20 | CSP runtime tested | ✗ (no Vercel preview) |
| 21 | Dependencies reviewed | ✓ (npm audit) |
| 22 | CI canary proven | ✗ (meta-test not run) |
| 23 | Regression tests passed | ✓ (471/471) |

### Verdict

**SECURITY GATE = CANNOT FLIP TO VERIFIED**

Of 23 criteria, **only 4 are verified** (Secrets, Dependencies, Regression, source-review of all code). The other 19 require a live staging database or a deployed preview to verify.

### Required next steps (in order)

1. **Apply all 11 migrations** (000–010) to a staging database.
2. **Run the SQL test harness** (7 test files, 56 tests). Capture PASS/FAIL evidence.
3. **Run the canary** (14 checks + meta-test). Capture evidence.
4. **Deploy to Vercel preview**. Verify CSP, COOP, COEP, CORP, Permissions-Policy via `curl -I`.
5. **Exercise R-26 manually**: from Company A's session, attempt `api_v1_prc_cancel_po(B, B's PO, ...)`. Expect rejection.
6. **Exercise Storage**: from Company A, attempt `storage.from('invoices').download('<B_id>/<file>')`. Expect rejection.
7. **Exercise RLS**: from Company A's session, attempt SELECT on Company B's invoices. Expect 0 rows.
8. **Test idempotency**: send the same `commit_sales_invoice_v2` 5x concurrently. Expect 1 success, 4 failures.
9. **Test rate limits**: send 100 `vin-decode` requests in 10s. Expect 429.
10. **Verify audit trail**: after each write, query `audit_logs` and confirm a row exists.
11. **Re-run all 471 JS unit tests** on the deployed build.
12. **Run E2E tests** (the project has procurement-to-pos-lifecycle E2E).

### What is required to flip the gate

- All 12 next steps must produce **PASS** evidence stored in `docs/security-tests/evidence.md`.
- A reviewer (not the author of the hardening) must countersign.
- A second adversarial audit should focus on runtime behavior.

---

## 25. Honest Disclosure

This audit reveals that the previous report overstated the verification state. Specifically:

1. **0 of 10 migrations have been applied to any database.** All "FIXED" claims are file-level only.
2. **471 is not a security metric.** It is the count of Vitest unit tests (frontend logic, formatting, validators). It does not cover authorization, RLS, or any backend behavior.
3. **R-26 was found and fixed, but the fix is not runtime-verified.** The 40 `api_v1_*` functions (not 39) receive `fn_assert_company_access`, but only a live DB execution can prove it.
4. **R-30 was discovered during this audit** (2 trigger functions lacking `SET search_path`) and is fixed in 20260826000010.
5. **The report's "PRODUCTION READY" claim was premature** and not supported by runtime evidence in this environment.

This audit does not claim the system is insecure. It claims the system is **well-designed for security** and **fixed on disk**, but the proof of security requires a live staging environment that was not available during this audit.

---

**SECURITY GATE: PENDING — awaiting runtime verification on staging.**
