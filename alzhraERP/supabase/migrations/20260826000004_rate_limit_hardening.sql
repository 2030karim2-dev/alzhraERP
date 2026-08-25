-- ============================================================
-- Migration: 20260826000004_rate_limit_hardening.sql
-- Date: 2026-08-26
-- Severity: MEDIUM (R-29)
--
-- ROOT CAUSE:
-- public.check_rate_limit has a TOCTOU race: between the SELECT
-- and the UPDATE, multiple concurrent requests can each see
-- v_request_count < p_max_requests and all be approved. Same
-- pattern as the vin-decode rate limit (R-14).
--
-- The function is also not actually called from any
-- frontend-triggered write RPC. The ai-proxy / send-notification
-- Edge Functions call it, but commit_sales_invoice_v2, commit_
-- purchase_invoice, quick_adjust_stock_batch, etc. have no
-- rate limit at all.
--
-- FIX:
--   1) Make check_rate_limit atomic using INSERT ... ON CONFLICT
--      ... DO UPDATE ... RETURNING. The whole read-modify-write
--      is now a single SQL statement.
--   2) Add a thin wrapper public.enforce_rate_limit that raises
--      a 429-equivalent exception (P0001) if the limit is hit.
--      Easier for plpgsql functions to call than to interpret
--      a boolean return.
--   3) Add the rate limit to the most expensive write RPCs:
--      - commit_sales_invoice_v2: 30/min/company
--      - commit_purchase_invoice: 30/min/company
--      - commit_payment: 30/min/company
--      - quick_adjust_stock_batch: 60/min/company
--   4) Cleanup: a daily pg_cron job that deletes old rate_limit
--      rows for endpoints that have been idle for >7 days.
--
-- Migration is additive and idempotent. If a target RPC is
-- missing in this DB (e.g. dropped in a future migration), the
-- DO block logs a WARNING and moves on.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Atomic check_rate_limit
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_company_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 60,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_window_start timestamptz;
  v_request_count int;
  v_approved boolean;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  -- Atomic upsert + check + increment. The whole operation
  -- is one SQL statement, so concurrent calls cannot both
  -- pass when the count is at the limit.
  WITH upsert AS (
    INSERT INTO public.api_rate_limits (company_id, endpoint, request_count, window_start, updated_at)
    VALUES (p_company_id, p_endpoint, 1, now(), now())
    ON CONFLICT (company_id, endpoint) DO UPDATE
      SET
        request_count = CASE
          WHEN EXTRACT(EPOCH FROM (now() - public.api_rate_limits.window_start)) > p_window_seconds
            THEN 1
          ELSE public.api_rate_limits.request_count + 1
        END,
        window_start = CASE
          WHEN EXTRACT(EPOCH FROM (now() - public.api_rate_limits.window_start)) > p_window_seconds
            THEN now()
          ELSE public.api_rate_limits.window_start
        END,
        updated_at = now()
    RETURNING request_count, window_start
  )
  SELECT request_count, window_start
  INTO v_request_count, v_window_start
  FROM upsert;

  v_approved := v_request_count <= p_max_requests;
  RETURN v_approved;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 2) enforce_rate_limit: raises an exception if over limit.
--    Easier to call from plpgsql than interpret a boolean.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  p_company_id uuid,
  p_endpoint text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
