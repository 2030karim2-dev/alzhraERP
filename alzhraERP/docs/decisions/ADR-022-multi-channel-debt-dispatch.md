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
