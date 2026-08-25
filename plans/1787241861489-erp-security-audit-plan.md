# Security Hardening & Full Application Security Audit — Al-Zahra ERP

## 0. Mission Summary

Conduct a read-only, evidence-based security audit across Frontend, Supabase (Postgres + RLS + RPC + Edge Functions), Storage, Auth, Realtime, Build/Deploy, and Dependencies. Then deliver prioritized fixes, regression-tested, with proof of remediation.

The system already has **substantial hardening** in place (RLS on 156 tables, 391 policies, 286 functions, tenant isolation, role permissions, multi-tenant scoping fixes dated 2026-08-19 → 2026-08-25). This audit **builds on** that work — it does not re-do it — and focuses on the residual gaps and emerging attack surface.

## 1. Reconnaissance — What We Know

**Stack**
- React 19 + Vite 5 + TypeScript (strict), React Query 5, Zustand 5, Zod 3, React Router 7 (HashRouter).
- Supabase: Postgres + Auth + Storage + Realtime + Edge Functions (Deno).
- Deployment: Vercel (`vercel.json` with CSP) and Netlify (`netlify.toml`) configured; same SPA, two possible hosts.

**Critical files (already reviewed)**
- `src/lib/supabaseClient.ts` — typed client, anon key only, localStorage persistence, network circuit breaker. **R-11: `console.warn` in retry path logs full `options` including the `Authorization` header.**
- `src/features/auth/{store,hooks,components,api}.ts` — Zustand store; `isAuthenticated` NOT persisted (QA-2026-003 fix); optimistic UI from `user`; `usePermission` calls `has_permission` RPC with `p_company_id`; offline fallback to legacy map (fail-closed on real denial).
- `src/app/routes.tsx` — `AuthGuard` / `GuestGuard` wrap everything; `FeatureBoundary` is Suspense + ErrorBoundary only (not a security boundary).
- `src/features/inventory/components/ProductDetailModal.tsx:44` — `style.innerHTML = \`...\`` is **hardcoded print CSS**, not user input → **not XSS**.
- `vercel.json` / `netlify.toml` — HSTS, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, CSP (with `'unsafe-inline'` and `'unsafe-eval'` in `script-src` and `'unsafe-inline'` in `style-src` — major relaxation).
- `.env.example` — explicitly warns against VITE_-prefixed AI keys; only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are public.

**Database baseline (`2026081900000{1,2,3}*` + 18+ hardening migrations)**
- 156 tables, 286 public functions, 20 views, 194 triggers, 391 RLS policies.
- Tenant guard: `public.fn_assert_company_access(p_company_id)`; `public.verify_company_access(p_company_id)`; `public.get_user_role()`; `public.user_is_admin_or_manager()`; `public.get_user_company_id()`; `public.get_auth_companies()`.
- Permission gate: `public.has_permission(p_permission, p_company_id)`; `public.get_user_permissions(p_company_id)` (company-scoped overload 20260822000001).
- `SECURITY DEFINER` is consistent; `SET search_path TO 'public'` or `''` is consistent; privilege pattern `REVOKE … FROM anon, PUBLIC; GRANT … TO authenticated` is consistent in recent migrations.
- Existing security fixes already closed: C1/C2 cross-tenant reports (20260819000010), invitation privilege escalation (20260821000001), debt module cross-tenant (20260823000001), supplier portal (20260825000004), chat recursion (20260825000007), get_user_permissions tenant scoping (20260822000001).

**Edge Functions**
- `send-notification`, `part-search`, `vin-decode`, `vin-parts`, `zatca-integration` — all enforce auth via `getUser(token)`, have CORS allow-list (sandbox origin as default), rate limiting on AI path, and ZATCA fails closed.

