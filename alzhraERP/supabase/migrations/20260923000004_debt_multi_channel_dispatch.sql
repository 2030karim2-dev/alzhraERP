-- ============================================================
-- Migration: 20260923000004_debt_multi_channel_dispatch.sql
-- ============================================================
-- Debt & Collection - S3 part 1/3: multi-channel config, cadence, opt-outs, queue.
--
--   A) messaging_config: SMS provider fields (WhatsApp already exists and supports
--      both CallMeBot and the Meta Graph/Cloud API).
--   B) debt_followup_config: auto-send governance (switch, preferred channel,
--      quiet hours, per-party daily cap).
--   C) debt_cadence_steps: which template goes out at which day offset, per channel.
--   D) debt_opt_outs: per customer/per channel opt-out list.
--   E) debt_reminder_queue: the outbound queue the dispatcher drains.
--
-- ASCII-only body. Rollback: see the bottom of part 3/3.
-- ============================================================

BEGIN;

-- A) SMS provider configuration (WhatsApp fields already exist) ------------
ALTER TABLE public.messaging_config
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.messaging_config
  ADD COLUMN IF NOT EXISTS sms_api_url text;
ALTER TABLE public.messaging_config
  ADD COLUMN IF NOT EXISTS sms_api_key text;
ALTER TABLE public.messaging_config
  ADD COLUMN IF NOT EXISTS sms_sender_id text;

-- B) auto-send governance -----------------------------------------------
ALTER TABLE public.debt_followup_config
  ADD COLUMN IF NOT EXISTS auto_send_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.debt_followup_config
  ADD COLUMN IF NOT EXISTS preferred_channel character varying(20) NOT NULL DEFAULT 'whatsapp';
ALTER TABLE public.debt_followup_config
  ADD COLUMN IF NOT EXISTS quiet_start_hour smallint NOT NULL DEFAULT 21;
ALTER TABLE public.debt_followup_config
  ADD COLUMN IF NOT EXISTS quiet_end_hour smallint NOT NULL DEFAULT 8;
ALTER TABLE public.debt_followup_config
  ADD COLUMN IF NOT EXISTS daily_cap_per_party smallint NOT NULL DEFAULT 1;

ALTER TABLE public.debt_followup_config DROP CONSTRAINT IF EXISTS debt_followup_config_preferred_channel_check;
ALTER TABLE public.debt_followup_config ADD CONSTRAINT debt_followup_config_preferred_channel_check
  CHECK (preferred_channel IN ('whatsapp', 'sms'));
ALTER TABLE public.debt_followup_config DROP CONSTRAINT IF EXISTS debt_followup_config_quiet_hours_check;
ALTER TABLE public.debt_followup_config ADD CONSTRAINT debt_followup_config_quiet_hours_check
  CHECK (quiet_start_hour BETWEEN 0 AND 23 AND quiet_end_hour BETWEEN 0 AND 23);
ALTER TABLE public.debt_followup_config DROP CONSTRAINT IF EXISTS debt_followup_config_daily_cap_check;
ALTER TABLE public.debt_followup_config ADD CONSTRAINT debt_followup_config_daily_cap_check
  CHECK (daily_cap_per_party BETWEEN 0 AND 10);

