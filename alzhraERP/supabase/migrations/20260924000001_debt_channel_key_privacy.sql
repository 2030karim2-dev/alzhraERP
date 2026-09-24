-- ============================================================
-- Migration: 20260924000001_debt_channel_key_privacy.sql
-- ============================================================
-- Debt & Collection - Phase 1 remediation (strict audit 2026-09-24).
--
-- H-1: debtApi.getChannelConfig() claimed the provider keys were
-- write-only secrets that "never reach the DOM", yet its SELECT
-- fetched whatsapp_api_key / sms_api_key over the network and only
-- dropped them client-side. messagingApi.getConfig() leaked them the
-- same way via select('*') (it did not even mask sms_api_key).
--
--   A) Generated (STORED) presence flags so clients can show
--      "key configured" WITHOUT receiving the key itself:
--        has_whatsapp_key, has_sms_key, has_telegram_token
--   B) Column-level SELECT privileges: authenticated/anon keep
--      reading every config column EXCEPT the three secrets.
--      The secrets remain writable (INSERT/UPDATE unchanged) and
--      stay fully readable for service_role (edge functions) and
--      SECURITY DEFINER functions running as the owner.
--
-- Known remaining leak (guardrail G1 - live dump required first):
--   get_company_settings() returns row_to_json(messaging_config) and
--   therefore still ships raw keys to any company member. Rewriting
--   that live RPC first needs a live pg_get_functiondef dump - see
--   probe 13 in supabase/tests/audit_debt_live_state.sql.
--
-- ASCII-only body (ADR-017 deployment convention).
--
-- Rollback:
--   REVOKE SELECT ON public.messaging_config FROM authenticated, anon;
--   GRANT SELECT ON public.messaging_config TO authenticated, anon;
--   ALTER TABLE public.messaging_config DROP COLUMN IF EXISTS has_whatsapp_key;
--   ALTER TABLE public.messaging_config DROP COLUMN IF EXISTS has_sms_key;
--   ALTER TABLE public.messaging_config DROP COLUMN IF EXISTS has_telegram_token;
--
-- Verify (live, read-only): supabase/tests/audit_debt_live_state.sql probe 13
-- Contract tests: supabase/tests/test_debt_collection_correctness.sql -> T19, T20
-- ============================================================

BEGIN;

-- A) server-computed presence flags (no key material crosses the wire) ----
ALTER TABLE public.messaging_config
  ADD COLUMN IF NOT EXISTS has_whatsapp_key boolean
    GENERATED ALWAYS AS (COALESCE(whatsapp_api_key, '') <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_sms_key boolean
    GENERATED ALWAYS AS (COALESCE(sms_api_key, '') <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_telegram_token boolean
    GENERATED ALWAYS AS (COALESCE(telegram_bot_token, '') <> '') STORED;

COMMENT ON COLUMN public.messaging_config.has_whatsapp_key IS
  'Generated presence flag (H-1): lets clients mask the UI without fetching whatsapp_api_key.';
COMMENT ON COLUMN public.messaging_config.has_sms_key IS
  'Generated presence flag (H-1): lets clients mask the UI without fetching sms_api_key.';
COMMENT ON COLUMN public.messaging_config.has_telegram_token IS
  'Generated presence flag (H-1): lets clients mask the UI without fetching telegram_bot_token.';

-- B) column-level SELECT: drop table-wide read, re-grant all but secrets ---
REVOKE SELECT ON public.messaging_config FROM authenticated, anon;

GRANT SELECT (
    id, company_id, created_at, updated_at,
    telegram_enabled, telegram_chat_id,
    whatsapp_enabled, whatsapp_api_url, whatsapp_phone,
    sms_enabled, sms_api_url, sms_sender_id,
    notify_on_sale, notify_on_purchase, notify_on_expense,
    notify_on_stock_transfer, notify_on_low_stock, notify_on_payment_bond,
    has_whatsapp_key, has_sms_key, has_telegram_token
  )
  ON public.messaging_config TO authenticated;

-- anon had no legitimate reader for messaging configuration (every caller
-- is authenticated or service_role); keep it at zero columns.

NOTIFY pgrst, 'reload schema';

COMMIT;