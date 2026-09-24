# ADR-022: Multi-Channel Debt Dispatch (WhatsApp + SMS)

## Status

Accepted (2026-09-23)

## Date

2026-09-23

## Context

S1 made the reminder log honest (a manual `wa.me` send can no longer claim a
delivery). S2 added the work queue and collector ownership. Neither could actually
SEND anything from the system: every message left through a human and a phone.
`send-notification` already knew how to talk to WhatsApp (Meta Cloud API and
CallMeBot), but the debt module never used it, there was no outbound queue, no
cadence, no opt-out list, no quiet hours and no per-customer daily cap.

## Decision

### Migration `20260923000004_debt_multi_channel_dispatch.sql`

1. **Provider configuration** - `messaging_config` gains the SMS provider fields
   (`sms_enabled`, `sms_api_url`, `sms_api_key`, `sms_sender_id`). WhatsApp keeps its
   existing fields, so WhatsApp and SMS share ONE configuration row per company.
2. **Governance** - `debt_followup_config` gains `auto_send_enabled` (default
   false), `preferred_channel`, `quiet_start_hour`/`quiet_end_hour` (default 21/08) and
   `daily_cap_per_party` (default 1). Nothing sends until the owner switches auto-send on.
3. **`debt_cadence_steps`** - seven steps keyed to day offsets from the oldest due
   date (pre-due -3, due 0, 1, 16, 31, 61 and 90+), each bound to a template from the
   ADR-021 library and to a channel (WhatsApp through day 31, SMS for the 61+ escalation).
4. **`debt_opt_outs`** - per customer, per channel (or `all`); the queue refuses to
   enqueue for an opted-out customer.
5. **`debt_reminder_queue`** - the outbound queue (status queued/sending/sent/failed/
   cancelled, attempts, backoff, provider id, error, idempotency key).
6. **RPCs** - `enqueue_debt_reminder` (single, idempotent, opt-out aware),
   `claim_debt_reminders` (SKIP LOCKED claim, service_role only),
   `log_debt_reminder_result` (writes the queue row **and** the honest
   `debt_message_log` row: `delivery_status = sent` on success, `failed` after the
   third attempt - the writer ADR-019/audit found missing), `get_debt_reminder_queue`
   (UI), `render_debt_template` (SQL mirror of the frontend renderer,
   `{{invoice_number}}` renders empty by design), `reap_stuck_debt_reminders`
   (requeues rows stuck in `sending` for 15+ minutes).
7. **Automation** - `cron_enqueue_debt_reminders()` (hourly) materialises due cascade
   steps honouring quiet hours, caps, opt-outs and an idempotency key of
   `cadence:<company>:<party>:<step>:<date>`; `cron_dispatch_debt_reminders()` (every 10
   minutes) reaps, enqueues and POSTs to the edge function through `pg_net`, with the
   URL and service key read from **Vault** (nothing hard-coded).

### Edge function `debt-reminder-dispatch` (deployed)

Claims up to N queue rows, sends each through WhatsApp (Meta Cloud API when the URL
points at graph.facebook.com, CallMeBot otherwise) or SMS (generic gateway POST with
the key in the header and body), then logs the result. Two callers: the cron (service
key) drains every company; the app (user JWT + `company_id`) drains one company and
is gated to owner/admin/manager/accountant. Service detection accepts both key
generations (a JWT whose payload role is `service_role`, or an opaque key equal to
the `SUPABASE_SERVICE_ROLE_KEY` env value).

### Frontend

`ChannelSettingsCard` on the debts settings page turns each channel on and stores its
endpoint/key/sender in the shared `messaging_config` row (keys are write-only: an
empty field keeps the stored value).

## Verification (all on live production data)

| Evidence                       | Result                                                                                                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tables/RLS                     | `debt_reminder_queue`, `debt_cadence_steps`, `debt_opt_outs` - RLS + 2 policies each                                                                                                                                                                                                              |
| Cadence seed                   | 3 companies x 7 steps (pre-due intentionally disabled)                                                                                                                                                                                                                                            |
| Config columns                 | all 9 present                                                                                                                                                                                                                                                                                     |
| Cron                           | `debt-enqueue-reminders-hourly` + `debt-dispatch-reminders` active                                                                                                                                                                                                                                |
| Privileges                     | `claim_debt_reminders` / `log_debt_reminder_result` / reaper are **service_role only**                                                                                                                                                                                                            |
| Functional probe (rolled back) | render 1,234.50 SAR OK, `{{invoice_number}}` empty, enqueue idempotent, `OPTED_OUT` raised, claim returns party data, success -> queue `sent` + log row `delivery_status=sent` with provider id, transient failure -> `queued/attempts=1`, final failure -> `failed` + log row `failed`, reaper 0 |
| Edge function                  | deployed; service-key invocation returns `{processed:0,sent:0,failed:0}` (HTTP 200)                                                                                                                                                                                                               |
| Vault                          | `debt_dispatch_url` + `debt_dispatch_service_key` stored                                                                                                                                                                                                                                          |

## Hardening pass — migration `20260923000005_debt_dispatch_hardening.sql`

A strict audit of S1–S3 found three defects that would have caused visible damage on
the first real run, plus weaker gaps. Wave 1 fixed them additively (`CREATE OR
REPLACE` only, per ADR-017 — no live function was rewritten destructively):