**Auth**
- Password rules: ≥8 chars + 1 uppercase + 1 digit (**client-side only** — see R-02).
- `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, storage = `localStorage` (see R-03).

## 2. Methodology — Discover → Test → Fix → Re-test → Document

For each of the 25 phases, the work unit is:

1. **Read** the relevant source / migration / config.
2. **Enumerate** findings with file:line and attack vector.
3. **Test** the live surface only inside authorized staging / via SQL functions that are idempotent and read-only where possible. No destructive calls against production data.
4. **Fix** with a focused, additive migration or config change.
5. **Re-test** the same attack and capture PASS/FAIL.
6. **Document** in the Vulnerability Matrix (§9).

## 3. Phase Plan (ordered, evidence-gated)

### Phase 1 — Architecture Trust Map (read-only)
- Build the data-flow diagram: Browser → React → Supabase client → PostgREST / Realtime / Storage / Edge Functions → Postgres (RLS, SECURITY DEFINER, triggers).
- Enumerate every entry point: 50+ `.rpc(...)` call sites, `from(...).select/insert/update/delete`, `storage.from(...).upload/download`, `channel(...).on('postgres_changes', ...).subscribe`, Edge Function URLs.
- Output: `docs/decisions/ADR-012-trust-boundaries.md` + an inventory table.

### Phase 2 — Authentication
- Verify session lifecycle: `getSession`, `onAuthStateChange`, refresh, logout (local + server). Already correct in `store.ts`.
- Check password reset flow, email verification, "remember me" (none), concurrent sessions.
- Brute-force: confirm Supabase Auth rate limits in project settings (read-only via dashboard).
- Test: anon → protected page → 401 from every RPC that requires auth.

### Phase 3 — Authorization / RBAC
- Re-test the 4 test-cases from the brief for every RPC in the baseline: anon, cross-tenant, cross-user, insufficient role.
- Spot-check: `usePermission` sends `p_company_id`; fallback map is fail-closed on real denials.
- Verify role-bypass attack (`user.role = 'admin'` in localStorage does **not** elevate — already mitigated by `isAuthenticated` not persisted).

### Phase 4 — Multi-Tenant / Branch Isolation
- For every table with `company_id`, confirm a policy exists. Generate a script:
  ```sql
  SELECT c.relname, c.relrowsecurity,
    (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) AS pols
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
  ORDER BY c.relrowsecurity, c.relname;
  ```
  Any `relrowsecurity=false` business table → **CRITICAL**.
- Storage buckets: enumerate buckets and their policies.

### Phase 5 — SQL Injection
- Grep for `EXECUTE format`, `EXECUTE '`, `concat('SELECT…', $1)`, `query(` raw, `rpc('` followed by dynamic names. Already verified `format('%I …', idx_name, tbl, cols)` uses `%I` (safe) and `format('%I …', t)` for `DROP TRIGGER` (safe).
- Test every text-accepting RPC with `' OR '1'='1`, `';--`, `\\`, array JSON payloads.
- Threats: search filters (`ilike %q%`), sort columns (`order=column.asc` mapped to `ORDER BY`), reports date params.

### Phase 6 — XSS
- `dangerouslySetInnerHTML` and `innerHTML`: 0 in product code, 1 hardcoded print CSS (safe).
- Search for: `v-html`, `dompurify`, Markdown renderers, chat message renderers, ReactMarkdown, `marked`, `sanitize-html`.
- Threats: party name, product name_ar, notes, chat message bodies, supplier notes.
- Fix direction: render text as text; if Markdown is needed, sanitize server-side at insert.

### Phase 7 — CSRF / Request Integrity
- Supabase uses bearer JWT (not cookies) → classic CSRF N/A. Confirm `persistSession: true` + `localStorage` keeps the token out of automatic cookie sending. Already correct.
- Add defense-in-depth: document that all state-changing endpoints go through RPC; no GET-as-state-change anywhere; double-submit pattern only needed if cookies are introduced.

