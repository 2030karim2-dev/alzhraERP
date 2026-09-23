-- ============================================================
-- Migration: 20260923000001_debt_reminder_honesty_and_followup_actions.sql
-- ============================================================
-- Debt & Collection - S1: reminder honesty + follow-up task visibility
--
-- Deliberately ADDITIVE and ASCII-only (ADR-017 / ADR-018 conventions):
-- NO live debt function is rewritten by this migration.
--
--   A) debt_message_log.delivery_status
--      The honesty axis: separates a MANUAL, provider-unconfirmed send
--      (manual) from a provider-confirmed one (sent/delivered/read) and
--      from a provider failure (failed). record_debt_reminder needs NO
--      change: its INSERT does not list the column, so the DEFAULT manual
--      applies to every row it creates. The explicit write belongs to the
--      dispatch phase, after a live dump.
--
--   B) get_debt_followup_actions(uuid, uuid, integer)
--      NEW read-only RPC surfacing pending scheduled collection actions
--      (customer_activities.status = pending, due today or overdue).
--      Why a new function instead of extending get_debt_today_tasks?
--      Rewriting live debt functions is exactly what broke production in
--      ADR-017; an additive function is safe, isolated and reversible.
--
--   C) customer_activities -> supabase_realtime (guarded + idempotent)
--      Activity writes must refresh other users screens live.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.get_debt_followup_actions(uuid, uuid, integer);
--   ALTER TABLE public.debt_message_log DROP CONSTRAINT IF EXISTS debt_message_log_delivery_status_check;
--   DROP INDEX IF EXISTS public.idx_debt_message_log_delivery;
--   ALTER TABLE public.debt_message_log DROP COLUMN IF EXISTS delivery_status;
--   (the publication change is intentionally NOT rolled back - harmless)
--
-- Verify (live, read-only): supabase/tests/audit_debt_live_state.sql
-- Contract test: supabase/tests/test_debt_collection_correctness.sql -> T11
-- ============================================================

BEGIN;

-- A) honesty axis -------------------------------------------------------
ALTER TABLE public.debt_message_log
  ADD COLUMN IF NOT EXISTS delivery_status character varying(20) NOT NULL DEFAULT 'manual';

ALTER TABLE public.debt_message_log
  DROP CONSTRAINT IF EXISTS debt_message_log_delivery_status_check;

ALTER TABLE public.debt_message_log
  ADD CONSTRAINT debt_message_log_delivery_status_check
  CHECK (delivery_status IN ('manual', 'queued', 'sent', 'delivered', 'read', 'failed'));

CREATE INDEX IF NOT EXISTS idx_debt_message_log_delivery
  ON public.debt_message_log USING btree (company_id, delivery_status, created_at DESC);

COMMENT ON COLUMN public.debt_message_log.delivery_status IS
  'manual = recorded by a user without provider confirmation; queued/sent/delivered/read = provider lifecycle; failed = provider error';

-- B) follow-up action queue (read-only, additive) -----------------------
CREATE OR REPLACE FUNCTION public.get_debt_followup_actions(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_limit integer DEFAULT 50
)
 RETURNS TABLE(
    action_id uuid,
    party_id uuid,
    party_name text,
    party_phone text,
    subject text,
    description text,
    priority character varying,
    scheduled_at timestamp with time zone,
    is_overdue boolean
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_allowed_branches uuid[];
    v_target_branches uuid[];
    v_is_super boolean;
    v_has_all_branches boolean := false;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);
    v_is_super := public.is_super_admin();

    SELECT ARRAY_AGG(b) INTO v_allowed_branches
    FROM public.get_auth_branches(p_company_id) AS b;

    IF v_allowed_branches IS NULL OR ARRAY_LENGTH(v_allowed_branches, 1) = 0 THEN
        IF v_is_super OR current_user IN ('postgres', 'supabase_admin') THEN
            SELECT ARRAY_AGG(id) INTO v_allowed_branches
            FROM public.branches WHERE company_id = p_company_id;
        ELSE
            RETURN;
        END IF;
    END IF;

    IF p_branch_id IS NOT NULL THEN
        IF NOT (p_branch_id = ANY(v_allowed_branches)) AND NOT v_is_super THEN
            RETURN;
        END IF;
        v_target_branches := ARRAY[p_branch_id];
    ELSE
        v_target_branches := v_allowed_branches;
        SELECT (COUNT(*) = (SELECT COUNT(*) FROM public.branches WHERE company_id = p_company_id))
          INTO v_has_all_branches
        FROM unnest(v_allowed_branches);
    END IF;

    RETURN QUERY
    SELECT
        ca.id AS action_id,
        ca.customer_id AS party_id,
        p.name::TEXT AS party_name,
        p.phone::TEXT AS party_phone,
        ca.subject::TEXT,
        ca.description::TEXT,
        ca.priority::VARCHAR,
        ca.scheduled_at,
        (ca.scheduled_at::DATE < v_today) AS is_overdue
    FROM public.customer_activities ca
    JOIN public.parties p ON p.id = ca.customer_id AND p.deleted_at IS NULL
    WHERE ca.company_id = p_company_id
      AND ca.status = 'pending'
      AND ca.scheduled_at IS NOT NULL
      AND ca.scheduled_at::DATE <= v_today
      AND (v_is_super OR v_has_all_branches
           OR p.branch_id IS NULL OR p.branch_id = ANY(v_target_branches))
    ORDER BY ca.scheduled_at ASC, ca.created_at ASC
    LIMIT GREATEST(COALESCE(p_limit, 50), 1);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_debt_followup_actions(uuid, uuid, integer) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_debt_followup_actions(uuid, uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.get_debt_followup_actions(uuid, uuid, integer) IS
  'Pending scheduled collection actions (customer_activities.status = pending) due today or overdue; branch isolated; read-only';

-- C) realtime for collection activities (guarded) ------------------------
DO $do$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime'
             AND schemaname = 'public'
             AND tablename = 'customer_activities'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_activities;
    END IF;
END $do$;

COMMIT;