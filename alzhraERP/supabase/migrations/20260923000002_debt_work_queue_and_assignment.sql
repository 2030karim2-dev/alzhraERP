-- ============================================================
-- Migration: 20260923000002_debt_work_queue_and_assignment.sql
-- ============================================================
-- Debt & Collection - S2: work queue, collector assignment, bulk actions
--
-- Additive only (no live debt function is rewritten) and ASCII-only
-- (ADR-017 / ADR-018 deployment convention).
--
--   A) debt_collector_assignments  - who owns which customer (one ACTIVE
--      assignment per customer per company, enforced by a partial index).
--   B) get_debt_task_queue         - ONE queue that unifies: invoices due
--      today/within window, promises due, broken promises, scheduled
--      follow-up actions, critical aging parties and failed messages,
--      enriched with the owner (assigned_to/assigned_name) and the
--      escalation stage. Supports a collector filter (my-accounts view).
--   C) complete_debt_task          - idempotent completion of a scheduled
--      action + optional next action in one transaction.
--   D) assign_debt_parties         - bulk assign / unassign with full
--      tenant + collector-membership validation.
--   E) get_debt_collectors         - company members for the owner picker.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.get_debt_collectors(uuid);
--   DROP FUNCTION IF EXISTS public.assign_debt_parties(uuid, uuid[], uuid, character varying, text);
--   DROP FUNCTION IF EXISTS public.complete_debt_task(uuid, text, text, date);
--   DROP FUNCTION IF EXISTS public.get_debt_task_queue(uuid, uuid, uuid, integer, integer);
--   DROP TABLE IF EXISTS public.debt_collector_assignments;
--
-- Verify (live, read-only): supabase/tests/audit_debt_live_state.sql
-- Contract tests: test_debt_collection_correctness.sql -> T12, T13, T14
-- ============================================================

BEGIN;

-- A) assignment table ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debt_collector_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    party_id uuid NOT NULL,
    collector_id uuid NOT NULL,
    priority character varying(20) NOT NULL DEFAULT 'medium',
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    assigned_by uuid,
    assigned_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT debt_collector_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT debt_collector_assignments_priority_check
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

DO $do$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debt_collector_assignments_company_id_fkey') THEN
        ALTER TABLE public.debt_collector_assignments
            ADD CONSTRAINT debt_collector_assignments_company_id_fkey
            FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debt_collector_assignments_party_id_fkey') THEN
        ALTER TABLE public.debt_collector_assignments
            ADD CONSTRAINT debt_collector_assignments_party_id_fkey
            FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debt_collector_assignments_collector_id_fkey') THEN
        ALTER TABLE public.debt_collector_assignments
            ADD CONSTRAINT debt_collector_assignments_collector_id_fkey
            FOREIGN KEY (collector_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debt_collector_assignments_assigned_by_fkey') THEN
        ALTER TABLE public.debt_collector_assignments
            ADD CONSTRAINT debt_collector_assignments_assigned_by_fkey
            FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $do$;

-- one ACTIVE owner per customer per company
CREATE UNIQUE INDEX IF NOT EXISTS ux_debt_collector_assignments_active
    ON public.debt_collector_assignments (company_id, party_id) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_debt_collector_assignments_collector
    ON public.debt_collector_assignments (company_id, collector_id) WHERE is_active;

ALTER TABLE public.debt_collector_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS debt_select_assignments ON public.debt_collector_assignments;
CREATE POLICY debt_select_assignments ON public.debt_collector_assignments
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS debt_manage_assignments ON public.debt_collector_assignments;
CREATE POLICY debt_manage_assignments ON public.debt_collector_assignments
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id() AND public.user_can_manage_debts())
    WITH CHECK (company_id = public.get_user_company_id() AND public.user_can_manage_debts());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_collector_assignments TO authenticated;

-- realtime (guarded)
DO $do$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                       WHERE pubname = 'supabase_realtime'
                         AND schemaname = 'public'
                         AND tablename = 'debt_collector_assignments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_collector_assignments;
    END IF;