### Phase 8 — API Security
- Enumerate every RPC called from the client. For each, fill: auth? role? tenant? branch? input validation? rate-limit? audit log?
- Per-RPC pass: read its body, confirm `auth.uid()` gate (or explicit `RAISE EXCEPTION` for missing), `fn_assert_company_access`, parameter validation, `EXCEPTION WHEN OTHERS` blocks (which can swallow real errors — flag any).
- Mass-assignment: any RPC that accepts a `jsonb` and spreads it into INSERT/UPDATE? Already validated in supplier portal hardening; audit others.

### Phase 9 — Supabase-Specific
- RLS: see Phase 4.
- SECURITY DEFINER: every function (286 baseline + 20+ new) must have `SET search_path`. Grep `CREATE.*FUNCTION` then `SET search_path` within 30 lines → must be 100%.
- `EXECUTE` grants: every public function should be `REVOKE … FROM anon, PUBLIC; GRANT … TO authenticated` unless intentionally open.
- Service role: never in client bundle (already correct — `VITE_*` only).
- Realtime: confirm `supabase_realtime` publication only includes intended tables; `chat_*` correctly added in 20260825000007.

### Phase 10 — PostgreSQL Privileges
- Final query:
  ```sql
  SELECT grantee, table_schema, string_agg(privilege_type, ',') FROM information_schema.role_table_grants
  WHERE table_schema='public' GROUP BY 1,2 ORDER BY 1;
  ```
- Expected: `anon = (none)`, `authenticated = SELECT-only` on most tables, all writes via SECURITY DEFINER functions.
- Sequences: `USAGE` on `journal_entry_number_seq` and `staging_jaafari_import_id_seq` only to `authenticated` (none needed; functions own them).

### Phase 11 — SECURITY DEFINER Audit
- Re-read every SECURITY DEFINER function in migrations from `20260819000001..20260825000007` and the baseline snapshot.
- Per function record: owner, `search_path`, first-action `auth.uid()` check, company/branch access check, dynamic SQL present, EXECUTE grant.
- Flag any with: no `auth.uid()` check, no company check, `search_path` unset, dynamic SQL with `format` (must use `%I`/`%L`), granted to `PUBLIC`.

### Phase 12 — Business Logic
- Financial: confirm `commit_sales_invoice_v2`, `commit_purchase_invoice`, `void_invoice`, `void_bond`, `fn_reverse_journal_entries` recalculate server-side (already true for `submit_vendor_quotation_revision` after SEC-01).
- Inventory: stock adjustment RPCs (`quick_adjust_stock_batch` already hardened 20260825000002) — confirm `FOR UPDATE` row-lock on the stock row inside the transaction.
- Idempotency: any function that creates a record from a client request without an idempotency key. Check the `idempotency_key` column added in `20260816000005`.
- Cancellation paths: who can void a posted invoice, an expense, a journal entry, a payment, a PO? Document and restrict.
- Currency: `exchange_rate` must be a server input, not a client input — audit.

### Phase 13 — Race Conditions
- Stock decrement: must be `SELECT … FOR UPDATE` on `product_stock` row, or atomic `UPDATE … SET qty = qty - $1 WHERE qty >= $1`.
- Invoice numbering: `get_next_sequence` already locked (20260819000013). Verify.
- Quotation → PO conversion: already uses `FOR UPDATE` (20260825000004). Verify others (PO → GRN → Invoice, payment posting).
- Test plan: `BEGIN; … COMMIT` concurrency probes for the top 10 financial flows.

### Phase 14 — Input Validation
- For every text param: length cap, trim, control-char strip.
- Numeric: range + non-negative where applicable (already true in `submit_vendor_quotation_revision`).
- UUID: `::uuid` cast fails on bad input → 22P02 (acceptable as long as it bubbles up).
- Date: `p_from <= p_to`.
- Arrays / jsonb: depth limit + size limit at edge.
- File: see Phase 15.