-- C) cadence steps ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debt_cadence_steps (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    step_key character varying(30) NOT NULL,
    label text NOT NULL,
    day_offset integer NOT NULL,
    channel character varying(20) NOT NULL DEFAULT 'whatsapp',
    template_name text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT debt_cadence_steps_pkey PRIMARY KEY (id),
    CONSTRAINT debt_cadence_steps_channel_check
        CHECK (channel IN ('whatsapp', 'sms', 'email', 'in_app'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_debt_cadence_steps_company_step
    ON public.debt_cadence_steps (company_id, step_key);

ALTER TABLE public.debt_cadence_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS debt_select_cadence ON public.debt_cadence_steps;
CREATE POLICY debt_select_cadence ON public.debt_cadence_steps
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());
DROP POLICY IF EXISTS debt_manage_cadence ON public.debt_cadence_steps;
CREATE POLICY debt_manage_cadence ON public.debt_cadence_steps
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id() AND public.user_can_manage_debts())
    WITH CHECK (company_id = public.get_user_company_id() AND public.user_can_manage_debts());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_cadence_steps TO authenticated;

-- D) opt-outs -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debt_opt_outs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    party_id uuid NOT NULL,
    channel character varying(20) NOT NULL DEFAULT 'sms',
    reason text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT debt_opt_outs_pkey PRIMARY KEY (id),
    CONSTRAINT debt_opt_outs_channel_check
        CHECK (channel IN ('whatsapp', 'sms', 'email', 'all'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_debt_opt_outs_company_party_channel
    ON public.debt_opt_outs (company_id, party_id, channel);

ALTER TABLE public.debt_opt_outs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS debt_select_opt_outs ON public.debt_opt_outs;
CREATE POLICY debt_select_opt_outs ON public.debt_opt_outs
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());
DROP POLICY IF EXISTS debt_manage_opt_outs ON public.debt_opt_outs;
CREATE POLICY debt_manage_opt_outs ON public.debt_opt_outs
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id() AND public.user_can_manage_debts())
    WITH CHECK (company_id = public.get_user_company_id() AND public.user_can_manage_debts());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_opt_outs TO authenticated;

