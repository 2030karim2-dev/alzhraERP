# ADR-021: Debt Reminder Template Library (16 ready templates)

## Status

Accepted (2026-09-23)

## Date

2026-09-23

## Context

The audit found the module shipped with an empty template list: every company had
to hand-write its first reminder, and Phase 3 (automated dunning) needs a template
per rung of the collection ladder. The renderer (`messageTemplate.ts`) supports
exactly eight tokens - customer_name, amount, currency, due_date, days_overdue,
invoice_number, company_name, signature - and two behaviours drive authoring:
`{{amount}}` already carries the currency symbol via `formatCurrency`, and the
reminder flow never passes `invoice_number`.

## Decision

### Migration `20260923000003_debt_message_templates_library.sql`

1. **`seed_default_debt_templates(company_id)`** - SECURITY DEFINER, company-access
   checked, callable by owner/admin/manager/accountant (ERRCODE 42501 otherwise) or by
   a migration/service_role context. Idempotent **by template name**: an existing
   template with the same name is never modified or overwritten.
2. **16 professional Arabic templates** covering the ladder and the payment
   lifecycle: pre-due friendly, due-day, 1-15, 16-30, 31-60 formal demand, 61-90
   field-visit notice, 90+ final notice, pre-litigation legal notice, promise pre-due,
   broken-promise re-scheduling, full-payment thanks, partial-payment thanks,
   installment-plan offer, statement summary, transfer-confirmation request,
   transfer-received confirmation.
3. **One-time backfill** for every existing company (3 tenants, 48 rows).
4. Authoring rules baked into the library: only the eight supported tokens, never
   `{{currency}}` after `{{amount}}`, never `{{invoice_number}}`, and every body ends
   with a company/signature block.

### Frontend

`SeedTemplatesCard` on the debts settings page imports the library on demand and
shows how many templates the company already has. The mutation is permission-gated
(`debts:manage`) and reports the inserted count (0 = already seeded).

## Verification

| Evidence                               | Result                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Live apply                             | 3 companies x 16 templates = 48 rows, all active                                                                                 |
| Idempotency (second call)              | inserted 0                                                                                                                       |
| Server-side content proof              | 16/16 carry `{{amount}}`, `{{company_name}}`, `{{signature}}`; 11 carry the greeting (the 5 formal notices intentionally do not) |
| Placeholder whitelist                  | 0 templates use an unsupported token                                                                                             |
| `test_debt_collection_correctness.sql` | **T1-T15 pass** on live (T15 = completeness + idempotency + whitelist + amount token)                                            |
| Gates                                  | tsc / lint ratchet / vitest for every touched file                                                                               |

## Consequences

**Positive:** a new company starts collecting in one click with a coherent,
escalation-aware voice; Phase 3 can bind a template per cadence step without any
authoring work; name-keyed idempotency makes re-seeding always safe.

**Notes / limits:** the seeded bodies are Arabic-only (the module is Arabic-first
and the AI generator writes Arabic too); the library is a starting point - edited or
custom templates are never overwritten; `{{signature}}` renders empty until the
company fills `debt_followup_config.reminder_signature`.

## Rejected alternatives

- **Hard-coding the bodies in the frontend** - the Phase 3 dispatcher runs
  server-side and needs the bodies in the database.
- **Overwriting templates on re-seed** - it would destroy company edits.
- **Using `{{invoice_number}}` / `{{currency}}`** - both render wrong today (an
  empty token and a duplicated currency symbol).
