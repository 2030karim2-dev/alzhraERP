# ADR-011: Debt & Collection Module — Security & Data Correctness Fixes

## Status

Accepted (2026-08-23)

## Date

2026-08-23

## Context

The deep audit of the debt & collection module (2026-08-20) found two
cross-tenant vulnerabilities and several data-correctness defects.

1. **C1 — Cross-tenant reads.** Nine debt RPCs are `SECURITY DEFINER` and were
   `GRANT`ed `EXECUTE` to `authenticated` **without any company-membership
   check**:
   `get_debt_followup_dashboard`, `get_debt_analytics_summary`,
   `get_debt_today_tasks`, `get_debt_party_overview`, `get_party_all_balances`,
   `get_party_balance_by_currency`, `record_debt_reminder`,
   `break_overdue_promises`, `complete_promise`.
   Because `SECURITY DEFINER` bypasses RLS, any authenticated user could pass an
   arbitrary `p_company_id` and read (or write, for the three write RPCs) **any
   company's** debt data. The accounting hardening migration
   (`20260819000010`) had already fixed the report functions — the debt module
   was left out.

2. **C2 — Role/status defects.**
   - `user_can_manage_debts()` excluded `owner`, but the only roles allowed in
     `user_company_roles` are `(owner, admin, accountant, cashier, viewer)` —
     so **owners could not manage debts** through RLS.
   - The debt queries filtered `invoices.status IN ('posted','partial')`, but
     `'partial'` is not a valid status (the trigger writes
     `'partially_paid'`) → **partially paid invoices were silently excluded**
     from the entire module.
   - The `due_today` classification branch was dead code
     (`oldest_due_date < today` always), so the «اليوم» tab was always empty.
   - `update_invoice_status_on_payment` wrote `'unpaid'` on full payment
     reversal, which is **not** in `invoices_status_check` → 23514 crash risk.

## Decision

Migration `20260823000001_fix_debt_module_security_and_correctness.sql`:

1. Adds `PERFORM public.fn_assert_company_access(p_company_id)` to all nine
   debt RPCs and role-gates the write RPCs with
   `user_can_manage_debts(p_company_id)`.
2. Includes `owner` in `user_can_manage_debts` (both overloads). The
   `EXECUTE` privileges of these helpers are intentionally left intact — they
   are required by RLS policy evaluation (see `20260821000002`).
3. Replaces `'partial'` with `'partially_paid'` in every debt query.
4. Computes `due_today` from `next_due_date = v_today`.
5. Reverts `'unpaid'` → `'posted'` in `update_invoice_status_on_payment`.
6. Fixes `get_dashboard_summary(uuid,uuid)` (referenced a non-existent
   `parties.balance` column → uses the `party_balances` VIEW).
7. Aligns `party_balances_by_currency` with the AR/AP account definition
   (`1100%`/`2100%`) used by `get_party_statement`.
8. Adds the five debt tables to the `supabase_realtime` publication (fresh
   deployments started without them → Realtime sync was a silent no-op).
9. Adds a service_role-only `cron_break_overdue_promises()` and a guarded
   pg_cron schedule (daily 03:00) so overdue promises transition to `broken`
   automatically.

Frontend (`11` files): ReminderModal «تسجيل فقط» now actually records without a
valid WhatsApp number; the Reports debt report now uses the real `report_debts`
RPC (supplier payables were always empty); DebtAgingReport ages by `due_date`
and includes `partially_paid`; permissions are surfaced in the UI
(`debts:read` module gate, `debts:manage` write gates, `debts:remind` reminder
gate); destructive actions are confirmed; `isSaving` covers every mutation.

## Consequences

**Positive**

- Closes the cross-tenant read/write paths in the debt module.
- Partially paid invoices now appear in the follow-up dashboard, analytics and
  today-tasks.
- The «اليوم» tab and the Reports supplier-payables table finally show data.
- Owners regain full debt management.
- **F13 (follow-up `20260824000001`):** multi-currency totals are now converted
  to the company base currency using the system's MULTIPLY convention
  (`invoices.exchange_rate` for invoices, latest `exchange_rates.rate_to_base`
  for opening balances and promises). The per-currency breakdown
  (`by_currency`) remains the authoritative multi-currency view.
- **F11 (follow-up `20260824000001`):** `get_party_statement` now prepends
  synthetic «رصيد افتتاحي» rows so customer statements reconcile with the
  debts module.

**Risks / notes**

- The migrations must be applied to the live database (verified via
  `supabase db push` or the SQL editor). The provided API keys were rejected
  (401) during the audit, so live verification was not possible.
- Currency conversion uses transaction rates; the general ledger itself stores
  journal amounts in the transaction currency (exchange_rate as metadata), so a
  fully base-currency GL remains a separate, larger undertaking.
- Opening balances are surfaced in statements (F11) but are still not posted as
  journal entries — they are not part of trial-balance account movements.
