# ADR-020: Debt Work Queue & Collector Assignment (Phase 2B)

## Status

Accepted (2026-09-23)

## Date

2026-09-23

## Context

After ADR-018 (Phase 1) and ADR-019 (Phase 1B) the module could tell the truth
about a reminder and could surface scheduled actions, but the audit (2026-09-23)
still recorded three operational blockers:

1. **No work queue.** The follow-up screen is an inventory of customers, not a
   to-do list. Every obligation (invoice due, promise due, broken promise, scheduled
   action, critical aging, failed message) lives in a different function/screen, so a
   collector cannot answer the only question that matters: what do I work on now?
2. **No ownership.** `customer_activities.assigned_to` existed but was never set,
   and there was no record of who owns which customer. Workload and accountability
   were unmeasurable (finding F-04/F-07).
3. **No bulk actions.** The Excel grid already supports selection, but nothing
   consumed it: assigning 40 overdue customers meant 40 manual visits.

## Decision

### Migration `20260923000002_debt_work_queue_and_assignment.sql`

1. **`debt_collector_assignments`** - one ACTIVE assignment per customer per
   company (partial unique index `WHERE is_active`), with `priority`, `notes`,
   `assigned_by`/`assigned_at`, tenant-scoped RLS (`debt_select_assignments` for
   read, `debt_manage_assignments` for writes gated by `user_can_manage_debts()`),
   FKs to companies/parties/profiles, and realtime publication.
2. **`get_debt_task_queue(company, branch, collector, window_days, limit)`** -
   ONE unified queue that unions six obligation sources - invoices due within the
   window, promises due, broken promises, scheduled follow-up actions, critical
   aging customers, failed messages today - and enriches each row with the owner
   (`assigned_to`/`assigned_name`), the urgency/priority and the escalation stage.
   Branch isolation follows the dashboard contract (`get_auth_branches` +
   `fn_assert_company_access`); `p_collector_id` implements the my-accounts view
   without any RLS change (documented default of the modernization plan).
3. **`complete_debt_task(activity_id, outcome, notes, next_action_date)`** -
   idempotent completion: a second call returns the same task with a NULL next
   action, so double-clicks cannot create duplicate follow-ups. Role-gated with
   ERRCODE `42501` so the central error engine renders the unified Arabic
   permission message.
4. **`assign_debt_parties(company, party_ids[], collector, priority, notes)`** -
   bulk assign; `collector = NULL` means unassign (deactivate). Validates that every
   party belongs to the tenant (`INVALID_PARTY`), that the target is a company member
   (`INVALID_COLLECTOR`) and that the list is not empty (`INVALID_PARTY_LIST`).
5. **`get_debt_collectors(company)`** - read-only company members for the picker.

### Frontend (Component -> Hook -> Service -> API preserved)

- New route `#/debts/tasks` plus a first-class tab in the module layout.
- `TasksPage` is the standard `ExcelTable` (frozen header, row numbers, resize,
  selection, pagination, CSV export) with filters for window/collector/type and a
  bulk bar that assigns or unassigns the selected customers from grid selection.
- `TaskCompleteModal` completes a scheduled action with an outcome and an optional
  next action (3-day default computed with `formatLocalDate` - no UTC shift).
- Pure helpers in `lib/taskQueue.ts` (labels, urgency order, per-currency totals,
  `activityIdFromTaskId`) and `lib/rpcErrors.ts` (Arabic messages for server codes),
  all unit-tested; total per-currency totals are never mixed.
- The collector filter is tri-state (`all` / `mine` / a specific member / unmapped)
  where "unassigned" is filtered client-side because the RPC accepts a uuid or NULL.

## Verification

| Evidence                        | Result                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                  | 0 errors                                                                                                                                    |
| lint ratchet (changed files)    | within baseline; every new file 0                                                                                                           |
| `vitest run src/features/debts` | green (S1 43 + new helper suites)                                                                                                           |
| `npm run pre-push`              | encoding / ts-baseline / classes / fonts / layers / lint-total clean                                                                        |
| SQL tests                       | T1-T11 unchanged + **T12** (queue surfaces the action with owner), **T13** (idempotent completion), **T14** (tenant + collector validation) |
| Rollback                        | documented in the migration header                                                                                                          |

