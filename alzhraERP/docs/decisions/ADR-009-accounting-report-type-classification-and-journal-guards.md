# ADR-009: Accounting Accuracy Phase 3 — Type-Based Reports, Zero-Journal & Exchange-Rate Guards

## Status

Accepted (2026-08-20) — Phase 3 of the deep accounting audit (report classification + journal input integrity)

## Date

2026-08-20

## Context

Phase 3 closes the three critical correctness findings from the 2026-08-20
accounting audit (ADR-007 delivered security hardening, ADR-008 delivered
ledger signs / cumulative balances / bond journaling / numbering / branch filters):

1. **R1 — Report classification by code prefix instead of account type.**
   `report_balance_sheet` filtered accounts by `a.code LIKE '1%'/'2%'/'3%'` and
   `report_profit_loss` by `a.code LIKE '4%'/'5%'`, while every other financial
   function (`get_account_ledger`, `report_trial_balance`,
   `report_account_balances`, `get_monthly_performance`) classifies by `a.type`.
   Consequences:
   - a custom asset coded `7001` was silently **EXCLUDED** from the balance sheet;
   - an expense coded `1999` was **wrongly added to assets AND to expenses**
     (double counting);
   - a custom revenue coded `9100` never reached the income statement.

2. **R2 — Zero-amount journals were postable at the DB layer.**
   `check_journal_balance` only verified balance (`|ΣDr − ΣCr| ≤ 0.001`), so
   `post_manual_journal` (or any direct caller) could post an empty / all-zero
   journal: 0 = 0 is "balanced". The UI prevented it, the database did not.

3. **R3 — Unvalidated exchange rate + spoofable attribution.**
   `post_manual_journal` accepted `p_exchange_rate = 0` (which silently zeroes
   the whole entry) and took `created_by` from the client-supplied `p_user_id`.
   In addition, two of its `RAISE EXCEPTION` messages were stored with corrupted
   encoding (question-mark bytes) since the baseline migration.

## Decision

One migration (`20260820000004_accounting_type_based_reports_and_journal_guards.sql`),
signatures unchanged for every function (existing GRANTs and callers keep working):

- **`report_balance_sheet`** — classify by `a.type` (`asset` / `liability` /
  `equity`) instead of code prefix; keeps `fn_assert_company_access`,
  `p_as_of_date` and `p_branch_id` semantics.
- **`report_profit_loss`** — classify by `a.type` (`revenue` / `expense`)
  instead of code prefix; keeps access check, date range and branch filter.
- **`post_manual_journal`** —
  - rejects empty payloads (`jsonb_array_length = 0`);
  - rejects all-zero journals (`v_total_debit <= 0`);
  - rejects a non-positive exchange rate before any arithmetic;
  - derives `created_by` from `auth.uid()` (falling back to `p_user_id` only
    when there is no session, e.g. service-role contexts) so an authenticated
    client cannot spoof attribution;
  - the two corrupted Arabic messages are rewritten in proper UTF-8.
- **`check_journal_balance`** (deferred `ensure_journal_balance` constraint
  trigger) — rejects a **posted** journal whose live lines total zero. Draft
  journals may still exist without lines until they are posted, so the guard is
  scoped to `status = 'posted'`. This protects every auto-posting path
  (invoices, payments, reversals).

Frontend defence-in-depth (`journalsApi.postJournalEntryRPC`):

- client-side guards for zero totals and non-positive exchange rate (same
  messages as the server), extracted into `validateJournalInput` so the RPC
  method stays under the lint size limit.

## Verification

- **Unit tests (Vitest):** `journalsApi.test.ts` (7 tests — R2/R3 guards,
  payload mapping, server-error passthrough); `PostTransactionUsecase.test.ts`
  gained a Zod-level non-positive-rate rejection test. Accounting suite:
  **76 tests / 9 files, all passing.**
- **SQL regression tests:** `supabase/tests/test_accounting_accuracy.sql`
  (runnable via `psql` against a local/CI DB, single transaction, rolled back):
  - R1 fixtures with deliberately non-conventional codes (asset `88001`,
    expense `18899` with a `1` prefix, revenue `99901`) prove the balance
    sheet / P&L now classify by type (assets = 1100, expenses = 400,
    revenues = 500, net = 100);
  - R2/R3 guard assertions on `post_manual_journal` (empty payload, zero lines,
    rate 0) and on the deferred trigger (`SET CONSTRAINTS ensure_journal_balance
IMMEDIATE` rejects a posted zero journal);
  - positive path: a balanced journal posts with `rate 2` storing base
    amounts `200 × 2 = 400`.
- `npm run check:encoding` passes (no mojibake in the new files).

## Production application (2026-08-20)

- Applied to `zzthamxjxnxzzpswllid` (alzhra100) via the Management API
  `/database/query` endpoint and recorded in
  `supabase_migrations.schema_migrations` (`20260820000004`).
- Byte-level (hex) verification against the live database: both report
  functions now classify by type; `post_manual_journal` /
  `check_journal_balance` carry the zero/rate guards with clean UTF-8 Arabic
  (previously the two `post_manual_journal` RAISE messages were stored as
  literal `?????` mojibake).
- The SQL regression suite passed twice against the live database
  (HTTP 201, zero residue after ROLLBACK) — proving idempotency.
- Operational note: Windows PowerShell 5.1 reads UTF-8 files without BOM as
  ANSI, which corrupts Arabic before transmission; the migration must be
  sent with `Get-Content -Encoding UTF8` + explicit UTF-8 body bytes.
