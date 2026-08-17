# ADR-006: Treasury RLS Alignment, Ledger Branch Filter, Balance Sign Convention

## Status
Accepted (2026-08-18)

## Date
2026-08-18

## Context
Follow-up to ADR-005. Deep inspection of the live production database and the
frontend exposed three inconsistencies in the P2 area:

1. **Treasury RLS (repository vs production divergence)** — the repository migration
   `20260818000001` used `user_is_admin_or_manager()` for `cashboxes` /
   `exchange_companies` insert/update policies. The **live** policies instead use
   `get_user_role() = ANY ('owner','admin','accountant')`. Because
   `user_is_admin_or_manager()` returns `role IN ('admin','manager','owner')`, it
   **excludes the `accountant` role** — applying the repository version to a fresh
   deployment would have silently dropped accountant access to treasury.

2. **Ledger has no branch filter** — the live `get_account_ledger` RPC
   `(uuid, uuid, text, text)` has no `p_branch_id`; `reportService.getLedger`
   ignored its `_branchId` argument. The ledger therefore mixed all branches'
   movements even when a branch filter was active. Client-side filtering was
   rejected because the running `balance` column is computed over the full result
   set — filtering rows after the fact would corrupt the running balances.

3. **Inconsistent balance signs** — `report_trial_balance` returns a flat
   `balance = SUM(debit) − SUM(credit)` for every account type, so liabilities /
   equity / revenue appeared as negative numbers in the chart-of-accounts tree,
   treasury sidebar and key-balance cards, while the reports trial-balance view
   already handles the sign semantically (مدين/دائن).

## Decision
1. **Treasury RLS** — update `20260818000001_fix_accounting_engine.sql` so its
   `cashboxes` / `exchange_companies` policies **exactly match production**:
   `FOR … TO public`, tenancy via `get_user_company_id()`, and write access for
   `get_user_role() = ANY ('owner','admin','accountant')`. (The live DB already has
   these policies; the migration change only prevents divergence in fresh
   deployments.)

2. **Ledger branch filter** — extend `get_account_ledger` to
   `(p_company_id uuid, p_account_id uuid, p_from text, p_to text, p_branch_id uuid DEFAULT NULL)`
   with `DROP FUNCTION IF EXISTS public.get_account_ledger(uuid, uuid, text, text)`
   first (to avoid an ambiguous overload). The body filters both the opening balance
   and the entries by `jel.branch_id = p_branch_id`, and the entries now include
   `branch_id`. Frontend: `reportService.getLedger` passes `p_branch_id` and maps
   `branch_id` onto `LedgerEntry` (new optional field). `useLedger` already reads the
   active branch from `useBranchFilter`.

3. **Balance sign convention** — define: **assets/expenses are positive for debit
   balances; liabilities/equity/revenues are positive for credit balances**.
   Apply the normalization in `accountsService.getAccounts` only
   (`balance = type ∈ (liability, equity, revenue) ? −raw : raw`). The reports
   trial-balance view and the ledger RPC already handle signs semantically and are
   left unchanged.

## Alternatives Considered
### Add branch filter client-side (filter entries after the RPC)
Rejected — running balances would be computed over all branches then filtered,
producing incorrect balances for a branch-filtered view.

### Change `report_trial_balance` to per-type CASE signs in production
Rejected — the live trial-balance consumers (reports view, ledger RPC) already
interpret the flat sign correctly; altering the RPC would flip those displays and
affect every caller.

### Keep `user_is_admin_or_manager()` in the treasury policies
Rejected — excludes `accountant`, diverging from production behavior.

## Consequences
### Positive
- Treasury RLS in the repository now reproduces production exactly.
- The ledger respects the active branch filter; balances are correct for the
  filtered branch.
- Chart-of-accounts / key-balance cards show liabilities, equity and revenue as
  positive credit-normal balances.
- Baseline functions regenerated to include the new 5-arg `get_account_ledger`.

## Addendum (2026-08-18): Bond (receipt/payment) posting fixed
While enabling the treasury **سند قبض / سند صرف** buttons, the live engine revealed
that bond journals are created by the AFTER INSERT trigger
`fn_auto_post_payment_journal` on `payments` — **not** by `commit_payment`. Both had
the same **posted-first** ordering bug, so every bond insert failed with
`23514: Cannot add lines to a posted journal entry`.

Fixes applied to production (same signatures):
1. `fn_auto_post_payment_journal` → header inserted as `'draft'`, lines added, then
   `UPDATE … SET status='posted'`; idempotency check retained; Arabic messages
   cleaned.
2. `commit_payment` → journal creation removed (the trigger is the single source of
   truth); added `verify_company_access` (the original had **no auth/company check**
   despite being `SECURITY DEFINER` — a privilege-escalation gap).

Verified live: a receipt bond posts a balanced journal
(`receipt_bond`, Dr 100 / Cr 100, diff 0) and rolls back cleanly.
Frontend: treasury receipt/payment buttons enabled; `useCashPaymentAccounts` /
`useExchangePaymentAccounts` now derive balances from the linked chart-of-accounts
entry (trial balance) instead of the static `opening_balance`.

### Negative / Follow-up
- `get_account_ledger`'s old 4-arg signature is dropped; any external caller must be
  updated to the 5-arg form (frontend already updated).
- `accountsService.getAccounts` sign normalization is a presentation convention;
  future consumers must be aware that `Account.balance` is sign-normalised per type.
- The reports feature (`reports/service.ts`) still returns the flat sign; this is
  intentional (its view renders مدين/دائن from the sign) but documented here to
  avoid confusion.
- `commit_payment` still uses a simplified counter account for `party`
  counterparties (first revenue/expense account by code prefix); mapping receipts to
  AR and payments to AP for party counterparties is a future enhancement.
- `trg_auto_post_payment_journal` skips transfers (`party_id` is null); internal
  cash transfers rely on the transfer bond flow in the UI.