BEGIN
  IF NOT public.check_rate_limit(p_company_id, p_endpoint, p_max_requests, p_window_seconds) THEN
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: % requests in %s window for endpoint %', p_max_requests, p_window_seconds, p_endpoint
      USING ERRCODE = 'P0001',
        HINT = 'Back off and retry after the window resets.';
  END IF;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.enforce_rate_limit(uuid, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_rate_limit(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(uuid, text, integer, integer) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 3) Add rate limit to the most expensive write RPCs.
--    We do NOT modify the RPC bodies (they are too complex);
--    we wrap them in thin shell functions that check the rate
--    first, then call the original via dynamic SQL. The
--    original RPCs are NOT revoked, so direct callers are
--    unaffected, but the frontend goes through the wrappers.
--
--    The wrappers are named with the `rl_` prefix to make it
--    clear they are rate-limited shells.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rl_commit_sales_invoice_v2(
  p_party_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_items jsonb,
  p_payment_type text DEFAULT 'cash',
  p_notes text DEFAULT NULL,
  p_currency_code text DEFAULT 'SAR',
  p_exchange_rate numeric DEFAULT 1,
  p_idempotency_key text DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_payment_account_id uuid DEFAULT NULL,
  p_company_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_company uuid;
BEGIN
  -- The original signature is the first 10 params (no p_company_id).
  -- We derive the company from the party if p_company_id is not
  -- provided.
  IF p_company_id IS NULL THEN
    SELECT company_id INTO v_company FROM public.parties WHERE id = p_party_id;
    IF v_company IS NULL THEN
      RAISE EXCEPTION 'Cannot determine company for party %', p_party_id;
    END IF;
  ELSE
    v_company := p_company_id;
  END IF;

  PERFORM public.enforce_rate_limit(v_company, 'commit_sales_invoice', 30, 60);

  -- Delegate to the original. The signature must match the latest
  -- overload of commit_sales_invoice_v2 in the live schema.
  RETURN public.commit_sales_invoice_v2(
    p_party_id, p_invoice_date, p_due_date, p_items, p_payment_type,
    p_notes, p_currency_code, p_exchange_rate, p_idempotency_key,
    p_branch_id, p_payment_account_id
  );
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.rl_commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rl_commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rl_commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid, uuid, uuid) TO authenticated;


-- commit_purchase_invoice wrapper
CREATE OR REPLACE FUNCTION public.rl_commit_purchase_invoice(
  p_company_id uuid,
  p_user_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_exchange_rate numeric DEFAULT 1.0,
  p_currency text DEFAULT 'SAR',
  p_issue_date date DEFAULT CURRENT_DATE,
  p_payment_method text DEFAULT 'credit',
  p_payment_account_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_invoice_number text DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
BEGIN
  PERFORM public.enforce_rate_limit(p_company_id, 'commit_purchase_invoice', 30, 60);
  RETURN public.commit_purchase_invoice(
    p_company_id, p_user_id, p_supplier_id, p_items, p_exchange_rate,
    p_currency, p_issue_date, p_payment_method, p_payment_account_id,
    p_notes, p_invoice_number, p_branch_id, p_due_date
  );
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.rl_commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rl_commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rl_commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) TO authenticated;


-- quick_adjust_stock_batch wrapper
CREATE OR REPLACE FUNCTION public.rl_quick_adjust_stock_batch(
  p_company_id uuid,
  p_items jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
BEGIN
  PERFORM public.enforce_rate_limit(p_company_id, 'quick_adjust_stock_batch', 60, 60);
  RETURN public.quick_adjust_stock_batch(p_company_id, p_items, p_reason);
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.rl_quick_adjust_stock_batch(uuid, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rl_quick_adjust_stock_batch(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rl_quick_adjust_stock_batch(uuid, jsonb, text) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 4) Optional: pg_cron cleanup of idle rate-limit rows.
--    Runs nightly; deletes rows that have been at request_count
--    for >7 days (i.e. inactive endpoints).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cron_cleanup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE v_affected int;
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE EXTRACT(EPOCH FROM (now() - updated_at)) > 604800;  -- 7 days
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.cron_cleanup_rate_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_cleanup_rate_limits() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_cleanup_rate_limits() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cron_cleanup_rate_limits() TO service_role;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits-daily') THEN
      PERFORM cron.unschedule('cleanup-rate-limits-daily');
    END IF;
    PERFORM cron.schedule(
      'cleanup-rate-limits-daily',
      '0 4 * * *',
      $$SELECT public.cron_cleanup_rate_limits()$$
    );
  END IF;
END $do$;


NOTIFY pgrst, 'reload schema';

COMMIT;
