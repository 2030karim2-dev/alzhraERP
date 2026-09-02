# ADR-005: Reconciliation of the Accounting Engine with the Live Database

## Status

Accepted (2026-08-18) — requires follow-up for full migration-history reconciliation

## Date

2026-08-18

## Context

A deep audit of the accounting module (features/accounting, core/usecases/accounting,
bonds, expenses, treasury) revealed **structural divergence between the repository
and the production Supabase project** (`zzthamxjxnxzzpswllid`):

1. **Migration-history gap**: the live database records **593+ applied migrations**
   (starting `20260216152211 …`) that are **not present** in `supabase/migrations/`.
   Conversely, several local migration files were never applied to production
   (e.g. `20260731000002_create_accounting_rpcs.sql`). Only the `20260816xxxx` batch
   is recorded in the live history. The repository therefore cannot reproduce the
   production schema, and the production functions cannot be reproduced from the repo.

2. **Two confirmed production bugs** (extracted via `pg_get_functiondef`):
   - `post_manual_journal` inserted the journal header with `status='posted'` **before**
     its lines. The live `trg_journal_entry_lines_immutability` trigger forbids that
     (SQLSTATE 23514) → **every manual journal posting failed**.
   - `fn_auto_post_invoice_journal` booked `Dr AR = total_amount` while crediting
     `Revenue = total - tax - discount` and `VAT = tax` → the journal was **unbalanced
     by the discount amount**. Combined with the deferred `ensure_journal_balance`
     constraint trigger (tolerance 0.001), **any invoice with a discount failed to
     commit**. The function also matched the wrong return type (`sale_return` instead
     of `return_sale`) and had **no** `return_purchase` branch.

3. **Signature divergence**: `post_manual_journal`, `create_cashbox` and
   `create_exchange_company` in production use **different parameter orders** than the
   drafts in this repository. Applying the repository drafts as-is would have created
   duplicate overloads and broken PostgREST resolution.

4. `report_profit_loss` / `report_balance_sheet` in production aggregate by **code
   prefix** (`4%` / `5%` / `1%` / `2%` / `3%`) and the balance sheet does **not**
   include period net profit in equity.

## Decision

1. **Fix production directly** with surgical `CREATE OR REPLACE` statements that
   preserve the production signatures and behavior, changing only what is broken:
   - `post_manual_journal` → `draft → lines → posted` (end-to-end verified with a
     rolled-back journal, then confirmed by a live posting test).
   - `fn_auto_post_invoice_journal` → receivable/payable booked **net of discount**,
     correct return types (`return_sale`/`sale_return`), added `return_purchase`
     branch, clean Arabic messages.
   - `trg_invoice_auto_post_journal` → converted to a **DEFERRABLE INITIALLY
     DEFERRED** constraint trigger so COGS can be computed after invoice_items exist;
     the in-function idempotency check prevents double posting.
   - **End-to-end verified** with a real discounted sale invoice (total 1000, tax 50,
     discount 100) → journal posted balanced (Dr 900 = Cr 850 + 50), then fully
     cleaned up.
2. **Record the reconciled engine** in `supabase/migrations/20260818000001_fix_accounting_engine.sql`
   with signatures/logic matching production (extracted 2026-08-18), so a fresh
   deployment reproduces the same engine.
3. **Frontend balance-sheet fix**: `reportService.getFinancials` now adds the period
   net profit to total equity for the balance check (`assets = liabilities + equity +
net profit`), while keeping the equity line item separate so the UI display stays
   consistent with production's SQL output.
4. **`migrateCashboxBalances` redesign**: replaces the destructive
   `UPDATE journal_entry_lines SET account_id=…` (blocked by immutability triggers and
   a historical-rewrite hazard) with a **balanced transfer journal** via
   `post_manual_journal` (Dr SAR cashbox / Cr main cashbox), now passing `userId`.
5. **Security**: the audit credentials used were treated as transient, never committed,
   and the user was advised to rotate them.

## Alternatives Considered

### Apply the full local migration to production

Rejected — would create duplicate overloads (`post_manual_journal`, `create_cashbox`,
`create_exchange_company`) with mismatched parameter orders and overwrite working
production functions, breaking the frontend.

### Rebuild the 593-migration history first

Rejected as a prerequisite — large multi-day effort; the surgical fixes were required
immediately. Documented as follow-up work.

## Consequences

### Positive

- Manual journal posting works in production (verified live).
- Discounted invoices no longer fail and produce balanced journals (verified live).
- Sales/purchase returns now post journals; purchase returns post for the first time.
- COGS is computable for new invoices (deferred trigger timing).
- Version control now contains production-accurate definitions for the accounting
  engine.
- **Schema baseline captured** (2026-08-18): `20260818000002_baseline_schema.sql`
  (156 tables + constraints + indexes), `20260818000003_baseline_functions.sql`
  (286 functions), `20260818000004_baseline_triggers_policies.sql` (views, triggers,
  policies) + reusable generator `scripts/generate-baseline.mjs`. See
  `supabase/migrations/README.md`.

### Negative / Follow-up

- The baseline is a **snapshot of the final schema state**, not the incremental
  593-migration history. A fresh deployment can build from the baselines + new
  migrations, but existing environments cannot be "replayed" from the repo alone.
- The baseline must be validated on a staging environment before use.
- `report_balance_sheet` equity semantics (net-profit exclusion in SQL) are preserved
  to match production; the frontend compensates. A future coordinated change could
  move net profit into the SQL equity total.
- The `ensure_journal_balance` tolerance (0.001) is tighter than the frontend's SOX
  tolerance (0.01) — amounts are rounded to 4 dp before balance checks, but the
  mismatch should be revisited.
- Production functions still contain legacy mojibake messages in non-accounting areas.