END $do$;
-- B) get_debt_task_queue -----------------------------------------------
CREATE OR REPLACE FUNCTION public.get_debt_task_queue(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_collector_id uuid DEFAULT NULL::uuid,
    p_window_days integer DEFAULT 7,
    p_limit integer DEFAULT 200
)
 RETURNS TABLE(
    task_id text,
    task_type character varying,
    party_id uuid,
    party_name text,
    party_phone text,
    currency_code text,
    amount numeric,
    reference_info text,
    urgency character varying,
    priority character varying,
    due_at timestamp with time zone,
    is_overdue boolean,
    assigned_to uuid,
    assigned_name text,
    escalation_stage character varying
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_window DATE := CURRENT_DATE + GREATEST(COALESCE(p_window_days, 7), 0);
    v_critical integer := 30;
    v_stage_call integer := 30;
    v_stage_visit integer := 60;
    v_stage_legal integer := 90;
    v_allowed_branches uuid[];
    v_target_branches uuid[];
    v_is_super boolean;
    v_has_all_branches boolean := false;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);
    v_is_super := public.is_super_admin();

    SELECT COALESCE(c.critical_days, 30),
           COALESCE(c.stage_call_days, 30),
           COALESCE(c.stage_visit_days, 60),
           COALESCE(c.stage_legal_days, 90)
      INTO v_critical, v_stage_call, v_stage_visit, v_stage_legal
      FROM public.debt_followup_config c
     WHERE c.company_id = p_company_id
     LIMIT 1;

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
    WITH overdue AS (
        SELECT i.party_id,
               i.currency_code,
               SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS overdue_amount,
               MAX(v_today - i.due_date) AS max_days_overdue,
               MIN(i.due_date)           AS oldest_due
        FROM public.invoices i
        WHERE i.company_id = p_company_id
          AND i.type = 'sale'
          AND i.status IN ('posted', 'confirmed', 'partially_paid')
          AND i.deleted_at IS NULL
          AND i.due_date < v_today
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
          AND (v_is_super OR v_has_all_branches
               OR i.branch_id IS NULL OR i.branch_id = ANY(v_target_branches))
        GROUP BY i.party_id, i.currency_code
    ),
    -- عملة الطرف المهيمنة (أكبر مبلغ متأخر): صف واحد لكل عميل بلا خلط عملات
    overdue_party AS (
        SELECT DISTINCT ON (o.party_id)
               o.party_id, o.currency_code, o.overdue_amount,
               o.max_days_overdue, o.oldest_due
        FROM overdue o
        ORDER BY o.party_id, o.overdue_amount DESC
    ),
    tasks AS (
        SELECT 'inv:' || i.id::text AS task_key,
               'due_today'::VARCHAR AS task_type,
               i.party_id AS party_id,
               i.currency_code::TEXT AS currency_code,
               (i.total_amount - COALESCE(i.paid_amount, 0))::NUMERIC AS amount,
               COALESCE(i.invoice_number, i.id::TEXT)::TEXT AS reference_info,
               'high'::VARCHAR AS urgency,
               'high'::VARCHAR AS priority,
               (i.due_date)::timestamptz AS due_at,
               (i.due_date < v_today) AS is_overdue
        FROM public.invoices i
        WHERE i.company_id = p_company_id
          AND i.type = 'sale'
          AND i.status IN ('posted', 'confirmed', 'partially_paid')
          AND i.deleted_at IS NULL
          AND i.due_date <= v_window
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
          AND (v_is_super OR v_has_all_branches
               OR i.branch_id IS NULL OR i.branch_id = ANY(v_target_branches))

        UNION ALL

        SELECT 'prom:' || pp.id::text,
               (CASE WHEN pp.promise_date < v_today THEN 'broken_promise' ELSE 'promise_due' END)::VARCHAR,
               pp.party_id, pp.currency_code::TEXT, pp.amount,
               ('promise ' || to_char(pp.promise_date, 'YYYY-MM-DD'))::TEXT,
               (CASE WHEN pp.promise_date < v_today THEN 'critical' ELSE 'high' END)::VARCHAR,
               (CASE WHEN pp.promise_date < v_today THEN 'urgent' ELSE 'high' END)::VARCHAR,
               pp.promise_date::timestamptz,
               (pp.promise_date < v_today)
        FROM public.debt_payment_promises pp
        WHERE pp.company_id = p_company_id
          AND pp.status = 'pending'
          AND pp.promise_date <= v_window

        UNION ALL

        SELECT 'act:' || ca.id::text,
               'follow_up'::VARCHAR,
               ca.customer_id, NULL::TEXT, NULL::NUMERIC,
               ca.subject::TEXT,
               (CASE WHEN ca.scheduled_at::DATE < v_today THEN 'critical' ELSE 'high' END)::VARCHAR,
               ca.priority::VARCHAR,
               ca.scheduled_at,
               (ca.scheduled_at::DATE < v_today)
        FROM public.customer_activities ca
        JOIN public.parties cp ON cp.id = ca.customer_id AND cp.deleted_at IS NULL
        WHERE ca.company_id = p_company_id
          AND ca.status = 'pending'
          AND ca.scheduled_at IS NOT NULL
          AND ca.scheduled_at::DATE <= v_window
          AND (v_is_super OR v_has_all_branches
               OR cp.branch_id IS NULL OR cp.branch_id = ANY(v_target_branches))

        UNION ALL

        SELECT 'party:' || o.party_id::text,
               'critical_debt'::VARCHAR,
               o.party_id, o.currency_code::TEXT, o.overdue_amount,
               ('overdue ' || o.max_days_overdue::TEXT || ' days')::TEXT,
               'critical'::VARCHAR, 'urgent'::VARCHAR,
               o.oldest_due::timestamptz, true
        FROM overdue_party o
        WHERE o.max_days_overdue >= v_critical

        UNION ALL

        SELECT 'msg:' || dm.id::text,
               'failed_message'::VARCHAR,
               dm.party_id, NULL::TEXT, NULL::NUMERIC,
               COALESCE(dm.error_info, 'failed message')::TEXT,
               'medium'::VARCHAR, 'medium'::VARCHAR,
               dm.created_at, false
        FROM public.debt_message_log dm
        WHERE dm.company_id = p_company_id
          AND dm.status = 'failed'
          AND dm.created_at::DATE = v_today
    ),
    -- ترتيب عادل: رتبة داخل كل نوع حتى لا يحتكر نوع واحد (مثل الديون الحرجة)
    -- ميزانية الـ LIMIT فيُخفي الأنواع الأخرى (اكتُشف بالاختبار الحيّ).
    enriched AS (
        SELECT t.task_key,
               t.task_type,
               p.id              AS party_id,
               p.name::TEXT      AS party_name,
               p.phone::TEXT     AS party_phone,
               t.currency_code,
               t.amount,
               t.reference_info,
               t.urgency,
               t.priority,
               t.due_at,
               t.is_overdue,
               a.collector_id,
               pr.full_name::TEXT AS assigned_name,
               (CASE
                    WHEN COALESCE(o.max_days_overdue, 0) >= v_stage_legal THEN 'legal'
                    WHEN COALESCE(o.max_days_overdue, 0) >= v_stage_visit THEN 'visit'
                    WHEN COALESCE(o.max_days_overdue, 0) >= v_stage_call  THEN 'call'
                    WHEN COALESCE(o.max_days_overdue, 0) >= v_critical   THEN 'reminder'
                    ELSE 'monitor'
                END)::VARCHAR AS escalation_stage,
               ROW_NUMBER() OVER (
                   PARTITION BY t.task_type
                   ORDER BY CASE t.urgency WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
                            t.due_at ASC NULLS LAST
               ) AS type_rank
        FROM tasks t
        JOIN public.parties p ON p.id = t.party_id AND p.deleted_at IS NULL
        LEFT JOIN public.debt_collector_assignments a
               ON a.company_id = p_company_id AND a.party_id = t.party_id AND a.is_active
        LEFT JOIN public.profiles pr ON pr.id = a.collector_id
        LEFT JOIN overdue_party o ON o.party_id = t.party_id
        WHERE (p_collector_id IS NULL OR a.collector_id = p_collector_id)
          AND (v_is_super OR v_has_all_branches
               OR p.branch_id IS NULL OR p.branch_id = ANY(v_target_branches))
    )
    SELECT e.task_key,
           e.task_type,
           e.party_id,
           e.party_name,
           e.party_phone,
           e.currency_code,
           e.amount,
           e.reference_info,
           e.urgency,
           e.priority,
           e.due_at,
           e.is_overdue,
           e.collector_id,
           e.assigned_name,
           e.escalation_stage
    FROM enriched e
    ORDER BY e.type_rank,
             CASE e.urgency WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
             e.due_at ASC NULLS LAST,
             e.party_name
    LIMIT GREATEST(COALESCE(p_limit, 200), 1);