## Consequences

**Positive:** one queue answers "what now" per collector and per window; ownership
becomes a recorded fact with an audit trail; bulk assignment turns 40 visits into
one action; the queue is a single place to converge future sources (plans,
disputes) without touching live functions again.

**Notes / limits:** `p_window_days` bounds only date-bearing sources (invoices,
promises, actions) - critical-aging customers are always included so a 30+ day
balance cannot fall out of a narrow window. Bulk completion is intentionally NOT
offered (an outcome per task is a business decision, not a bulk click). The
collector-scoping default remains "everyone sees everything" plus the my-accounts
filter; tightening RLS is a separate owner decision.

## Rejected alternatives

- **Six separate screens/RPCs** - the audit finding is exactly the fragmentation.
- **A new `debt_tasks` table** - obligations are derived from invoices/promises/
  activities; materialising them would duplicate state and risk drift.
- **Bulk completion** - silently inventing outcomes would corrupt the activity log.
- **RLS-level collector scoping in this phase** - it changes visibility for every
  existing user; the additive filter gives the benefit without the risk.

## Live application (verified on the production project, 2026-09-23)

| Live evidence                                                         | Result                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debt_collector_assignments`                                          | 10 columns, 4 foreign keys, priority CHECK, unique partial active index + collector index                                                                                                                                                                                                          |
| RLS                                                                   | enabled, 2 policies (`debt_select_assignments`, `debt_manage_assignments`)                                                                                                                                                                                                                         |
| Realtime                                                              | table published                                                                                                                                                                                                                                                                                    |
| New RPCs                                                              | `get_debt_task_queue`, `complete_debt_task`, `assign_debt_parties`, `get_debt_collectors` - one overload each                                                                                                                                                                                      |
| Queue on real data (company with 59,946 sale invoices, 2,189 parties) | 1,385 `due_today` + 615 `critical_debt` at a 7-day window                                                                                                                                                                                                                                          |
| Performance (`EXPLAIN ANALYZE`, limit 200)                            | **73.4 ms** (indexes `idx_invoices_company_type_status_date` and `idx_invoices_debts_covering` already existed)                                                                                                                                                                                    |
| Write probe, rolled back                                              | assign 1 row -> owner + `assigned_name` visible in the my-accounts queue -> scheduled action completed and next action created -> second call returns a NULL next action and creates no duplicate -> `INVALID_PARTY` / `INVALID_COLLECTOR` raised -> unassign deactivates (active count back to 0) |
| `test_debt_collection_correctness.sql`                                | **T1-T14 pass** (T12/T13/T14 are the new assertions)                                                                                                                                                                                                                                               |

### Two defects found by live execution (fixed before release)

1. **Unnamed CTE columns.** The first branch of the `tasks` CTE projected
   expressions without aliases, so PostgreSQL named them `?column?` and `t.amount`
   failed to resolve at run time (`ERROR 42703`). Every column of the first UNION
   branch now carries an explicit alias. Static reasoning cannot catch this class of
   defect - only real execution can, which is exactly what guardrail G1 asks for.
2. **LIMIT starvation (fairness).** With 615 critical-aging customers, the global
   `ORDER BY urgency ... LIMIT 200` pushed scheduled actions and promises out of the
   page entirely - the type filter would have shown an empty list to a collector who
   really had appointments. The queue now ranks rows **per task type**
   (`ROW_NUMBER() OVER (PARTITION BY task_type)`) and orders by that rank first: on
   live data at limit 200 the page returns 100 critical + 99 due_today + 1 follow_up
   (before the fix: 0 follow_up). Critical-aging rows also now carry the
   dominant-currency amount instead of NULL (`overdue_party` CTE - one row per
   customer, never mixing currencies).