### Phase 15 — File Upload / Storage
- Storage buckets: list and audit each policy. Likely buckets: `attachments`, `avatars`, `company-assets`, `invoices`. Each must have `auth.uid()`-scoped SELECT/INSERT and tenant-scoped path.
- Validation: MIME via `OPTIONS` + magic bytes (8-byte sniff) for `image/*`, `application/pdf`. Block `image/svg+xml` (XSS via SVG). Block `.exe`, `.html`, `.htm`, `.js`, `.svg`.
- Size cap: 10 MB images, 25 MB PDFs (confirm).
- Path traversal: ban `..` and `\` in filename; rewrite to `uuid.ext`.
- Public URLs: only for public buckets; never for invoices/attachments.

### Phase 16 — Secrets & Environment
- Grep the full source tree (excluding `node_modules`, `dist`) for: `sk-`, `sbp_`, `AIza`, `Bearer ey`, `service_role`, `x-supabase`, `OPENROUTER_API_KEY=`, `DEEPSEEK_API_KEY=`, `FAPI_API_KEY=`, `ZATCA_AUTH_TOKEN=`.
- Confirm only the placeholder values exist in `.env.example` and nothing real is committed.
- Bundle audit: `npm run build:analyze` and search `dist/assets/*.js` for the same patterns.
- Git history: `git log -p -- .env*` (do not commit secrets going forward).
- Frontend bundle: only anon key should appear. Confirm.

### Phase 17 — Dependencies
- `npm audit --omit=dev` and `npm audit` (dev). Capture the JSON.
- For each High/Critical: decide to upgrade, pin+patch, or accept with justification. Avoid breaking-change upgrades.
- Lockfile drift: confirm `package-lock.json` is committed and not from `--no-save` installs.

### Phase 18 — Security Headers
- Current CSP allows `'unsafe-inline'` and `'unsafe-eval'` in `script-src` — required by Vite dev and currently copied to prod. Long-term: remove both, rely on SHA-256 hashes for the few inline strings (none in this codebase). Short-term: tighten the **connect-src** allow-list to the exact Supabase ref + the exact AI providers, not `*.openrouter.ai` (which is wildcard — OK in practice but narrower is better). Document and submit PR.
- `Permissions-Policy`: already restrictive (`camera=(self)`, `microphone=()`, `geolocation=()`). Keep.
- `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self'` in CSP (add it for parity).

### Phase 19 — Error Handling
- `console.error` and `console.log` in production: 30+ matches in `src/scripts/*` and `src/lib/supabaseClient.ts:267` (config error, intentional). Acceptable because they never log user data **except** the retry path that logs the full request `options` (R-11).
- The `createLogger`/`logger` wrapper should default to no-op in prod for `debug`/`info`. Verify.
- ErrorBoundary fallback: must not leak stack traces — confirm in `src/core/components/ErrorBoundary.tsx`.

### Phase 20 — Logging & Audit Trail
- `audit_logs` table exists. Verify that all Phase 12 flows insert rows.
- Triggers: `audit_sessions`, `audit_items` (stock audit) — confirm coverage.
- Verify `procurement_audit_logs` (added 20260825000003) is in `supabase_realtime` if needed.
- Log content must not contain: password, full JWT, API key, full credit card, customer tax number (mask).

### Phase 21 — Rate Limiting
- Inventory of rate-limited surfaces: login (Supabase native), password reset (Supabase native), AI endpoints (already 30/min/user in `vin-decode`), notification (60/min/company in `send-notification`), part-search (none — add), search RPCs (none — add coarse cap via `api_rate_limits` table which already exists).
- SQL helper: `public.check_rate_limit(p_company_id, p_endpoint, p_max, p_window)` already exists (used by `send-notification`). Extend its use to other expensive RPCs.

### Phase 22 — Frontend
- `localStorage` usage: `auth_token`, `user_data`, `company_data`, `theme`, `language`, `sidebar_collapsed`, `last_invoice_number`, `alz_auto_backup`, `alz_backup_logs`, `invoice_col_widths`, `ai_model`, `persist-cols`.
- **Risk**: `user_data` / `auth_token` in localStorage is XSS-readable. Acceptable because there is no known XSS sink and tokens are short-lived, but document and consider httpOnly cookies via a future `proxy` Edge Function.
- Source maps: ensure Vite emits `hidden-source-map` in prod, NOT `source-map`. Check `vite.config.ts`.
- Debug code: `import.meta.env.DEV` guards — confirm.
- Hidden admin pages: none found; all routes are explicit.

### Phase 23 — Security Testing
- Build a SQL test harness under `supabase/tests/` (already has `test_accounting_accuracy.sql`; add `test_security_authorization.sql`, `test_rls_isolation.sql`, `test_race_conditions.sql`).
- Each test: `BEGIN; SAVEPOINT; … ROLLBACK TO SAVEPOINT;` so no production mutation persists.
- Use `set_config('request.jwt.claims', json_build_object('sub', …)::text, true)` to switch users inside a session.

### Phase 24 — Regression
- After every fix: re-run `npm run test`, `npm run test:e2e` (procurement-to-pos-lifecycle, etc.), the SQL security tests, and a smoke script.
- If a fix breaks business logic: revert + record in §10.

### Phase 25 — Security Gate
- Production-ready only when: 0 Critical, 0 unresolved High, all authorization tests pass, all RLS tests pass, all RPC tests pass, business-logic tests pass, race-condition tests pass, file-upload tests pass, secrets scan clean, dependencies at acceptable level, regression green.

## 4. Prioritized Risk Backlog (initial hypothesis, to be confirmed in Phase 1)

| # | Area | Suspected risk | Severity | Confidence |
|---|---|---|---|---|
| R-01 | CSP | `script-src 'unsafe-inline' 'unsafe-eval'` in prod | Medium | High |
| R-02 | Auth | Password complexity enforced **client-side only** in `useRegister` | Medium | High |
| R-03 | Session | Tokens in `localStorage` (XSS-readable) | Medium | High |
| R-04 | RLS | Some tables may still be `rowsecurity = false` (e.g. lookups) | High | Med |
| R-05 | RPC | `has_permission` 1-arg overload still callable — used as fallback in some hooks | Med | High |
| R-06 | RPC | `assertPermission` falls back to client map if RPC throws **non-permission** error | Med | High |
| R-07 | Edge Functions | `send-notification` accepts `image_base64` up to 2.8MB — DoS if flooded | Low | Med |
| R-08 | Edge Functions | CORS allow-list uses sandbox origin as default for unknown origins → may cause confusing CORS but no bypass | Info | High |
| R-09 | ZATCA | UBL XML interpolation of `company.name_ar`, `party.name`, `party.tax_number` — XML injection if name contains `<` | High | Med |
| R-10 | Business | `void_invoice` may need a "reason" audit field (existing `return_reason` for returns; verify void path) | Med | Med |
| R-11 | Logging | `console.warn` in `supabaseClient.ts` retries logs full request options including `Authorization` header → visible in browser console | **High** | High |
| R-12 | Storage | Bucket policies for `attachments` and others not yet reviewed | Med | Med |
| R-13 | Frontend | `innerHTML` in `ProductDetailModal` (hardcoded — safe) but pattern present; document to prevent copy-paste | Info | High |
| R-14 | Edge Function | `ai_request_log` rate-limit check has a race: insert then count → a burst of N requests all pass if the count query is faster than the insert replication | Med | Med |
| R-15 | Chat | `chat_messages.body` rendered as text; verify no Markdown / link autolinker is present | Med | Med |
| R-16 | Realtime | Publication may over-share (any `*` listeners) | Med | Med |
| R-17 | Perms | `user_company_roles` for the user is fetched with `.limit(1)` during recovery — the chosen row may not match the active company | Med | High |
| R-18 | RPC | `admin_recalculate_all_stock` — owner-only check present; `auth.uid()` is the JWT, not a parameter → **OK** | — | — |
| R-19 | Idempotency | `idempotency_key` column added 20260816000005 — confirm it's enforced via UNIQUE constraint on (company_id, key, action) | Med | Med |
| R-20 | CSP | `connect-src` allows `https://vercel.com` (broad) — tighten | Low | High |

## 5. Fix Plan — Grouped, Additive, Idempotent

Each group is a single migration (DB) or PR (frontend) that can be reverted independently.

**G1 — Headers & Build (frontend, no DB)** — ship first, addresses R-01, R-11, R-20.
- Tighten `vercel.json` CSP: remove `'unsafe-eval'`; keep `'unsafe-inline'` for style (Tailwind/Vite) but document the trade-off; add `frame-ancestors 'self'`.
- Vite: emit `hidden-source-map` in prod.
- Strip `Authorization` header from any client-side `console.warn` in `supabaseClient.ts` (R-11).

**G2 — Auth hardening (frontend)** — addresses R-02.
- Move password-complexity check server-side via a Supabase Auth Hook (`validate_password_strength`) so it cannot be bypassed by editing JS. Falls back to client-side UX hints.

**G3 — RLS coverage (DB)** — addresses R-04.
- One migration that runs the Phase 4 query and either enables RLS or documents why a table is intentionally public (e.g. `currencies` lookup). Target: 0 tables with RLS=false unless explicitly listed.

**G4 — Function hardening sweep (DB)** — addresses R-05, R-06.
- For every public function in the baseline snapshot: ensure `SET search_path` and `REVOKE … FROM anon, PUBLIC; GRANT … TO authenticated`. Use `pg_proc` to find functions missing one or the other. Produce `20260826000000_grants_search_path_sweep.sql`.

**G5 — ZATCA XML escaping (Edge Function)** — addresses R-09. **Ship together with G1.**
- Replace `${...}` in `generateUBLXML` with `escapeXml()`.

**G6 — Idempotency (DB)** — addresses R-19.
- Confirm `UNIQUE (company_id, action, idempotency_key)` and have `commit_sales_invoice_v2` etc. reject on conflict. Document the contract for the client.

**G7 — Rate limiting (DB + Edge Functions)** — addresses R-07, R-14.
- Add `public.check_rate_limit` calls to `part-search` and `commit_*` write paths (per company per minute).
- Fix `ai_request_log` race: count BEFORE insert, or use a `RETURNING` + advisory lock.

**G8 — Storage policies (DB)** — addresses R-12.
- Enumerate buckets, write explicit `storage.objects` policies per bucket and per prefix. Forbid `image/svg+xml` and `text/html` MIME types via a trigger on insert.

**G9 — Chat sanitization (frontend + DB)** — addresses R-15.
- Server-side reject control characters in `chat_messages.body`; render as text only.

**G10 — Dependency updates (frontend)** — addresses Phase 17.
- `npm audit fix` (semver-patch) for non-breaking; targeted upgrades for anything Critical.

## 6. Files / Areas to Inspect (deep dive list)

- `supabase/migrations/20260819000002_baseline_functions.sql` — read every function in this 11K-line file for dynamic SQL, missing `auth.uid()`, missing `fn_assert_company_access`.
- `supabase/migrations/20260819000001_baseline_schema.sql` — confirm every business table has `company_id`.
- `supabase/migrations/20260819000003_baseline_triggers_policies.sql` — confirm RLS is enabled on each table.
- All Edge Functions under `supabase/functions/*/index.ts` (5 files).
- `src/features/**/api/**` — every `.from(...)` and `.rpc(...)` call.
- `src/lib/supabaseClient.ts` — already read; flag R-11.
- `src/features/auth/store.ts` — already read; OK.
- `src/core/hooks/usePermission.ts` — already read; fail-closed on real denials.
- `vercel.json`, `netlify.toml` — already read; R-01, R-20.
- `.env.example` — already read; correct.

## 7. Test Harness to Build (under `supabase/tests/`)

- `test_security_authorization.sql` — cross-tenant read/write/IDOR matrix for the 30 most-used tables.
- `test_rls_coverage.sql` — asserts every `company_id`-bearing table has RLS.
- `test_rpc_privileges.sql` — asserts `pg_proc.proacl` does not include `=X` for `PUBLIC` on user-facing functions.
- `test_idempotency.sql` — double-submit probe.
- `test_race_conditions.sql` — two concurrent `commit_sales_invoice_v2` calls with same idempotency key + different; assert one wins.
- `test_search_path.sql` — list every `SECURITY DEFINER` function and assert `proconfig` includes `search_path`.
- `test_audit_trail.sql` — assert a row appears in `audit_logs` for each critical op.

Each test is `BEGIN … ROLLBACK` safe.

## 8. Validation Plan (per fix)

1. Apply fix in staging.
2. Re-run the failing attack — capture `input` and `actual_result`.
3. Re-run the happy-path test for that feature — capture `expected_result == actual_result`.
4. Append to `docs/security-tests/evidence.md`.

## 9. Vulnerability Matrix (template)

| ID | Sev | Component | Description | Attack | Impact | Evidence | Fix | Verification | Status |
|---|---|---|---|---|---|---|---|---|---|

## 10. Rollback Strategy

- All DB fixes ship as new `20260826*.sql` migrations with `BEGIN; … COMMIT;` so a failed migration aborts atomically.
- All frontend fixes ship in one PR per group (G1, G2, …) so they can be reverted independently.
- Before any DDL: `pg_dump --schema-only` snapshot of the affected schemas.
- No `DROP` on production objects without an explicit `BEGIN; DROP …; COMMIT;` and a tested restore.

## 11. Out of Scope (call out, do not hide)

- Migrating from `localStorage` tokens to httpOnly cookies (large frontend refactor; document as a follow-up ADR).
- Removing `'unsafe-inline'` from `style-src` (would break Tailwind/Vite-generated styles).
- Migrating to a custom auth proxy in front of Supabase.
- Penetration testing by a third party.

## 12. Open Decisions (need user input before G2 ships)

1. **Password rules enforcement layer** — server-side Supabase Auth Hook (recommended) vs. DB-level only vs. client-only with stronger frontend validation. Recommended: **Auth Hook** so it applies to all clients (including future mobile).
2. **CSP relaxation** — remove `'unsafe-inline'` from `script-src` now (breaks the current Vite-generated `<script>` chunks in prod if any) vs. keep + add nonce. Recommended: **keep `'unsafe-inline'` for now, remove `'unsafe-eval'`, and add a `script-src-elem 'self'` with hashes in a follow-up**.
3. **XML escaping in ZATCA** — escape only the user-supplied fields (`party.name`, `party.tax_number`, `invoice.invoice_number`) vs. the full set. Recommended: **escape all interpolated values, period**.
4. **Console logging of network retries** — strip headers entirely (recommended) vs. keep a redacted subset for observability.

## 13. Acceptance Criteria for the Audit to be "Done"

- Vulnerability Matrix fully populated (every row has `Status = FIXED` or `Status = ACCEPTED_WITH_JUSTIFICATION`).
- `docs/security-tests/evidence.md` contains one entry per Critical/High finding with: attack input, expected, actual, PASS.
- Zero `console.*` in production code that prints request headers (R-11 verified gone).
- All `20260826*` migrations applied to staging without errors.
- `npm run test`, `npm run test:e2e`, and `supabase/tests/test_*.sql` all green.
- Final Security Gate (Phase 25) sign-off recorded in `docs/decisions/ADR-013-security-gate.md`.