END;
$function$;
-- C) complete_debt_task (idempotent) ------------------------------------
CREATE OR REPLACE FUNCTION public.complete_debt_task(
    p_activity_id uuid,
    p_outcome text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_next_action_date date DEFAULT NULL
)
 RETURNS TABLE(activity_id uuid, next_action_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_company uuid;
    v_party uuid;
    v_subject text;
    v_priority varchar;
    v_status text;
    v_next uuid;
BEGIN
    SELECT ca.company_id, ca.customer_id, ca.subject, ca.priority, ca.status
      INTO v_company, v_party, v_subject, v_priority, v_status
      FROM public.customer_activities ca
     WHERE ca.id = p_activity_id;

    IF v_company IS NULL THEN
        RAISE EXCEPTION 'INVALID_TASK';
    END IF;

    PERFORM public.fn_assert_company_access(v_company);

    IF NOT public.user_can_manage_debts(v_company) THEN
        RAISE EXCEPTION 'insufficient permission to complete collection tasks'
            USING ERRCODE = '42501';
    END IF;

    -- idempotent: a completed task returns itself and never creates a new next action
    IF v_status = 'completed' THEN
        RETURN QUERY SELECT p_activity_id, NULL::UUID;
        RETURN;
    END IF;

    UPDATE public.customer_activities ca
       SET status = 'completed',
           outcome = COALESCE(p_outcome, ca.outcome),
           description = COALESCE(p_notes, ca.description),
           completed_at = NOW(),
           assigned_to = COALESCE(ca.assigned_to, auth.uid()),
           updated_at = NOW()
     WHERE ca.id = p_activity_id;

    IF p_next_action_date IS NOT NULL THEN
        INSERT INTO public.customer_activities (
            company_id, customer_id, activity_type, subject, description,
            status, priority, scheduled_at, assigned_to, created_by
        ) VALUES (
            v_company, v_party, 'task',
            'follow-up: ' || COALESCE(v_subject, 'collection'),
            COALESCE(p_notes, ''), 'pending', v_priority,
            p_next_action_date::timestamptz, auth.uid(), auth.uid()
        )
        RETURNING id INTO v_next;
    END IF;

    RETURN QUERY SELECT p_activity_id, v_next;
END;
$function$;

-- D) assign_debt_parties (bulk assign / unassign) -----------------------
CREATE OR REPLACE FUNCTION public.assign_debt_parties(
    p_company_id uuid,
    p_party_ids uuid[],
    p_collector_id uuid DEFAULT NULL::uuid,
    p_priority character varying DEFAULT 'medium'::character varying,
    p_notes text DEFAULT NULL
)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_total integer;
    v_valid integer;
    v_affected integer := 0;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    IF NOT public.user_can_manage_debts(p_company_id) THEN
        RAISE EXCEPTION 'insufficient permission to assign the collection portfolio'
            USING ERRCODE = '42501';
    END IF;

    IF p_party_ids IS NULL OR ARRAY_LENGTH(p_party_ids, 1) = 0 THEN
        RAISE EXCEPTION 'INVALID_PARTY_LIST';
    END IF;

    IF p_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        RAISE EXCEPTION 'INVALID_PRIORITY';
    END IF;

    SELECT COUNT(*) INTO v_total FROM unnest(p_party_ids) AS pid;

    SELECT COUNT(*) INTO v_valid
      FROM public.parties p
     WHERE p.company_id = p_company_id
       AND p.deleted_at IS NULL
       AND p.id = ANY(p_party_ids);

    IF v_valid <> v_total THEN
        RAISE EXCEPTION 'INVALID_PARTY';
    END IF;

    IF p_collector_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.user_company_roles r
        WHERE r.company_id = p_company_id AND r.user_id = p_collector_id
    ) THEN
        RAISE EXCEPTION 'INVALID_COLLECTOR';
    END IF;

    -- NULL collector means unassign: deactivate the active assignment
    IF p_collector_id IS NULL THEN
        UPDATE public.debt_collector_assignments a
           SET is_active = false, updated_at = NOW()
         WHERE a.company_id = p_company_id
           AND a.party_id = ANY(p_party_ids)
           AND a.is_active;
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        RETURN v_affected;
    END IF;

    INSERT INTO public.debt_collector_assignments AS a (
        company_id, party_id, collector_id, priority, notes, is_active, assigned_by
    )
    SELECT p_company_id, pid, p_collector_id, p_priority, p_notes, true, auth.uid()
      FROM unnest(p_party_ids) AS pid
    ON CONFLICT (company_id, party_id) WHERE is_active
    DO UPDATE SET
        collector_id = EXCLUDED.collector_id,
        priority     = EXCLUDED.priority,
        notes        = COALESCE(EXCLUDED.notes, a.notes),
        assigned_by  = EXCLUDED.assigned_by,
        assigned_at  = NOW(),
        updated_at   = NOW();

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RETURN v_affected;
END;
$function$;

-- E) get_debt_collectors (owner picker) ---------------------------------
CREATE OR REPLACE FUNCTION public.get_debt_collectors(p_company_id uuid)
 RETURNS TABLE(collector_id uuid, full_name text, role character varying)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    RETURN QUERY
    SELECT r.user_id,
           COALESCE(pr.full_name, '')::TEXT,
           r.role::VARCHAR
      FROM public.user_company_roles r
      LEFT JOIN public.profiles pr ON pr.id = r.user_id
     WHERE r.company_id = p_company_id
     ORDER BY pr.full_name NULLS LAST;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_debt_task_queue(uuid, uuid, uuid, integer, integer) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_debt_task_queue(uuid, uuid, uuid, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_debt_task(uuid, text, text, date) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.complete_debt_task(uuid, text, text, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_debt_parties(uuid, uuid[], uuid, character varying, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.assign_debt_parties(uuid, uuid[], uuid, character varying, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_debt_collectors(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_debt_collectors(uuid) TO authenticated;

COMMIT;