-- E) outbound queue -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debt_reminder_queue (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    party_id uuid NOT NULL,
    channel character varying(20) NOT NULL DEFAULT 'whatsapp',
    template_id uuid,
    step_key character varying(30),
    message_text text NOT NULL,
    recipient character varying(200),
    status character varying(20) NOT NULL DEFAULT 'queued',
    attempts smallint NOT NULL DEFAULT 0,
    next_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
    provider_message_id text,
    error_info text,
    idempotency_key text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    sent_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT debt_reminder_queue_pkey PRIMARY KEY (id),
    CONSTRAINT debt_reminder_queue_status_check
        CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
    CONSTRAINT debt_reminder_queue_channel_check
        CHECK (channel IN ('whatsapp', 'sms', 'email', 'in_app'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_debt_reminder_queue_idempotency
    ON public.debt_reminder_queue (company_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debt_reminder_queue_dispatch
    ON public.debt_reminder_queue (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_debt_reminder_queue_company
    ON public.debt_reminder_queue (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debt_reminder_queue_party_day
    ON public.debt_reminder_queue (company_id, party_id, created_at DESC);

DO $do$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debt_reminder_queue_company_id_fkey') THEN
        ALTER TABLE public.debt_reminder_queue ADD CONSTRAINT debt_reminder_queue_company_id_fkey
            FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debt_reminder_queue_party_id_fkey') THEN
        ALTER TABLE public.debt_reminder_queue ADD CONSTRAINT debt_reminder_queue_party_id_fkey
            FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debt_cadence_steps_company_id_fkey') THEN
        ALTER TABLE public.debt_cadence_steps ADD CONSTRAINT debt_cadence_steps_company_id_fkey
            FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debt_opt_outs_company_id_fkey') THEN
        ALTER TABLE public.debt_opt_outs ADD CONSTRAINT debt_opt_outs_company_id_fkey
            FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debt_opt_outs_party_id_fkey') THEN
        ALTER TABLE public.debt_opt_outs ADD CONSTRAINT debt_opt_outs_party_id_fkey
            FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;
    END IF;
END $do$;

ALTER TABLE public.debt_reminder_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS debt_select_queue ON public.debt_reminder_queue;
CREATE POLICY debt_select_queue ON public.debt_reminder_queue
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());
DROP POLICY IF EXISTS debt_manage_queue ON public.debt_reminder_queue;
CREATE POLICY debt_manage_queue ON public.debt_reminder_queue
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id() AND public.user_can_manage_debts())
    WITH CHECK (company_id = public.get_user_company_id() AND public.user_can_manage_debts());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_reminder_queue TO authenticated;

COMMIT;
-- F) enqueue one reminder (UI send-now + cron) ---------------------------
CREATE OR REPLACE FUNCTION public.enqueue_debt_reminder(
    p_company_id uuid,
    p_party_id uuid,
    p_channel character varying,
    p_message_text text,
    p_recipient character varying DEFAULT NULL,
    p_template_id uuid DEFAULT NULL,
    p_step_key character varying DEFAULT NULL,
    p_idempotency_key text DEFAULT NULL
)
 RETURNS TABLE(queue_id uuid, was_duplicate boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_existing uuid;
    v_id uuid;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    IF auth.uid() IS NOT NULL AND NOT public.user_can_manage_debts(p_company_id) THEN
        RAISE EXCEPTION 'insufficient permission to queue reminders' USING ERRCODE = '42501';
    END IF;

    IF p_channel NOT IN ('whatsapp', 'sms') THEN
        RAISE EXCEPTION 'INVALID_CHANNEL';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.parties p
        WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'INVALID_PARTY';
    END IF;

    -- never message an opted-out customer
    IF EXISTS (
        SELECT 1 FROM public.debt_opt_outs o
        WHERE o.company_id = p_company_id AND o.party_id = p_party_id
          AND o.channel IN (p_channel, 'all')
    ) THEN
        RAISE EXCEPTION 'OPTED_OUT';
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT q.id INTO v_existing
        FROM public.debt_reminder_queue q
        WHERE q.company_id = p_company_id AND q.idempotency_key = p_idempotency_key
        LIMIT 1;
        IF v_existing IS NOT NULL THEN
            RETURN QUERY SELECT v_existing, true;
            RETURN;
        END IF;
    END IF;

    INSERT INTO public.debt_reminder_queue (
        company_id, party_id, channel, template_id, step_key,
        message_text, recipient, idempotency_key, created_by
    ) VALUES (
        p_company_id, p_party_id, p_channel, p_template_id, p_step_key,
        p_message_text, p_recipient, p_idempotency_key, auth.uid()
    ) RETURNING id INTO v_id;

    RETURN QUERY SELECT v_id, false;
END;
$function$;

-- G) claim queued rows for the dispatcher (service_role only) ------------
CREATE OR REPLACE FUNCTION public.claim_debt_reminders(p_limit integer DEFAULT 20)
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

-- H) log the provider result (service_role only) -------------------------
CREATE OR REPLACE FUNCTION public.log_debt_reminder_result(
    p_queue_id uuid,
    p_success boolean,
    p_provider_message_id text DEFAULT NULL,
    p_error text DEFAULT NULL,
    p_delivery_status character varying DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_q public.debt_reminder_queue;
    v_final boolean;
BEGIN
    SELECT * INTO v_q FROM public.debt_reminder_queue q WHERE q.id = p_queue_id;
    IF v_q.id IS NULL THEN
        RAISE EXCEPTION 'INVALID_QUEUE_ITEM';
    END IF;

    IF p_success THEN
        UPDATE public.debt_reminder_queue q
           SET status = 'sent', sent_at = now(), updated_at = now(),
               provider_message_id = COALESCE(p_provider_message_id, q.provider_message_id),
               error_info = NULL
         WHERE q.id = p_queue_id;

        -- the honest log: a provider-verified send (replaces manual-only rows)
        INSERT INTO public.debt_message_log (
            company_id, party_id, channel, template_id, message_text, status,
            recipient, created_by, sent_at, delivery_status, provider_message_id, idempotency_key
        ) VALUES (
            v_q.company_id, v_q.party_id, v_q.channel, v_q.template_id, v_q.message_text, 'sent',
            v_q.recipient, v_q.created_by, now(),
            COALESCE(p_delivery_status, 'sent'), p_provider_message_id, 'q:' || v_q.id::text
        )
        ON CONFLICT DO NOTHING;
        RETURN;
    END IF;

    v_final := v_q.attempts >= 3;

    UPDATE public.debt_reminder_queue q
       SET status = CASE WHEN v_final THEN 'failed' ELSE 'queued' END,
           error_info = p_error,
           next_attempt_at = CASE WHEN v_final THEN q.next_attempt_at
                                  ELSE now() + make_interval(mins => q.attempts * 15) END,
           updated_at = now()
     WHERE q.id = p_queue_id;

    IF v_final THEN
        INSERT INTO public.debt_message_log (
            company_id, party_id, channel, template_id, message_text, status,
            recipient, created_by, sent_at, delivery_status, error_info, idempotency_key
        ) VALUES (
            v_q.company_id, v_q.party_id, v_q.channel, v_q.template_id, v_q.message_text, 'failed',
            v_q.recipient, v_q.created_by, NULL, 'failed', p_error, 'q:' || v_q.id::text
        )
        ON CONFLICT DO NOTHING;
    END IF;
END;
$function$;

-- I) read the queue (UI) -------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_debt_reminder_queue(
    p_company_id uuid,
    p_status character varying DEFAULT NULL,
    p_limit integer DEFAULT 100
)
 RETURNS TABLE(
    id uuid, party_id uuid, party_name text, channel character varying, status character varying,
    attempts smallint, recipient character varying, message_text text, error_info text,
    provider_message_id text, step_key character varying,
    created_at timestamp with time zone, sent_at timestamp with time zone
 )
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    RETURN QUERY
    SELECT q.id, q.party_id, p.name::TEXT, q.channel, q.status, q.attempts, q.recipient,
           q.message_text, q.error_info, q.provider_message_id, q.step_key, q.created_at, q.sent_at
    FROM public.debt_reminder_queue q
    JOIN public.parties p ON p.id = q.party_id
    WHERE q.company_id = p_company_id
      AND (p_status IS NULL OR q.status = p_status)
    ORDER BY q.created_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$function$;
-- J) SQL renderer for automated sends (mirrors lib/messageTemplate.ts) ---
CREATE OR REPLACE FUNCTION public.render_debt_template(
    p_body text,
    p_customer_name text,
    p_amount numeric,
    p_currency text,
    p_due_date date,
    p_days_overdue integer,
    p_company_name text,
    p_signature text
)
 RETURNS text
 LANGUAGE sql IMMUTABLE
AS $function$
    SELECT btrim(
        regexp_replace(
            replace(replace(replace(replace(replace(replace(replace(replace(
                COALESCE(p_body, ''),
                '{{customer_name}}', COALESCE(p_customer_name, '')),
                '{{amount}}', CASE WHEN p_amount IS NULL THEN '' ELSE
                    to_char(p_amount, 'FM999,999,999,990.00') || ' ' || COALESCE(NULLIF(p_currency, ''), '') END),
                '{{currency}}', COALESCE(p_currency, '')),
                '{{due_date}}', COALESCE(to_char(p_due_date, 'YYYY-MM-DD'), '')),
                '{{days_overdue}}', CASE WHEN p_days_overdue IS NULL THEN '' ELSE p_days_overdue::text END),
                '{{invoice_number}}', ''),
                '{{company_name}}', COALESCE(p_company_name, '')),
                '{{signature}}', COALESCE(p_signature, '')),
            E'\n{3,}', E'\n\n', 'g'))
$function$;

-- K) cadence seed -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_debt_cadence(p_company_id uuid)
 RETURNS integer
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_role text;
    v_inserted integer := 0;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);
    IF auth.uid() IS NOT NULL THEN
        v_role := public.get_user_role(p_company_id);
        IF COALESCE(v_role, '') NOT IN ('owner', 'admin', 'manager', 'accountant') THEN
            RAISE EXCEPTION 'insufficient permission to seed the collection cadence' USING ERRCODE = '42501';
        END IF;
    END IF;

    WITH steps(step_key, label, day_offset, channel, template_name, enabled) AS (VALUES
      ('pre_due',  'قبل الاستحقاق بـ3 أيام',   -3, 'whatsapp', 'تذكير ودّي قبل الاستحقاق', false),
      ('due_day',  'يوم الاستحقاق',              0, 'whatsapp', 'تذكير يوم الاستحقاق', true),
      ('d1_15',    'متأخر 1-15 يوماً',           1, 'whatsapp', 'متأخر 1-15 يوم — تذكير لطيف', true),
      ('d16_30',   'متأخر 16-30 يوماً',         16, 'whatsapp', 'متأخر 16-30 يوم — تذكير حازم', true),
      ('d31_60',   'متأخر 31-60 يوماً',         31, 'whatsapp', 'متأخر 31-60 يوم — مطالبة رسمية', true),
      ('d61_90',   'متأخر 61-90 يوماً',         61, 'sms',      'تصعيد 61-90 يوم — زيارة ميدانية', true),
      ('d90_plus', 'متأخر +90 يوماً',           90, 'sms',      'تصعيد 90+ يوم — إشعار نهائي', true)
    )
    INSERT INTO public.debt_cadence_steps (company_id, step_key, label, day_offset, channel, template_name, enabled)
    SELECT p_company_id, s.step_key, s.label, s.day_offset, s.channel, s.template_name, s.enabled
    FROM steps s
    WHERE NOT EXISTS (
        SELECT 1 FROM public.debt_cadence_steps d
        WHERE d.company_id = p_company_id AND d.step_key = s.step_key
    );

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$function$;

