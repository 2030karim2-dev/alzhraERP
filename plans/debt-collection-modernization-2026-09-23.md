# Debt & Collection Modernization Plan (2026-09-23)

Professional, strict execution plan for auditing, fixing, improving and extending
the debt & collection module (`src/features/debts/**`). Companion ADRs: 019+.

Scope of the audited baseline: 48 files / ~7k lines, 5 debt tables, 12 RPCs,
14 debt migrations, `customer_activities`, 4 debt screens, 1 reports screen.

---

## 0. Guardrails (non-negotiable)

| # | Rule | Why (real evidence) |
| --- | --- | --- |
| G1 | No surgery on live debt functions without a live `pg_get_functiondef` dump first | `patch_rpc_security_part2/3/4` broke production by recreating RPCs from stale bodies (ADR-017) |
| G2 | Additive changes by default (new column / function / table) | ADR-017 forbids applying `20260922000001` to live for this reason |
| G3 | Any signature change = DROP + CREATE + REVOKE/GRANT + explicit contract test | 42725 ambiguity and silent PGRST202 (ADR-017 section 3) |
| G4 | SQL is the source of truth (no KPI/aging/classification math in components) | dual aging sources: SQL vs `DebtAgingReport.tsx` |
| G5 | Layers: Component -> Hook -> Service -> API -> Supabase | `check:layers` gates |
| G6 | 0 type errors (`scripts/ts-error-baseline.txt`), 0 new lint errors in new files | `pre-push` gate chain |
| G7 | Every migration ships with a numbered SQL test | existing T1-T10 convention |
| G8 | No new dependency and no schema change without explicit approval | .clinerules boundaries |
| G9 | `ExcelTable` is the standard grid for every tabular screen | project standard (~15 screens) |
| G10 | Business dates via `formatLocalDate` (never `toISOString` for transactions) | AGENTS.md section 2 |

---

## 1. Measurable baseline (S0 evidence)

| Metric | How measured | Target |
| --- | --- | --- |
| Quality gates | `npm run type-check`, `check-lint-ratchet`, `pre-push`, `vitest run src/features/debts` | 0 errors, ratchet clean, all green |
| SQL contract tests | `test_debt_collection_correctness.sql` | T1-T11 pass |
| Unverified rows in `debt_message_log` | `GROUP BY status` + `delivery_status` | after S1 every row is explicitly tagged |
| Scheduled actions with no reader | `customer_activities.status = pending` count | after S1: 0 invisible |
| Activities without owner | `assigned_to IS NULL` count | after S2: 0 created via the queue |
| Aging correctness | SQL `aging` vs client computation | after S5: single source, 0 delta |
| File size | `node scripts/audit-file-complexity.mjs --min-lines 300` | no new file above 300 lines |

Live probing is done with `supabase/tests/audit_debt_live_state.sql` (read-only, 12 probes).

---

## 2. Traceability matrix (finding -> task -> acceptance)

| ID | Finding (evidence) | Task | Acceptance |
| --- | --- | --- | --- |
| F-01 | reminder logged `sent` before dispatch (`20260922000005:147-155`) | **S1-T2 (done)** | no write before an explicit human confirmation |
| F-02 | no writer for `failed` yet a dead task branch exists | S1-T1 (done) + S3 | provider writes the delivery lifecycle |
| F-03 | next action written with no reader (`20260922000006:97-107`) | **S1-T3/T4/T5 (done)** | 100% of due actions visible on the Overview |
| F-04 | `assigned_to` always NULL | S2-T2/T3 | every queued commitment has an owner |
| F-05 | opening balances not posted to the GL | S5-T3 (decision) | documented posting or explicit ADR + UI warning |
| F-06 | two aging sources | S5-T2 | SQL only |
| F-07 | no assignment / queue / SLA / scoping | S2 | one work queue per collector + SLA |
| F-08 | no dispatch automation | S3 | scheduled cadence + kill switch |
| F-09 | messaging infrastructure unused by debts | S3-T1/T2 | module uses the central messaging path |
| F-10 | no caps / quiet hours / opt-out / template governance | S3-T4/T6 | server-enforced + tested |
| F-11 | no installment plans | S4-T1/T2 | plan + auto matching + pre-due reminder |
| F-12 | no disputes, escalation inert, credit hold manual | S4-T3/T4 | dispute pauses collection; hold needs owner approval |
| F-13 | no bulk actions | S2-T5 | bulk remind/assign from grid selection |
| F-14 | no self-service / payment links | S6 | business decision + design |
| F-15 | alerts only inside the module | S5-T4 | global health cycle (after the lint debt is repaid) |
| F-16 | no collection KPIs | S5-T1 | DSO / CEI / roll-rate / promise-keeping / collector scorecard |
| F-17 | shallow aging, no trends | S5-T2 | 91-180 / 180+ buckets + trend series |
| F-18 | layer violation + client math | S5-T2/T5 | Hook -> Service -> API, `check:layers` clean |
| F-19 | grid inconsistency | S5-T5 | promises/outbox on `ExcelTable` |
| F-20 | debts preset keys never matched | **S1-T7 (done)** | one prefix invalidation covers all module keys |
| F-21 | `customer_activities` outside the realtime map | **S1-T7 (done)** | live refresh on activity writes |
| F-22 | duplicated currency RPC names | S5-T6 | single documented function |
| F-23 | live vs repo drift | S0 + every phase | every migration preceded by a live dump |

