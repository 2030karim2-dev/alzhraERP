# ADR-018: Debt Collection Phase 1 — Auto-close, Aging, Idempotency, Field Sheet, Alerts

## Status

Accepted (2026-09-22)

## Context

The live audit recorded in ADR-017 showed the production debt module is healthy
(role gates, correct invoice statuses, `(uuid, uuid)` signatures, unique
constraints), so Phase 1 targets the gaps that the audit _did_ confirm:

1. **Promises were never auto-closed.** `complete_promise` accepts
   `p_payment_id`, but the UI never passed it and no trigger existed — every
   promise was closed by hand, so «وعود مُوفاة» was effectively unmeasured.
2. **No idempotency for reminders.** A double click or a retry logged the same
   reminder twice, inflating the message KPIs and the customer timeline.
3. **No aging view, no drill-down, no field sheet, no alerts.** Aging lived only
   in Reports; collectors had no exportable/printable list; the module pushed no
   notifications when debts turned critical or promises broke.

## Decision

### Migration `20260922000005_debt_collection_phase1.sql`

1. **A1 — auto-close on payment:** `fn_complete_promises_on_payment()` plus
   trigger `trg_complete_promises_on_payment` on `public.payments`
   (`AFTER INSERT OR UPDATE OF status`, `WHEN new.type='receipt' AND
new.status='posted' AND new.deleted_at IS NULL`). It walks the party's pending
   promises **FIFO by `promise_date`** in the same currency and completes each
   one while the payment amount covers it, writing
   `reference_type='payment'`, `reference_id`, `completed_at`. The trigger
   function is `SECURITY DEFINER` and revoked from `anon`/`PUBLIC`/`authenticated`.
2. **A8 — idempotency:** `debt_message_log.idempotency_key` + a partial unique
   index per company, plus `provider_message_id` (reserved for delivery receipts
   in the provider work). `record_debt_reminder` gains a trailing
   `p_idempotency_key text DEFAULT NULL` and returns the existing message instead
   of inserting a duplicate; the stale 8-argument overload is dropped.
3. **A3 — aging:** `get_debt_analytics_summary` re-created with the live logic
   (branch isolation via `get_auth_branches`, config-driven windows, base-currency
   conversion, distinct debtors) plus an `aging` array of `{key, value, count}`
   for the four buckets. Labels deliberately stay in the frontend so the SQL body
   remains ASCII.

### Frontend (Component → Hook → Service → API preserved)

- `debts/lib/aging.ts` (buckets, labels, `isAgingKey`) and
  `debts/lib/collectionSheet.ts` (BOM-prefixed CSV builder) — pure and unit-tested.
- `AgingBuckets` tiles on the Overview navigate to
  `#/debts/followup?aging=<key>`; `FollowUpPage` reads the param, filters, and
  shows a clearable chip (plus CSV export and a print-clean table).
- **«تحصيل الآن»** per row opens `CreateBondModal type="receipt"` with a new
  optional `prefill` on `useBondForm` (party, amount, currency, description),
  gated by `debts:manage` **and** `accounting:create`. Because the promise is
  closed server-side by the trigger, the UI only invalidates `['debts']`.
- Reminder sends carry an idempotency key that is stable for one send and
  regenerated on success.
- `debts/hooks/useDebtAlerts` raises the two deduped alerts
  (`debt_critical_summary`, `promise_broken_summary`) from inside the debt
  module (`DebtsLayout`). Module scope was chosen deliberately: wiring it into
  the global health cycle (`notifications/service.ts`) is blocked by that file's
  stale lint baseline (8 actual vs 4 recorded), and fixing unrelated legacy
  `any`s was out of Phase 1 scope. Moving the call up is a one-liner once that
  debt is repaid.

## Verification (against the live project; mutating probes rolled back)

| Evidence                                           | Result                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Trigger definition (`pg_get_triggerdef`)           | matches the intended `WHEN` clause                                           |
| `debt_message_log` columns + unique partial index  | present                                                                      |
| Analytics flags                                    | `aging=true distinct=true cfg=true branch=true`                              |
| `record_debt_reminder`                             | 9 args, single overload, Arabic literal intact                               |
| Promise probe (receipt payment insert)             | `completed ref=payment`                                                      |
| Aging probe                                        | buckets sum equals `total_receivables` (276.584 = 140 SAR + 56,000/410 YER)  |
| Duplicate reminder call (same key)                 | same `message_log_id`, single row                                            |
| `test_debt_collection_correctness.sql`             | **T1–T10 pass** (T10 added; harness now creates a branch and links the role) |
| `vitest` (debts + bonds)                           | 37/37 incl. 11 new tests                                                     |
| `tsc --noEmit`, lint ratchet, encoding/layer gates | clean                                                                        |

Note: the earlier T3 "drift" was an artifact of deploying the SQL test file as a
PowerShell **string** body (ASCII), which stripped the Arabic literals used by
its comparison. With a UTF-8 **byte** body the test passes — confirming the
encoding rule from ADR-017.

## Consequences

**Positive:** promise status becomes automatic and measurable; duplicate sends can
no longer inflate the log; the Overview shows where the risk sits and drills into
it; collectors get an exportable/printable sheet; managers get proactive alerts.

**Notes / limits:** FIFO-by-promise-date capped by the payment amount is the
agreed rule (no date condition — an early payment closes promises too); a promise
larger than the payment stays pending by design; `debt_message_log.status='failed'`
still has no writer (needs the provider work — Phase 3).

## Rejected alternatives

- **Cap by invoice allocations** instead of the payment amount — allocations are
  written after the payment row in the same transaction, so the trigger cannot
  rely on them.
- **Return Arabic bucket labels from SQL** — keeps the SQL body ASCII and avoids
  the deployment encoding hazard documented in ADR-017.
- **Gating the row action on `accounting:create` only** — the button is hidden
  when the user lacks either permission, so collectors without bond rights keep
  working with reminders and promises.