-- L) cron: enqueue due reminders (SQL only, runs every hour) -------------
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
BEGIN
    -- quiet hours are evaluated in the studio timezone (Asia/Riyadh = GMT+3)
    v_hour := EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Riyadh'))::integer;

    FOR v_cfg IN
        SELECT c.company_id, c.quiet_start_hour, c.quiet_end_hour, c.daily_cap_per_party
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
            FOR v_row IN
                SELECT d.party_id,
                       p.name AS party_name,
                       p.phone AS party_phone,
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
                WHERE p.phone IS NOT NULL AND length(regexp_replace(p.phone, '[^0-9]', '', 'g')) >= 9
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

                v_total := v_total + 1;
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN v_total;
END;
$function$;

-- M) cron: enqueue + call the dispatcher edge function via pg_net --------
CREATE OR REPLACE FUNCTION public.cron_dispatch_debt_reminders()
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_url text;
    v_key text;
BEGIN
    PERFORM public.cron_enqueue_debt_reminders();

    -- url + service key live in Vault; nothing is hard-coded here
    SELECT s.decrypted_secret INTO v_key
    FROM vault.decrypted_secrets s WHERE s.name = 'debt_dispatch_service_key' LIMIT 1;
    SELECT s.decrypted_secret INTO v_url
    FROM vault.decrypted_secrets s WHERE s.name = 'debt_dispatch_url' LIMIT 1;

    IF v_url IS NULL OR v_key IS NULL THEN
        RETURN;
    END IF;

    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json',
                                      'Authorization', 'Bearer ' || v_key),
        body := jsonb_build_object('source', 'cron'),
        timeout_milliseconds := 20000
    );
