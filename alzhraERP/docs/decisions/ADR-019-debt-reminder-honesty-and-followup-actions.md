# ADR-019: Debt Reminder Honesty & Follow-up Action Visibility (Phase 1B)

## Status

Accepted (2026-09-23)

## Date

2026-09-23

## Context

A deep audit of the debt & collection module (2026-09-23) confirmed two revenue
leaks that were still open after ADR-018, plus one process rule that shapes the fix:

1. **The reminder log claimed a send that never happened.** Reminders are
   dispatched by hand: `ReminderModal` called `record_debt_reminder` **first** and
   only then opened the `wa.me` deep link, while the RPC inserts `status = sent` +
   `sent_at = NOW()` (`20260922000005:147-155`). No provider is wired yet (Phase 3),
   so `sent` was an assumption. Consequence: `last_reminded_at`,
   `reminder_status = reminded` and the `sent_messages` KPI were unverifiable, and a
   customer could silently leave the needs-reminder queue after a message that was
   never delivered.
2. **A scheduled next action had no reader.** `log_collection_activity` writes the
   follow-up appointment into `customer_activities` (`status = pending`,
   `20260922000006:97-107`), but neither `get_debt_today_tasks` (4 task types) nor any
   screen reads it - a write-without-reader, so collectors own commitments were lost.
3. **A deliberate non-goal: rewriting live debt functions.** ADR-017 documents how
   the `patch_rpc_security_part2/3/4` series recreated debt RPCs from stale
   definitions and silently undid accepted fixes. This ADR therefore fixes (1) and (2)
   with additive changes only and **recreates no existing debt function**.

## Decision

### Migration `20260923000001_debt_reminder_honesty_and_followup_actions.sql`

1. **A - honesty axis.** `debt_message_log.delivery_status varchar(20) NOT NULL
DEFAULT manual` + `CHECK (manual|queued|sent|delivered|read|failed)` + index
   `(company_id, delivery_status, created_at DESC)`.
   `record_debt_reminder` is intentionally **not** recreated: its INSERT does not list
   the column, so the DEFAULT marks every manual send as unverified while `status`
   keeps its legacy workflow meaning. The explicit `sent/delivered/read` write belongs
   to the dispatch workstream, after a live function dump.
2. **B - scheduled actions become readable.** New
   `get_debt_followup_actions(uuid, uuid DEFAULT NULL, integer DEFAULT 50)`: pending
   `customer_activities` due today or overdue, joined to the party, branch-isolated via
   `get_auth_branches` plus `fn_assert_company_access` (same contract as the other debt
   readers), `REVOKE` from `anon/PUBLIC`, `GRANT` to `authenticated`.
   Why a new function instead of extending `get_debt_today_tasks`? Because that
   function is live, and ADR-017 forbids casual rewrites of live debt functions.
3. **C - realtime.** `customer_activities` joins `supabase_realtime` through a
   guarded `DO` block (idempotent, no-op when already published).

### Frontend (Component -> Hook -> Service -> API preserved)

- `ReminderModal` now opens WhatsApp **first** and records nothing. A confirmation
  strip (WhatsApp opened - was the message actually sent?) with confirm/cancel
  actions performs the write. A separate honest manual-contact button keeps the
  no-WhatsApp path (the old record-only capability) without pretending a gateway
  send. Success copy reads manual send - delivery unverified, and the mutation toast
  no longer tells the user to press WhatsApp again.
- New `FollowupActionsCard` on the Overview page renders the action queue, marks
  overdue items in red and links to the follow-up screen.
- Layers preserved: `types` -> `debtApi` -> `debtsService` -> `useDebtFollowupActions`
  -> component; the card never calls Supabase.
- `querySyncUtils` debts preset now invalidates `['debts']` as a **prefix** - the
  module keys are `['debts', scope, companyId, ...extra]`, so the previous
  `['debts', companyId]` key never matched and cross-module invalidation was dead.
- `useRealtimeSync` maps `customer_activities` -> `debts` so activity writes refresh
  other users screens.

## Verification

| Evidence                               | Result                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `tsc --noEmit`                         | 0 errors (baseline 0)                                                          |
| lint ratchet (11 changed files)        | within baseline; new files 0                                                   |
| `vitest run src/features/debts`        | all green                                                                      |
| `npm run pre-push`                     | encoding / ts-baseline / classes / fonts / layers / lint-total clean           |
| `test_debt_collection_correctness.sql` | T1-T10 unchanged + **T11** (pending action surfaced, projection intact)        |
| Rollback                               | documented in the migration header (drop function, constraint, index, column)  |
| Live state check                       | `supabase/tests/audit_debt_live_state.sql` (read-only, 12 catalog/data probes) |

## Consequences

**Positive:** the reminder log can no longer claim an unverified send; unverified
sends become explicit (`delivery_status = manual`); the collectors own next actions
are visible; the debts preset invalidation actually works; no live function was
rewritten, so the ADR-017 failure mode cannot repeat.

**Notes / limits:** `status` keeps the legacy `sent` value for the manual path, so
`delivery_status` - not `status` - is the source of truth for verification until the
dispatch workstream writes the provider lifecycle. The confirmation step adds one
deliberate click to the manual flow.

## Rejected alternatives

- **Recreating `record_debt_reminder` to write `delivery_status = manual`
  explicitly** - unnecessary (the DEFAULT covers it) and it would rewrite a live
  function, contradicting ADR-017.
- **Extending `get_debt_today_tasks` with a fifth UNION branch** - same reason; the
  additive reader is isolated, independently testable and easily rolled back.
- **Recording before opening WhatsApp with an unverified flag** - acceptable only
  as a fallback; the confirmation step removes the guess altogether.

## Live application (verified on the production project, 2026-09-23)

Applied through the Supabase Management API as one ASCII transaction (the file is
fully idempotent - re-applying it twice changed nothing).

| Live evidence                                    | Result                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `debt_message_log.delivery_status`               | `character varying NOT NULL DEFAULT ''manual''`                      |
| Existing rows backfilled                         | 7 rows, all `manual` (they were hand-sent `wa.me` reminders)         |
| `debt_message_log_delivery_status_check`         | present, 6 allowed values                                            |
| `idx_debt_message_log_delivery`                  | present                                                              |
| `get_debt_followup_actions(uuid, uuid, integer)` | present, single overload                                             |
| `customer_activities` in `supabase_realtime`     | present (was absent before)                                          |
| Pre-existing debt RPCs                           | signatures unchanged, **no overloads** (42725 guard re-checked live) |
| `test_debt_collection_correctness.sql`           | **T1-T14 pass** (T11 is the new follow-up assertion)                 |
| Residue after the suite (rolls back)             | assignments 0, pending activities 0, test companies 0                |