---

## 3. Phases

### S0 - baseline and live verification (0.5 day) - gate G0

1. Gate snapshot (tsc, ratchet, vitest, pre-push).
2. Run `test_debt_collection_correctness.sql` (T1-T10) on the live project.
3. Run `supabase/tests/audit_debt_live_state.sql` (read-only) and archive the output
   under `docs/archive/live-dumps/`.
4. Dump `pg_get_functiondef` for the six live debt functions before touching them.

Exit: everything archived, zero code changes.

### S1 - honesty and visibility (1-2 days) - gate G1  [IMPLEMENTED]

| Task | Deliverable | Status |
| --- | --- | --- |
| S1-T1 | `delivery_status` column + CHECK + index | done |
| S1-T2 | honest reminder flow (open first, confirm, then record) | done |
| S1-T3 | `get_debt_followup_actions` RPC (additive) | done |
| S1-T4 | types -> api -> service -> hook | done |
| S1-T5 | `FollowupActionsCard` on the Overview | done |
| S1-T6 | manual-contact button + honest copy + toast | done |
| S1-T7 | preset keys fix + realtime map entry | done |
| S1-T8 | SQL T11 + ADR-019 | done |

Exit: T11 green, gates clean, ADR-019 accepted.

### S2 - work queue, assignment, bulk actions (4 days) - gate G2

`debt_collector_assignments` (+RLS, indexes, audit) - `get_debt_task_queue(
company, branch, collector, window)` unifying due-today, promise-due, broken
promise, failed message, scheduled action and critical aging with `assigned_to` -
`complete_debt_task(...)` idempotent - `#/debts/tasks` on `ExcelTable` - owner column
and bulk remind/assign/export from grid selection. Tests T12-T14.

### S3 - automated multi-channel dunning (7 days) - gate G3

`debt_cadence_steps` (stage -> channel -> offset -> template), Edge function
`debt-reminder-dispatch` reusing `messagingService`/`send-notification`,
`debt_reminder_queue`, guarded `pg_cron` enqueue, `debt-delivery-webhook` writing
delivered/read/failed, quiet hours, daily caps, `debt_opt_outs`, template approval,
queue monitor with retry, global kill switch.

### S4 - payment plans, disputes, credit holds (5 days) - gate G4

`debt_payment_plans` + `debt_payment_plan_installments` with automatic receipt
matching (extending the A1 trigger), pre-due reminders and breach detection;
`debt_disputes` with SLA and collection pause; tiered credit hold requiring
`owner/admin` approval; final-demand notice pack (PDF, logged).

### S5 - measurement and architectural consistency (4 days) - gate G5

`get_collection_kpis` (DSO, CEI, roll-rate, promise-keeping rate, contact coverage,
average days to collect, recovery per stage, collector scorecard); `#/debts/analytics`
with trend charts; single aging source + `DebtAgingReport` moved behind a hook;
deep aging buckets; promises/outbox on `ExcelTable`; deprecation of the duplicated
currency RPC; collector targets linked to the commissions module.

### S6 - self-service and payments (business decision)

Signed statement/payment links, local gateways, webhook reconciliation, separate ADR.

---

## 4. Quality system

| Gate | Command | Limit |
| --- | --- | --- |
| Types | `npm run type-check` | 0 |
| Per-file lint | `node scripts/check-lint-ratchet.mjs --files=...` | <= baseline, new files 0 |
| Pre-push chain | `npm run pre-push` | full pass |
| Unit tests | `npx vitest run src/features/debts` | all green |
| SQL contract | `test_debt_collection_correctness.sql` | T1-T11+ pass |
| Layers | `npm run check:layers` | clean |
| Complexity | `audit-file-complexity.mjs --min-lines 300` | no new file above 300 |
| E2E | `npm run test:e2e` | 2 critical journeys from S1/S2 |