END;
$function$;
-- N) grants -------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.enqueue_debt_reminder(uuid, uuid, character varying, text, character varying, uuid, character varying, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.enqueue_debt_reminder(uuid, uuid, character varying, text, character varying, uuid, character varying, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_debt_reminder_queue(uuid, character varying, integer) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_debt_reminder_queue(uuid, character varying, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.seed_default_debt_cadence(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.seed_default_debt_cadence(uuid) TO authenticated;

-- dispatcher-only functions: unreachable for end users
REVOKE EXECUTE ON FUNCTION public.claim_debt_reminders(integer) FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_debt_reminders(integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.log_debt_reminder_result(uuid, boolean, text, text, character varying) FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.log_debt_reminder_result(uuid, boolean, text, text, character varying) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cron_enqueue_debt_reminders() FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.cron_enqueue_debt_reminders() TO service_role;

REVOKE EXECUTE ON FUNCTION public.cron_dispatch_debt_reminders() FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.cron_dispatch_debt_reminders() TO service_role;

-- O) realtime for the three new tables ---------------------------------
DO $do$
DECLARE
    tbl text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH tbl IN ARRAY ARRAY['debt_cadence_steps', 'debt_opt_outs', 'debt_reminder_queue']
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime'
                  AND schemaname = 'public'
                  AND tablename = tbl
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            END IF;
        END LOOP;
    END IF;
END $do$;

-- P) cadence backfill for existing companies ---------------------------
DO $do$
DECLARE
    r record;
    v_total integer := 0;
BEGIN
    FOR r IN SELECT id FROM public.companies LOOP
        v_total := v_total + public.seed_default_debt_cadence(r.id);
    END LOOP;
    RAISE NOTICE 'debt cadence steps seeded: % rows', v_total;
END $do$;

-- Q) schedules (guarded, idempotent) ----------------------------------
DO $do$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'debt-enqueue-reminders-hourly') THEN
            PERFORM cron.schedule('debt-enqueue-reminders-hourly', '0 * * * *',
                                  'SELECT public.cron_enqueue_debt_reminders();');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'debt-dispatch-reminders') THEN
            PERFORM cron.schedule('debt-dispatch-reminders', '*/10 * * * *',
                                  'SELECT public.cron_dispatch_debt_reminders();');
        END IF;
    END IF;
END $do$;

