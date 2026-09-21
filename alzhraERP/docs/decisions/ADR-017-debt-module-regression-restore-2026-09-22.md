# ADR-017: Debt & Collection Module — Regression Restore & Signature Alignment

## Status

Accepted (2026-09-22)

## Context

A deep review of the debts & collection module (2026-09-22) found that the
`patch_rpc_security_part2/3/4` migration series (2026-09-16), which appears to
have been dumped from the live database, **re-created the debt RPCs from stale
definitions and silently undid the accepted ADR-011 fixes**
(20260823000001) and the currency-unification fixes (20260911000001/2):

1. **Lost write gates (security regression).**
   - `break_overdue_promises` — `user_can_manage_debts(p_company_id)` gate gone
     → any company member (incl. `viewer`/`sales`) could break all promises,
     because the RPC is `SECURITY DEFINER` and bypasses RLS.
   - `complete_promise` — role gate AND the linked-receipt validation
     (`INVALID_PAYMENT`: posted receipt for the same party) gone.
   - `record_debt_reminder` — template-ownership check (`INVALID_TEMPLATE`) gone.

2. **Lost data-correctness fixes.**
   - `get_debt_analytics_summary`, `get_debt_today_tasks`,
     `get_debt_party_overview` reverted to `status IN ('posted', 'partial')`.
     `'partial'` is not in `invoices_status_check`
     (`draft|pending|confirmed|posted|paid|partially_paid|cancelled|void`) so it
     never matches → partially-paid and confirmed invoices disappeared from
     analytics, party overview and today tasks, while the follow-up dashboard
     (re-created correctly in 20260921000001 with
     `('posted','confirmed','partially_paid')`) showed them — the two screens of
     the same module disagreed.
   - `get_debt_analytics_summary` also lost the base-currency conversion and
     again summed raw amounts across currencies (YER mixed with SAR).

3. **Silent PGRST202 signature mismatch.**
   The frontend passes `p_branch_id` to `get_debt_analytics_summary` and
   `get_debt_today_tasks`, whose live signatures accepted `p_company_id` only.
   PostgREST returns PGRST202 and the API layer's graceful-degradation catch
   swallowed it → the Overview page silently showed zeros and empty tasks
   whenever the DB matched the repo migrations.

4. **Missing unique constraints.**
   `upsertFollowupConfig` (`onConflict: 'company_id'`) and
   `upsertOpeningBalance` (`onConflict: 'company_id,party_id,currency_code'`)
   depend on unique constraints that do not exist in the schema → any save
   would fail with 42P10.

5. **Follow-up engine settings were cosmetic.**
   The Settings page saves `due_soon_days / critical_days / reminder_window_days`
   to `debt_followup_config`, but the frontend always sent the hardcoded
   `DEBT_ENGINE_DEFAULTS` (7/30/3) and the SQL consumed the parameters directly
   — the saved config never influenced anything.

## Decision

Migration `20260922000001_fix_debt_module_regression_and_signatures.sql`:

1. **Restore the three write RPCs** exactly as hardened in ADR-011
   (`fn_assert_company_access` + `user_can_manage_debts` +
   `INVALID_PAYMENT`/`INVALID_TEMPLATE` checks).
2. **Re-signature the two read RPCs** the frontend calls with a branch:
   `DROP FUNCTION (uuid)` + `CREATE (uuid, uuid DEFAULT NULL)` — the 1-arg calls
   (e.g. the SQL test file) stay valid through the default; the frontend's
   2-arg calls now match. Full branch isolation via `get_auth_branches` is added
   to both (same pattern as the dashboard), so a branch-limited manager no
   longer receives company-wide numbers.
3. **Rewrite `get_debt_analytics_summary`** on the good 20260911000002 basis:
   derives receivable KPIs from `get_debt_followup_dashboard` (consistent with
   the follow-up screen), converts via `fn_to_base_amount`, restricts
   `by_currency` to indebted customers, and counts **distinct** debtors
   (`COUNT(DISTINCT party_id)` instead of party-currency rows).
4. **`get_debt_followup_dashboard`** (signature unchanged, 6-param overload):
   engine windows now resolve as
   `explicit param → debt_followup_config row → hardcoded default`, and
   branch filters tolerate `branch_id IS NULL` rows (legacy/company-shared
   data — previously they vanished for branch-limited users, and promise
   summary was unfiltered).
5. **Add the missing unique indexes** (after deduplicating, keeping the
   most recently updated row):
   `uq_debt_followup_config_company` and
   `uq_party_opening_company_party_currency`.
6. **Re-assert privileges** (`REVOKE anon, PUBLIC` / `GRANT authenticated`) for
   all touched functions.

Frontend:

- `debtsService.getDashboard` now reads the saved
  `debt_followup_config` (pure `resolveEngineParams` helper, unit-tested) and
  passes the resolved windows **explicitly**, so the settings take effect even
  against a live DB that has not applied the migration yet; a config-read
  failure falls back to defaults instead of breaking the dashboard.
- `debtsApi.getDashboard` accepts an optional `engine` parameter.
- `updateTemplate` is scoped by `company_id` (defense-in-depth, matching
  `deleteTemplate`).
- `PromisesPage` disables complete/delete/break actions while `isSaving`
  (double-click prevention on desktop and mobile actions).

## Alternatives considered

- **Passing NULL from the frontend and letting SQL read the config** — rejected
  as the only mechanism because on a live DB without the new migration the
  defaults (7/30/3) would apply; explicit frontend resolution works on both
  states. The server-side NULL→config fallback is still implemented for direct
  SQL callers (analytics/test file).
- **Keep the 1-param signatures and change the frontend** — rejected: it would
  drop the branch context the UI already sends and reintroduce the
  company-wide numbers a branch manager should not see.

## Consequences

**Positive**

- Cross-role write paths in the debt module are closed again; a `viewer` can no
  longer break promises via RPC.
- Analytics, party overview and today-tasks include
  `confirmed`/`partially_paid` invoices and agree with the follow-up dashboard.
- Multi-currency KPIs are base-currency totals; `by_currency` is customer-only.
- Branch-limited users get consistent, leak-free numbers on Overview, Tasks and
  Follow-up.
- Saving follow-up config / opening balances works (unique indexes exist), and
  the saved engine settings actually drive classification.
- Silent PGRST202 failures are gone (signatures match the frontend).

**Risks / notes**

- If the **live database** already carries an untracked
  `get_debt_analytics_summary(uuid, uuid)` overload, `CREATE OR REPLACE`
  updates it; the `DROP FUNCTION (uuid)` still removes the stale 1-param
  overload, so no 42725 ambiguity can arise.
- `branch_id IS NULL` rows are treated as company-shared (visible to every
  branch) — this matches the shared-resource convention used for legacy data;
  re-examine if a strict "NULL = main branch only" policy is ever adopted.
- The migration must be applied to the live DB and verified with
  `supabase/tests/test_debt_collection_correctness.sql` (T1–T9; T6/T7 cover the
  regression directly).
- `fn_to_base_amount` (20260921000001, IMMUTABLE) hardcodes YER=divide and
  everything else=multiply; restoring the `supported_currencies.exchange_operator`
  lookup would break IMMUTABLE — revisit only if a divide-convention currency
  other than YER is ever configured.
