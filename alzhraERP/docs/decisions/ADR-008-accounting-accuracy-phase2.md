# ADR-008: Accounting Accuracy — Ledger Signs, Cumulative Balances, Bond Journaling, Numbering & Branch Filters

## Status

Accepted (2026-08-19) — Phase 2 of the deep accounting audit (financial accuracy)

## Date

2026-08-19

## Context

Phase 2 closes the five high-priority financial-accuracy findings from the
deep accounting audit (ADR-007 delivered the Phase 1 security hardening):

1. **H2 — Ledger signs inverted for credit-normal accounts.**
   `get_account_ledger` returns a sign-normalised running balance
   (asset/expense → debit-normal; liability/equity/revenue → credit-normal)
   plus an `accountType` field, but `reportService.getLedger` discarded
   `accountType` and `LedgerView` printed `balance < 0 ? 'دائن' : 'مدين'` —
   so a credit-normal account (e.g. 2100 دائنون) with a positive credit
   balance was displayed as **مدين**.

2. **H3 — Account balances were calendar-year-only.**
   `accountsService.getAccounts({ includeBalances: true })` called
   `report_trial_balance` with `p_from = Jan 1 of the current year`, so
   opening balances from previous years were excluded from `Account.balance`.
   This skewed the chart-of-accounts tree, the treasury sidebar and the
   cash-fund balances used by POS / sales / purchases.

3. **H1 — Transfer & general-account bonds produced no journal.**
   `fn_auto_post_payment_journal` returned early when `party_id IS NULL`,
   and `commit_payment` dropped `p_counterparty_id` for non-party
   counterparties. Internal transfers and "حساب عام" bonds were recorded as
   `payments` rows with **no journal entry** — money never moved in the ledger.

4. **H5 — Concurrent numbering races.**
   `generate_journal_entry_number` (trigger) and `commit_payment` computed
   `MAX(…)+1` without a lock → two concurrent postings could pick the same
   number and one would fail on the unique constraint.

5. **H4 — Branch filter ignored in P&L / Balance Sheet / Cash Flow.**
   `report_profit_loss`, `report_balance_sheet` and `report_cash_flow`
   accepted no `p_branch_id`, so the accounting section always aggregated
   **all branches** even when a branch filter was active.

## Decision

Applied four new migrations (all verified on production 2026-08-19):

- `20260819000011_report_account_balances.sql` — new `report_account_balances`
  RPC returning TRUE cumulative balances (all posted movements up to
  `p_as_of_date`), with `fn_assert_company_access` from the start. Frontend
  `accountsService.getAccounts` and `migrateCashboxBalances` now use it.
- `20260819000012_transfer_bond_journal.sql` —
  - `payments.counterparty_account_id` (FK → accounts) stores the counterparty /
    destination account chosen in the UI;
  - `commit_payment` stores it when `p_counterparty_type='account'` (reusing
    `p_counterparty_id` — signature unchanged);
  - `fn_auto_post_payment_journal` now posts balanced journals for
    transfer (Dr destination / Cr source), receipt (Dr cash / Cr counterparty)
    and disbursement (Dr counterparty / Cr cash) bonds, with a tenant guard on
    the counterparty account and clean Arabic messages (was mojibake);
  - `void_bond` reversal now also covers `transfer_bond` journals;
  - advisory lock added to `commit_payment`'s payment-number generation.
- `20260819000013_numbering_locks.sql` — `pg_advisory_xact_lock` in
  `generate_journal_entry_number` (serialises per-company numbering; under the
  default READ COMMITTED the second waiter re-reads MAX() after the first
  commits).
- `20260819000014_branch_filter_reports.sql` — `p_branch_id uuid DEFAULT NULL`
  added to `report_profit_loss`, `report_balance_sheet`, `report_cash_flow`
  (old overloads dropped first — verified no views depend on them — same
  pattern as ADR-006's `get_account_ledger`). Frontend `getFinancials` and the
  dashboard P&L RPC now pass the active branch.

Frontend: `LedgerEntry.accountType` propagated to `LedgerView` /
`TreasurySummaryStats` for correct مدين/دائن rendering; journal-type labels
added for `receipt_bond` / `payment_bond` / `transfer_bond`;
`database.types.ts` updated (new RPC, function signatures, payments column).

## Alternatives Considered

### H3 — call `report_trial_balance` with `p_from='2000-01-01'`

Rejected — semantically confusing (a "trial balance" that spans all history)
and heavier than a dedicated cumulative-balance RPC.

### H1 — separate `destination_account_id` column + new RPC parameter

Rejected — `counterparty_account_id` + the existing `p_counterparty_id`
parameter cover transfers and general-account bonds with one column and no
signature change.

### H5 — switch to a PostgreSQL SEQUENCE

Rejected — would change visible numbering semantics; the advisory-lock +
MAX pattern preserves current numbering with only a serialisation guard.

### H4 — filter client-side after the RPC

Rejected — aggregates must be computed server-side per branch (same reasoning
as ADR-006's ledger branch filter).

## Consequences

### Positive

- Ledger statements now show the correct مدين/دائن for every account type.
- Account balances are cumulative (opening balances from previous years are
  no longer lost).
- Transfers and general-account bonds move money in the general ledger with
  balanced Dr/Cr journals; the old mojibake messages are gone.
- Concurrent journal/bond creation no longer collides on numbers.
- P&L / Balance Sheet / Cash Flow respect the active branch filter in the
  accounting section (and dashboard when a branch is selected).

### Negative / Follow-up

- Signature changes mean the three report functions must be referenced by
  their new argument lists in any future migration / grant statement.
- The reports feature hooks (`useProfitAndLoss`, `useCashFlow`) still call
  without a branch (the reports page has no branch filter); wiring them to
  `useBranchFilter` is a small future enhancement.
- `fn_reverse_journal_entries` still does not copy `branch_id` onto reversal
  lines (pre-existing; tracked from ADR-007).
- Non-SAR bonds: the UI writes `foreign_amount` and leaves `amount` unset in
  some flows — pre-existing, tracked for Phase 3.