COMMIT;

-- ============================================================
-- Rollback (manual, in this order):
--   SELECT cron.unschedule('debt-dispatch-reminders');
--   SELECT cron.unschedule('debt-enqueue-reminders-hourly');
--   DROP FUNCTION IF EXISTS public.cron_dispatch_debt_reminders();
--   DROP FUNCTION IF EXISTS public.cron_enqueue_debt_reminders();
--   DROP FUNCTION IF EXISTS public.render_debt_template(text,text,numeric,text,date,integer,text,text);
--   DROP FUNCTION IF EXISTS public.seed_default_debt_cadence(uuid);
--   DROP FUNCTION IF EXISTS public.get_debt_reminder_queue(uuid,character varying,integer);
--   DROP FUNCTION IF EXISTS public.log_debt_reminder_result(uuid,boolean,text,text,character varying);
--   DROP FUNCTION IF EXISTS public.claim_debt_reminders(integer);
--   DROP FUNCTION IF EXISTS public.enqueue_debt_reminder(uuid,uuid,character varying,text,character varying,uuid,character varying,text);
--   DROP TABLE IF EXISTS public.debt_reminder_queue;
--   DROP TABLE IF EXISTS public.debt_opt_outs;
--   DROP TABLE IF EXISTS public.debt_cadence_steps;
--   ALTER TABLE public.debt_followup_config DROP COLUMN IF EXISTS daily_cap_per_party;
--   ALTER TABLE public.debt_followup_config DROP COLUMN IF EXISTS quiet_end_hour;
--   ALTER TABLE public.debt_followup_config DROP COLUMN IF EXISTS quiet_start_hour;
--   ALTER TABLE public.debt_followup_config DROP COLUMN IF EXISTS preferred_channel;
--   ALTER TABLE public.debt_followup_config DROP COLUMN IF EXISTS auto_send_enabled;
--   ALTER TABLE public.messaging_config DROP COLUMN IF EXISTS sms_sender_id;
--   ALTER TABLE public.messaging_config DROP COLUMN IF EXISTS sms_api_key;
--   ALTER TABLE public.messaging_config DROP COLUMN IF EXISTS sms_api_url;
--   ALTER TABLE public.messaging_config DROP COLUMN IF EXISTS sms_enabled;
-- ============================================================
-- ============================================================
-- R) reaper for stuck dispatches (added after the first apply) ----------
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.reap_stuck_debt_reminders()
 RETURNS integer
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_n integer := 0;
BEGIN
    UPDATE public.debt_reminder_queue q
       SET status = 'queued', updated_at = now(),
           error_info = COALESCE(q.error_info, 'dispatcher timeout - requeued')
     WHERE q.status = 'sending'
       AND q.updated_at < now() - interval '15 minutes';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RETURN v_n;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reap_stuck_debt_reminders() FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.reap_stuck_debt_reminders() TO service_role;

-- the dispatch cron reaps first, then enqueues, then calls the function
CREATE OR REPLACE FUNCTION public.cron_dispatch_debt_reminders()
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_url text;
    v_key text;
BEGIN
    PERFORM public.reap_stuck_debt_reminders();
    PERFORM public.cron_enqueue_debt_reminders();

    SELECT s.decrypted_secret INTO v_key
    FROM vault.decrypted_secrets s WHERE s.name = 'debt_dispatch_service_key' LIMIT 1;
    SELECT s.decrypted_secret INTO v_url
    FROM vault.decrypted_secrets s WHERE s.name = 'debt_dispatch_url' LIMIT 1;

    IF v_url IS NULL OR v_key IS NULL THEN
        RETURN;
    END IF;

    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json',
                                      'Authorization', 'Bearer ' || v_key),
        body := jsonb_build_object('source', 'cron'),
        timeout_milliseconds := 20000
    );
END;
$function$;

COMMIT;
-- ============================================================
-- S) claim scoping by company (the dispatcher drains one company when it runs
--    with a user JWT instead of the service role) ----------------------
-- ============================================================
BEGIN;

DROP FUNCTION IF EXISTS public.claim_debt_reminders(integer);

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

REVOKE EXECUTE ON FUNCTION public.claim_debt_reminders(integer, uuid) FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_debt_reminders(integer, uuid) TO service_role;

COMMIT;