# ADR-007 — Unify Query Cache & Harden ZATCA Edge Function

**Status:** Accepted
**Date:** 2026-08-18
**Relates to:** ADR-002 (RLS tenant isolation), ADR-004 (VIN security hardening), `docs/frontend-backend-deep-audit-2026-08-15.md`

---

## Context

The 2026-08-18 audit found two critical issues:

1. **Logout did not clear the real persisted cache.** The app created **two separate
   `QueryClient` instances**: the one wired into `ReactQueryProvider`
   (`src/core/lib/react-query.tsx`, custom IndexedDB persister keyed
   `alzhra-query-cache`) and a second one used only by `src/features/auth/store.ts`
   (`src/lib/queryClient.ts` + `src/lib/persister.ts`, keyed
   `AL_ZAHRA_OFFLINE_CACHE`). On logout, `auth/store.ts` called
   `queryClient.clear()` and `persister.removeClient()` on the *unused* client,
   leaving the real IndexedDB cache intact. On shared devices a subsequent user
   could be rehydrated with the previous user's financial data
   (`refetchOnMount: false`, `staleTime` up to 15 min). The `buster` for the
   real cache was also bypassed because it was set on the wrong client.

2. **The `zatca-integration` Edge Function was unauthenticated and fail-open.**
   It accepted any caller (`Access-Control-Allow-Origin: *`), performed no JWT
   check, and — when `ZATCA_AUTH_TOKEN` was missing — **simulated a successful
   clearance** (`clearanceStatus: "CLEARED"`) instead of failing. It also wrote
   to `audit_logs` with columns that do not exist (`table_name`, `record_id`,
   `changes`) and trusted client-supplied amounts.

---

## Decision

### 1. One QueryClient + one Persister for the whole app

- `src/lib/queryClient.ts` is now the **single source of truth**: it exports the
  shared `queryClient` (5 min stale, auth-aware retry, `networkMode: 'always'`
  for mutations so the offline queue can enqueue on failure), the shared
  `persister` (`AL_ZAHRA_OFFLINE_CACHE`), and the persistence limits
  `QUERY_PERSIST_MAX_AGE_MS` (24 h) / `QUERY_PERSIST_BUSTER` (`alz-erp-v2`).
- `ReactQueryProvider` consumes that shared client/persister and passes
  `maxAge` + `buster` to `PersistQueryClientProvider`. The duplicate
  `createQueryClient()`/`QUERY_CONFIG` legacy factory was removed.
- `auth/store.ts` therefore clears **the real cache** on logout.
- One-time cleanup drops the orphaned legacy `alzhra-query-cache` key.

### 2. ZATCA edge function hardening

- **Authentication:** a valid Supabase user JWT is required (`auth.getUser()`).
- **Fail closed:** missing `ZATCA_AUTH_TOKEN` returns `503 ZATCA_NOT_CONFIGURED`
  — success is never simulated.
- **Server-side truth:** invoice, company and party are loaded via the
  user-scoped (RLS) client; amounts/hash are computed from DB rows, not the
  client body. Only `invoiceData.id` is trusted from the caller.
- **B2B/B2C classification:** derived from the buyer's `tax_number` instead of a
  client-sent `type` flag.
- **CORS:** restricted to the project origin allow-list.
- **Audit log:** inserted with the real `audit_logs` schema
  (`company_id, user_id, action, entity, entity_id, details`).

---

## Consequences

- Logout now truly wipes the persisted query cache; cross-user data cannot be
  rehydrated on shared devices.
- Deploy-time cache invalidation works again via `QUERY_PERSIST_BUSTER`.
- ZATCA can no longer be triggered anonymously or report fake "cleared" status.
  Full ZATCA *compliance* (onboarding CSR / compliance certificate + EInvoice
  signing) remains a documented prerequisite before real production use.
- The offline sync queue (`syncStore`) is intentionally **not** cleared on
  logout — replay is blocked by RLS for a different user, and clearing it would
  risk losing legitimately queued offline work.