Definition of done per task: complete code, no `any`, Arabic UI, local dates,
permissions enforced (UI + `assertPermission` + RPC/RLS), a test proving behaviour,
types updated, before/after measurement, docs/ADR when a decision is made, and no
commit until explicitly requested.

Migration runbook: verify live (dump) -> additive SQL (ASCII comments per ADR-018)
-> constraints/indexes -> REVOKE/GRANT -> idempotent guards -> rollback in the
header -> SQL test -> record the result in an ADR.

---

## 5. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | live/repo drift corrupts healthy functions | high | critical | G1/G2 + S0 dump + additive only |
| R2 | 42725 / silent PGRST202 | medium | high | G3 + contract test per signature change |
| R3 | missing prerequisite object (realtime publication) | medium | medium | guarded DO block + S0 probe |
| R4 | concurrent session editing debt files | high | medium | declared file scope + `git status` before/after each batch |
| R5 | WhatsApp provider unavailable or costly | high | medium | S3 starts from honest manual, then WABA/SMS |
| R6 | multi-channel privacy violations | medium | high | opt-out + caps + quiet hours + full audit |
| R7 | erroneous credit hold blocks sales | medium | high | owner approval + audit trail + instant rollback |
| R8 | payment plans corrupt accounting | low | critical | isolated tables, no automatic posting |
| R9 | lint/type inflation from new code | medium | low | new files must be 0 |
| R10 | misleading DSO under multi-currency | medium | medium | base-currency metrics + by-currency breakdown |

---

## 6. KPI targets

| KPI | Baseline | Target | Phase |
| --- | --- | --- | --- |
| Unverified rows untagged | 100% | 0 | S1 (done) |
| Invisible scheduled actions | > 0 | 0 | S1 (done) |
| Commitments without owner/date | 100% | 0 | S2 |
| Weekly contact coverage for 30+ days overdue | not measured | >= 90% | S2 + S5 |
| Promise-keeping rate | not measured | >= 70% | S4 + S5 |
| DSO | not measured | -10 to -20% in 90 days | S5 |
| 90+ day share of receivables | not measured | -15% in 120 days | S4 + S5 |
| First contact after delinquency | manual | <= 48h automated | S3 |

---

## 7. Pending decisions (defaults applied if not stated)

1. Dispatch provider: honest manual now, WABA/SMS later (no plan blocking).
2. Collector visibility: everyone sees everything + my-accounts filter first, RLS
   tightening afterwards.
3. Credit hold: recommendation at stage legal, `owner/admin` approval required.
4. Installments: isolated tables, no automatic GL posting.
5. Live verification before every migration: mandatory.

---

## 8. Out of scope

No full CRM, no live-function rewrites, no KPI math in components, no new
dependencies without approval, no signature change without a DROP/GRANT/contract
plan, no touching invoices/parties collection logic except hardened triggers with an
ADR, no `any`, no commit without explicit request.

---

## 9. Execution status (updated 2026-09-23)

### S0 - baseline and live verification: DONE

| Check | Live result |
| --- | --- |
| Debt RPC signatures | all healthy, **zero overloads** (no 42725 risk) |
| `debt_followup_config.stage_*` / `debt_message_log.idempotency_key` | present |
| `delivery_status`, `debt_collector_assignments`, the new RPCs | absent before S1/S2 (as planned) |
| `trg_complete_promises_on_payment` + `break-overdue-promises-daily` cron | present and active |
| `customer_activities` in `supabase_realtime` | absent (finding F-21 confirmed) |
| RLS | enabled on all six debt/activity tables |
| Honesty baseline | 7 `sent` rows (all hand-sent), 0 customers marked reminded in the last 3 days, 0 orphan scheduled actions |
| Data volume | 2,208 parties, 60,057 sale invoices, 1 config row |

### S1 and S2: DONE and deployed

- Both migrations applied to the production project and verified column by column,
  function by function, policy by policy (see ADR-019 / ADR-020 "Live application").
- `test_debt_collection_correctness.sql` **T1-T14 pass** on live data; the suite
  rolls back, and the residue check returned zero new rows.
- Queue performance on 60k invoices: **73.4 ms** at limit 200.
- Two defects were found **only** by live execution and fixed before release:
  unnamed CTE columns (42703) and LIMIT starvation (fair per-type ranking).
- Lesson for the remaining phases: keep every migration ASCII-only, deploy as a
  UTF-8 **byte** body (a PowerShell string body silently strips Arabic literals -
  ADR-017), and execute on live data before declaring done.

### Next: S3 (automated multi-channel dunning)

Blocked on one decision only: the dispatch provider (WABA / SMS / stay with the
honest manual flow). Everything else in S3 is provider-agnostic.
