# ADR-007: Accounting Security Hardening — Tenant Isolation & Bond Voiding

## Status

Accepted (2026-08-19) — Phase 1 of the deep accounting audit

## Date

2026-08-19

## Context

The deep accounting audit (2026-08-19) confirmed two critical security flaws and
one root-cause bug in the accounting engine:

1. **C1 — Cross-tenant financial data exposure.** Six report RPCs were
   `SECURITY DEFINER`, granted `EXECUTE` to `authenticated`, but contained **no
   company-membership check**:
   - `report_trial_balance`, `report_profit_loss`, `report_balance_sheet`,
     `report_cash_flow`, `report_debt_aging`, `get_monthly_performance`.
     Because `SECURITY DEFINER` bypasses RLS, any authenticated user could call
     these with an arbitrary `p_company_id` and read **any company's** trial
     balance / P&L / balance sheet / cash flow / debt aging / monthly performance.
     (Compare `get_account_ledger`, `report_debts`, `get_bonds_stats`,
     `get_overdue_invoices` — these already check `user_company_roles`.)

2. **C2 — `void_bond` was both insecure and broken.**
   - Insecure: no access check — any authenticated user could void any
     payment in any company.
   - Broken: it attempted `UPDATE journal_entries SET status='void'` on posted
     journals, which is forbidden by `trg_journal_entries_immutability`
     (`prevent_posted_journal_modification`, errcode 23514) → **every bond
     delete failed in production**.
   - It also searched `reference_type = 'payment'`, but bond journals are
     stored as `'receipt_bond'` / `'payment_bond'` → matched nothing even if
     the status flip had been allowed.

3. **Root cause — `fn_reverse_journal_entries` had the posted-first ordering
   bug** (the same bug class ADR-005 fixed for `post_manual_journal`): it
   inserted the reversal header with `status='posted'` **before** its lines,
   which violates `trg_journal_entry_lines_immutability` on line insert
   (errcode 23514). This blocked `void_expense`, `void_invoice` and any other
   reversal flow that relies on it.

## Decision

Apply a new migration `20260819000010_accounting_security_hardening.sql`:

1. Add `PERFORM public.fn_assert_company_access(p_company_id);` to the six
   report functions listed above (identical signatures, bodies otherwise
   unchanged). Re-assert `GRANT/REVOKE` privileges defensively.
2. Rewrite `void_bond`:
   - verify the caller belongs to the payment's company;
   - reject voiding inside a closed fiscal year;
   - replace the illegal `status='void'` flip with a **reversal journal**
     created via `fn_reverse_journal_entries` (the posted journal stays
     immutable and the reversal is balanced);
   - void the payment last, inside the same transaction.
3. Fix `fn_reverse_journal_entries`:
   - add `fn_assert_company_access` and a `company_id` filter on the source
     journals;
   - change the ordering to **draft → lines → posted** so the immutability
     trigger passes.

Frontend: `useDeleteBond` now invalidates `journals` and `ledger` query keys
(because voiding a bond now creates a reversal journal), and the
`bondsApi.deleteBond` comment documents the real behavior.

## Alternatives Considered

### Allow `posted` → `void` status updates in the immutability triggers

Rejected — this would let callers silently delete posted history, defeating
the audit-trail guarantee that ADR-005 intentionally built.

### Have `void_bond` leave a `void` status on the payment without a reversal

Rejected — the ledger would no longer balance (money would disappear without
an offsetting entry).

### Keep `fn_reverse_journal_entries`'s posted-first ordering and special-case

the trigger
Rejected — the trigger is a legitimate guard; fixing the function to follow
`draft → lines → posted` aligns with the proven `post_manual_journal` pattern.

## Consequences

### Positive

- Cross-tenant reads through the six report RPCs are now blocked (same guard
  as the already-secure ledger/bonds RPCs).
- Bond deletion works again and now produces a proper balanced reversal
  journal, preserving the immutability of posted history.
- `void_expense` / `void_invoice` / any `fn_reverse_journal_entries` caller
  benefit from the ordering fix and the access check.

## Addendum (2026-08-19): Applied to production & verified

The migration `20260819000010_accounting_security_hardening.sql` was applied
to the live project (`zzthamxjxnxzzpswllid`) via the Management API and
recorded in `supabase_migrations.schema_migrations` (version
`20260819000010`, `created_by=supabase_cli`). Verification results:

1. `pg_get_functiondef` shows all six report functions + `get_monthly_performance`
   - `fn_reverse_journal_entries` now call `fn_assert_company_access`, and
     `void_bond` contains the inline company-membership + open-fiscal-year checks
     and delegates to `fn_reverse_journal_entries`.
2. `fn_reverse_journal_entries` now follows `draft → lines → posted`
   (immutability trigger no longer blocks reversals).
3. Privileges confirmed via `has_function_privilege`:
   `anon_exec = False`, `authenticated = True`, `service_role = True` for all
   eight functions.
4. Functional security test (PostgREST, service_role key — which bypasses RLS):
   calling `report_trial_balance` for a real company id now returns
   `P0001 access_denied: لا تملك صلاحية الوصول لبيانات هذه الشركة`
   (previously it returned the company's trial balance rows).
5. `void_bond` with a non-existent payment id raises
   `Payment not found or already voided` (function executes correctly).
6. Stored Arabic messages verified byte-correct (hex check) — the garbled
   output seen on the console was only a PowerShell display artifact.

### Negative / Follow-up

- The migration was applied and verified against the live database
  (baseline was captured 2026-08-18; production signatures matched exactly,
  no overload conflicts).
- `void_bond` reversal journals are created with `entry_date = CURRENT_DATE`
  (per `fn_reverse_journal_entries`); if a fiscal year was closed between the
  bond date and today, the reversal is blocked — acceptable and by design.
- `fn_reverse_journal_entries` still does not copy `branch_id` onto reversal
  lines/headers (pre-existing behavior, unchanged); a branch-aware reversal
  is tracked for a future phase.
- Higher-priority audit findings (Phase 2+): branch filtering in P&L/balance
  sheet, ledger sign display for credit-normal accounts, year-to-date account
  balances, transfer-bond journaling, advisory-locked numbering.
