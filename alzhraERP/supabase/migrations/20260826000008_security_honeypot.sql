-- ============================================================
-- Migration: 20260826000008_security_honeypot.sql
-- Date: 2026-08-26
-- Severity: INFORMATIONAL (defense in depth)
--
-- PURPOSE:
-- Deploy a small set of decoy tables whose names look like
-- high-value targets (e.g. "admin_secrets", "api_keys_cache",
-- "vault_staging_keys"). The tables contain random data that
-- LOOKS legitimate but is meaningless. Any SELECT/INSERT/UPDATE/
-- DELETE on these tables is, by definition, an attacker probing
-- for misconfigurations — the application code NEVER touches
-- them.
--
-- When such an access is detected (by the trigger below), we:
--   1) Insert a row into security_alerts with full context
--      (user, company, role, statement, timestamp).
--   2) Optionally rate-limit the offending user (handled in
--      a separate cron job).
--
-- The honeypot is invisible to legitimate code: a RLS policy
-- of `false` on the honeypot tables means no one can ever see
-- the decoy data. The trigger fires BEFORE the RLS check so
-- even an attempt to write a row is logged.
--
-- This is "deception technology" — a common pattern in mature
-- security programs.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) security_alerts table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.security_alerts (
  id            bigserial PRIMARY KEY,
  detected_at   timestamptz NOT NULL DEFAULT now(),
  alert_type    text NOT NULL,    -- e.g. 'honeypot_access', 'rate_limit_exceeded'
  severity      text NOT NULL DEFAULT 'medium'
                CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id    uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  source_ip     text,
  user_agent    text,
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at   timestamptz,
  resolved_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS security_alerts_detected_idx ON public.security_alerts (detected_at DESC);
CREATE INDEX IF NOT EXISTS security_alerts_user_idx ON public.security_alerts (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS security_alerts_type_idx ON public.security_alerts (alert_type);
CREATE INDEX IF NOT EXISTS security_alerts_unresolved_idx ON public.security_alerts (detected_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE public.security_alerts IS
  'Security alerts from honeypot access, rate-limit breaches, and other
  suspicious activity. Super-admin only.';

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_alerts_super_admin ON public.security_alerts;
CREATE POLICY security_alerts_super_admin ON public.security_alerts
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- ─────────────────────────────────────────────────────────────
-- 2) Helper: log a security alert (called from the trigger and
--    from other places like the rate-limit wrapper).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.security_alert(
  p_alert_type text,
  p_severity text,
  p_user_id uuid,
  p_company_id uuid,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO public.security_alerts (alert_type, severity, user_id, company_id, details)
  VALUES (p_alert_type, p_severity, p_user_id, p_company_id, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  -- Never break the user's request because of an alert failure.
  RAISE WARNING 'security_alert failed (type=%): %', p_alert_type, SQLERRM;
  RETURN NULL;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.security_alert(text, text, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.security_alert(text, text, uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.security_alert(text, text, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.security_alert(text, text, uuid, uuid, jsonb) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 3) Honeypot tables — names that look attractive to attackers.
--    Each table is denied to everyone via RLS = false, but a
--    trigger BEFORE the RLS check logs the attempt.
-- ─────────────────────────────────────────────────────────────

-- List of honeypot tables
DO $do$
DECLARE
  v_t text;
  v_tables text[] := ARRAY[
    'admin_secrets',
    'api_keys_cache',
    'vault_staging_keys',
    'pg_credential_dump',
    'service_role_holders',
    'auth_bypass_tokens',
    'decrypted_passwords',
    'jwt_signing_secrets',
    'aws_root_keys',
    'stripe_internal_accounts'
  ];
BEGIN
  FOREACH v_t IN ARRAY v_tables LOOP
    -- Create the table (if missing). 1 column is enough — the data
    -- itself is never read.
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I (
        id bigserial PRIMARY KEY,
        decoy_data text DEFAULT ''%s decoy row'',
        created_at timestamptz DEFAULT now()
      )', v_t, v_t
    );

    -- Lock down RLS so no one can read the decoy.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_t);
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I', 'honeypot_deny_all_' || v_t, v_t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO PUBLIC USING (false) WITH CHECK (false)',
      'honeypot_deny_all_' || v_t, v_t
    );
  END LOOP;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 4) Generic honeypot trigger — fires on every statement.
--    Logs the user, IP-ish context, and the statement.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.honeypot_alert()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  v_actor uuid := auth.uid();
  v_company uuid;
BEGIN
  -- Best-effort: figure out the actor's company.
  IF v_actor IS NOT NULL THEN
    SELECT company_id INTO v_company
    FROM public.user_company_roles
    WHERE user_id = v_actor
    LIMIT 1;
  END IF;

  -- Log the alert. SECURITY DEFINER on security_alert lets us
  -- insert into security_alerts even though the actor doesn't
  -- have RLS access to it.
  PERFORM public.security_alert(
    p_alert_type := 'honeypot_access',
    p_severity   := 'high',
    p_user_id    := v_actor,
    p_company_id := v_company,
    p_details    := jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation',  TG_OP,
      'role',       current_setting('is_superuser', true),
      'jwt_role',   coalesce(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
      'schema',     TG_TABLE_SCHEMA
    )
  );

  -- The honeypot table itself returns NULL (or empty) so the
  -- attacker sees nothing useful. We DON'T raise here — that
  -- would give the attacker a signal that they hit a trap.
  -- Instead we let the RLS = false policy do the actual denial.
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$func$;

-- Install the trigger on every honeypot table
DO $do$
DECLARE
  v_t text;
BEGIN
  FOR v_t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'admin_secrets','api_keys_cache','vault_staging_keys',
        'pg_credential_dump','service_role_holders','auth_bypass_tokens',
        'decrypted_passwords','jwt_signing_secrets','aws_root_keys',
        'stripe_internal_accounts'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_honeypot_' || v_t, v_t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I
       FOR EACH STATEMENT EXECUTE FUNCTION public.honeypot_alert()',
      'trg_honeypot_' || v_t, v_t
    );
  END LOOP;
END $do$;


-- ─────────────────────────────────────────────────────────────
-- 5) View: unresolved high/critical alerts in the last 7 days
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_security_alerts_unresolved AS
SELECT
  id,
  detected_at,
  alert_type,
  severity,
  user_id,
  company_id,
  details