| #    | Defect                                                                                                                                                                                              | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-A | The S3 engine was **not startable from the UI**: `auto_send_enabled`, quiet hours and the daily cap existed only in SQL.                                                                            | New `AutoSendSettingsCard` on the debts settings page (`auto_send_enabled`, quiet window, daily cap, default country code) saved through the existing `saveFollowupConfig`; the four new columns are exposed in the generated types.                                                                                                                                                                                                              |
| P0-1 | `getChannelConfig` returned the raw provider keys, they were rendered into the DOM as input values, and saving a blank field **silently wiped** the stored key (the helper text claimed otherwise). | `DebtChannelConfig` now exposes `has_whatsapp_key` / `has_sms_key` booleans; the fetched keys are dropped in the API layer and never reach state or the DOM. Keys are write-only: an empty field is not sent, and `updateChannelConfig` ignores empty/absent keys. The card shows a «مضبوط ✓» badge instead.                                                                                                                                      |
| P0-2 | The dispatcher treated a missing provider or an invalid phone as a **failure**: running it would have produced mass `failed` log rows (and `failed_message` tasks) while sending nothing.           | `claim_debt_reminders` now claims only rows whose channel is enabled **and** whose provider URL/key are configured (the row simply stays `queued`, attempts untouched). The dispatcher cancels an unusable recipient (`release_debt_reminder(..., cancel => true)`) and re-queues an unconfigured provider — **no failure log**; a new `skipped` counter is returned. `cron_enqueue_debt_reminders` gates enqueueing on the same readiness check. |
| P1-1 | `whatsapp_enabled` / `sms_enabled` were never enforced.                                                                                                                                             | Enforced in both the claim and the enqueue gate.                                                                                                                                                                                                                                                                                                                                                                                                  |
| P1-2 | The UI gate (`debts:manage`) and the RPC gate (`user_can_manage_debts` = role list) disagreed.                                                                                                      | `user_can_manage_debts` accepts the role list **or** `has_permission(company, 'debts:manage')`.                                                                                                                                                                                                                                                                                                                                                   |
| P1-3 | `authenticated` held INSERT/UPDATE/DELETE/TRUNCATE on `debt_reminder_queue`, letting a client forge a `sent` status or delete evidence.                                                             | Writes revoked: clients have `SELECT` only; every write goes through the SECURITY DEFINER RPCs (`enqueue_debt_reminder`, `log_debt_reminder_result`, `release_debt_reminder`).                                                                                                                                                                                                                                                                    |
| P1-6 | Local phone numbers (`077xxxxxxx`) were never normalised, so gateways rejected them.                                                                                                                | `default_country_code` (default `967`, validated `^[0-9]{1,5}$`) is prefixed for 9-digit numbers and for 10-digit numbers starting with `0`; `00`/`+` prefixes are stripped. Verified: `777123456`, `0777123456`, `+967 777 123 456`, `00967777123456` all render `967777123456`.                                                                                                                                                                 |
| P2-5 | The hourly enqueue returned a non-zero "inserted" count even when nothing was written.                                                                                                              | Honest counter via `GET DIAGNOSTICS ... ROW_COUNT` per insert.                                                                                                                                                                                                                                                                                                                                                                                    |
| P2-7 | The three new S3 tables were missing from the realtime preset map.                                                                                                                                  | `debt_reminder_queue`, `debt_cadence_steps` and `debt_opt_outs` added to the `debts` preset in `useRealtimeSync`.                                                                                                                                                                                                                                                                                                                                 |

### Evidence (live, 2026-09-23)

| Check                                                           | Result                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Granted privileges on `debt_reminder_queue` for `authenticated` | `SELECT` only (T16)                                                     |
| Claim with **no** provider configured                           | `0` rows claimed, queue row still `queued` with `attempts = 0` (T17)    |
| Claim once the provider is saved                                | `1` row claimed, `attempts = 1` (T17)                                   |
| Skip an unusable recipient                                      | status `cancelled` + reason stored, **0** `debt_message_log` rows (T17) |
| `auto_send_enabled = false` + hourly cron                       | `0` cadence rows enqueued (T18)                                         |
| `default_country_code`                                          | default `967`; `abcd` rejected by check constraint (T18)                |
| Full suite `test_debt_collection_correctness.sql`               | **T1–T18 pass** on live inside a rolled-back transaction                |
| `debt-reminder-dispatch`                                        | redeployed (skip-aware)                                                 |

## Consequences

**Positive:** the system can finally send, not just record. Automated sends are
provider-verified, capped, quiet-hour aware and opt-out aware; failures are visible
and retried; SMS reaches customers who never answer WhatsApp; escalating from
WhatsApp to SMS happens by configuration, not by code.

**Notes / limits:** automated sending stays OFF until `auto_send_enabled` is switched
on. Quiet hours are evaluated in `Asia/Riyadh` (GMT+3) - a per-company timezone is a
future addition. The SMS gateway adapter is intentionally generic (POST JSON with the
key in the header and body); a provider that needs a different shape only needs one
function changed in the edge function. The service key also lives in Vault, so
rotating it requires updating that secret.

## Rejected alternatives

- **Hard-coding one SMS provider** - the region has several gateways and they change.
- **Sending directly from the client** - provider keys would leak to the browser.
- **A separate queue per channel** - one queue with a channel column keeps the
  monitoring, retries and caps in one place.
- **Sending immediately from `cron_enqueue`** - pg_cron must stay pure SQL; the HTTP
  call belongs to `pg_net` + the edge function, and queuing first makes retries safe.
