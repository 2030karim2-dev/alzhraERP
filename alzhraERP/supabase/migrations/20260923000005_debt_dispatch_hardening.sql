-- ============================================================
-- Migration: 20260923000005_debt_dispatch_hardening.sql
-- ============================================================
-- S3 hardening pass (strict audit 2026-09-23).
--
--   A) debt_reminder_queue becomes READ-ONLY for authenticated: every write has
--      to go through the hardened RPCs (no forged "sent", no deleted evidence).
--   B) user_can_manage_debts also accepts the granular debts:manage permission so
--      the UI gate and the server gate finally agree.
--   C) claim_debt_reminders only claims rows whose channel is ENABLED and whose
--      provider is configured - a missing provider must never burn attempts or
--      write failure logs (P0-2).
--   D) release_debt_reminder(queue_id, reason, cancel): leaves the dispatch loop
--      without a failure log (unusable recipient).
--   E) cron_enqueue_debt_reminders: provider-readiness gate, honest counter, and
--      international phone normalisation.
--   F) debt_followup_config.default_country_code (default 967).
-- ============================================================
BEGIN;

-- A) queue is read-only for clients -------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.debt_reminder_queue FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.debt_reminder_queue FROM anon;
GRANT SELECT ON public.debt_reminder_queue TO authenticated;

-- B) one permission model ----------------------------------------------
CREATE OR REPLACE FUNCTION public.user_can_manage_debts(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT public.get_user_role(p_company_id) IN ('owner', 'admin', 'manager', 'accountant')
      OR COALESCE(public.has_permission('debts:manage', p_company_id), false);
$function$;

CREATE OR REPLACE FUNCTION public.user_can_manage_debts()
 RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT public.user_can_manage_debts(public.get_user_company_id());
$function$;

-- F) default country code for outbound phone normalisation --------------
ALTER TABLE public.debt_followup_config
  ADD COLUMN IF NOT EXISTS default_country_code character varying(5) NOT NULL DEFAULT '967';
ALTER TABLE public.debt_followup_config DROP CONSTRAINT IF EXISTS debt_followup_config_country_code_check;
ALTER TABLE public.debt_followup_config ADD CONSTRAINT debt_followup_config_country_code_check
  CHECK (default_country_code ~ '^[0-9]{1,5}$');

-- D) release a queue row without a failure log --------------------------
CREATE OR REPLACE FUNCTION public.release_debt_reminder(
    p_queue_id uuid,
    p_reason text DEFAULT NULL,
    p_cancel boolean DEFAULT true
)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
    UPDATE public.debt_reminder_queue q
       SET status = CASE WHEN p_cancel THEN 'cancelled' ELSE 'queued' END,
           error_info = p_reason,
           updated_at = now()
     WHERE q.id = p_queue_id
       AND q.status IN ('sending', 'queued');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.release_debt_reminder(uuid, text, boolean) FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.release_debt_reminder(uuid, text, boolean) TO service_role;