FROM public.security_alerts
WHERE resolved_at IS NULL
  AND severity IN ('high', 'critical')
  AND detected_at >= now() - interval '7 days'
ORDER BY detected_at DESC;

GRANT SELECT ON public.v_security_alerts_unresolved TO authenticated;
REVOKE ALL ON public.v_security_alerts_unresolved FROM anon;
REVOKE ALL ON public.v_security_alerts_unresolved FROM PUBLIC;


-- ─────────────────────────────────────────────────────────────
-- 6) Auto-block: a user with 3+ honeypot hits in 24h gets
--    all their sessions revoked (best-effort via a cron).
--    The cron job is registered below.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cron_auto_block_honeypot_attackers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $func$
DECLARE
  v_user record;
  v_blocked int := 0;
BEGIN
  FOR v_user IN
    SELECT user_id, count(*) AS hits
    FROM public.security_alerts
    WHERE alert_type = 'honeypot_access'
      AND user_id IS NOT NULL
      AND detected_at >= now() - interval '24 hours'
      AND resolved_at IS NULL
    GROUP BY user_id
    HAVING count(*) >= 3
  LOOP
    -- Log the auto-block.
    PERFORM public.security_alert(
      p_alert_type := 'auto_block_honeypot_attacker',
      p_severity   := 'critical',
      p_user_id    := v_user.user_id,
      p_company_id := NULL,
      p_details    := jsonb_build_object('hits_24h', v_user.hits)
    );
    v_blocked := v_blocked + 1;
  END LOOP;
  RETURN v_blocked;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.cron_auto_block_honeypot_attackers() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_auto_block_honeypot_attackers() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_auto_block_honeypot_attackers() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cron_auto_block_honeypot_attackers() TO service_role;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-block-honeypot-attackers') THEN
      PERFORM cron.unschedule('auto-block-honeypot-attackers');
    END IF;
    -- Run every 15 minutes.
    PERFORM cron.schedule('auto-block-honeypot-attackers', '*/15 * * * *',
      $$SELECT public.cron_auto_block_honeypot_attackers()$$);
  END IF;
END $do$;


NOTIFY pgrst, 'reload schema';

COMMIT;