COMMIT;
BEGIN;
-- C) claim only rows that can actually be sent --------------------------
CREATE OR REPLACE FUNCTION public.claim_debt_reminders(
    p_limit integer DEFAULT 20,
    p_company_id uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(
    queue_id uuid, company_id uuid, party_id uuid, channel character varying,
    message_text text, recipient character varying, attempts smallint,
    party_name text, party_phone text,
    provider_kind text, provider_url text, provider_key text, provider_sender text,
    step_key character varying
 )
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    WITH picked AS (
        SELECT q.id
        FROM public.debt_reminder_queue q
        WHERE q.status = 'queued'
          AND q.next_attempt_at <= now()
          AND q.attempts < 3
          AND (p_company_id IS NULL OR q.company_id = p_company_id)
          AND EXISTS (
              SELECT 1 FROM public.messaging_config mc
              WHERE mc.company_id = q.company_id
                AND CASE WHEN q.channel = 'sms'
                         THEN COALESCE(mc.sms_enabled, false)
                              AND COALESCE(mc.sms_api_url, '') <> ''
                              AND COALESCE(mc.sms_api_key, '') <> ''
                         ELSE COALESCE(mc.whatsapp_enabled, false)
                              AND COALESCE(mc.whatsapp_api_url, '') <> ''
                              AND COALESCE(mc.whatsapp_api_key, '') <> ''
                    END
          )
        ORDER BY q.next_attempt_at ASC, q.created_at ASC
        LIMIT GREATEST(COALESCE(p_limit, 20), 1)
        FOR UPDATE SKIP LOCKED
    ), claimed AS (
        UPDATE public.debt_reminder_queue q
           SET status = 'sending', attempts = q.attempts + 1, updated_at = now()
          FROM picked pk
         WHERE q.id = pk.id
        RETURNING q.*
    )
    SELECT c.id, c.company_id, c.party_id, c.channel, c.message_text, c.recipient, c.attempts,
           p.name::TEXT, p.phone::TEXT,
           (CASE WHEN c.channel = 'sms' THEN 'sms' ELSE 'whatsapp' END)::TEXT,
           (CASE WHEN c.channel = 'sms' THEN mc.sms_api_url ELSE mc.whatsapp_api_url END)::TEXT,
           (CASE WHEN c.channel = 'sms' THEN mc.sms_api_key ELSE mc.whatsapp_api_key END)::TEXT,
           (CASE WHEN c.channel = 'sms' THEN mc.sms_sender_id ELSE mc.whatsapp_phone END)::TEXT,
           c.step_key
    FROM claimed c
    JOIN public.parties p ON p.id = c.party_id
    LEFT JOIN public.messaging_config mc ON mc.company_id = c.company_id;
END;
$function$;

-- E) cron enqueue: readiness gate + honest counter + E.164-ish recipient --
CREATE OR REPLACE FUNCTION public.cron_enqueue_debt_reminders()
 RETURNS integer
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_cfg record;
    v_step record;
    v_row record;
    v_hour integer;
    v_total integer := 0;
    v_inserted integer;
    v_ready boolean;
BEGIN
    v_hour := EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Riyadh'))::integer;

    FOR v_cfg IN
        SELECT c.company_id, c.quiet_start_hour, c.quiet_end_hour,
               c.daily_cap_per_party, c.default_country_code
        FROM public.debt_followup_config c
        WHERE c.auto_send_enabled = true
    LOOP
        IF v_cfg.quiet_start_hour <> v_cfg.quiet_end_hour THEN
            IF v_cfg.quiet_start_hour > v_cfg.quiet_end_hour THEN
                IF v_hour >= v_cfg.quiet_start_hour OR v_hour < v_cfg.quiet_end_hour THEN
                    CONTINUE;
                END IF;
            ELSE
                IF v_hour >= v_cfg.quiet_start_hour AND v_hour < v_cfg.quiet_end_hour THEN
                    CONTINUE;
                END IF;
            END IF;
        END IF;

        FOR v_step IN
            SELECT s.step_key, s.day_offset, s.channel, s.template_name
            FROM public.debt_cadence_steps s
            WHERE s.company_id = v_cfg.company_id AND s.enabled = true
        LOOP
            SELECT CASE WHEN v_step.channel = 'sms'
                        THEN COALESCE(mc.sms_enabled, false)
                             AND COALESCE(mc.sms_api_url, '') <> ''
                             AND COALESCE(mc.sms_api_key, '') <> ''
                        ELSE COALESCE(mc.whatsapp_enabled, false)
                             AND COALESCE(mc.whatsapp_api_url, '') <> ''
                             AND COALESCE(mc.whatsapp_api_key, '') <> ''
                   END
              INTO v_ready
              FROM public.messaging_config mc
             WHERE mc.company_id = v_cfg.company_id
             LIMIT 1;

            IF COALESCE(v_ready, false) IS NOT TRUE THEN
                CONTINUE;
            END IF;

            FOR v_row IN
                SELECT d.party_id,
                       p.name AS party_name,
                       CASE
                           WHEN length(regexp_replace(p.phone, '[^0-9]', '', 'g')) = 9
                               THEN v_cfg.default_country_code
                                    || regexp_replace(p.phone, '[^0-9]', '', 'g')
                           WHEN length(regexp_replace(p.phone, '[^0-9]', '', 'g')) = 10
                                AND left(regexp_replace(p.phone, '[^0-9]', '', 'g'), 1) = '0'
                               THEN v_cfg.default_country_code
                                    || substr(regexp_replace(p.phone, '[^0-9]', '', 'g'), 2)
                           ELSE ltrim(regexp_replace(regexp_replace(p.phone, '[^0-9]', '', 'g'), '^00', ''), '0')
                       END AS party_phone,
                       d.balance,
                       d.currency_code,
                       d.oldest_due,
                       (CURRENT_DATE - d.oldest_due) AS days_overdue
                FROM (
                    SELECT i.party_id,
                           i.currency_code,
                           SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS balance,
                           MIN(i.due_date) AS oldest_due
                    FROM public.invoices i
                    WHERE i.company_id = v_cfg.company_id
                      AND i.type = 'sale'
                      AND i.status IN ('posted', 'confirmed', 'partially_paid')
                      AND i.deleted_at IS NULL
                      AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
                    GROUP BY i.party_id, i.currency_code
                    HAVING MIN(i.due_date) + v_step.day_offset = CURRENT_DATE
                ) d
                JOIN public.parties p ON p.id = d.party_id AND p.deleted_at IS NULL
                WHERE p.phone IS NOT NULL
                  AND length(regexp_replace(p.phone, '[^0-9]', '', 'g')) >= 9
                  AND NOT EXISTS (
                      SELECT 1 FROM public.debt_opt_outs o
                      WHERE o.company_id = v_cfg.company_id AND o.party_id = d.party_id
                        AND o.channel IN (v_step.channel, 'all')
                  )
            LOOP
                IF v_cfg.daily_cap_per_party > 0 AND (
                    SELECT COUNT(*) FROM public.debt_reminder_queue q
                    WHERE q.company_id = v_cfg.company_id AND q.party_id = v_row.party_id
                      AND q.created_at::date = CURRENT_DATE AND q.status <> 'cancelled'
                ) >= v_cfg.daily_cap_per_party THEN
                    CONTINUE;
                END IF;

                INSERT INTO public.debt_reminder_queue (
                    company_id, party_id, channel, template_id, step_key,
                    message_text, recipient, idempotency_key
                )
                SELECT v_cfg.company_id, v_row.party_id, v_step.channel, t.id, v_step.step_key,
                       public.render_debt_template(
                           t.body, v_row.party_name, v_row.balance, v_row.currency_code,
                           v_row.oldest_due,
                           CASE WHEN v_step.day_offset < 0 THEN NULL ELSE v_row.days_overdue END,
                           co.name_ar, cfg.reminder_signature),
                       v_row.party_phone,
                       'cadence:' || v_cfg.company_id::text || ':' || v_row.party_id::text || ':'
                           || v_step.step_key || ':' || CURRENT_DATE::text
                FROM public.debt_message_templates t
                CROSS JOIN public.companies co
                CROSS JOIN public.debt_followup_config cfg
                WHERE t.company_id = v_cfg.company_id
                  AND t.name = v_step.template_name
                  AND t.is_active = true
                  AND co.id = v_cfg.company_id
                  AND cfg.company_id = v_cfg.company_id
                ORDER BY t.created_at ASC
                LIMIT 1
                ON CONFLICT DO NOTHING;

                GET DIAGNOSTICS v_inserted = ROW_COUNT;
                v_total := v_total + v_inserted;
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN v_total;
END;
$function$;
COMMIT;