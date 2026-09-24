-- ============================================================
-- audit_debt_live_state.sql   (READ-ONLY - no mutations)
-- ============================================================
-- Purpose: S0 evidence for the debt & collection modernization plan
--          (plans/debt-collection-modernization-2026-09-23.md, guardrail G1).
-- Run it in the Supabase SQL editor BEFORE applying any debt migration.
-- Every statement below is a SELECT / catalog read only.
-- ============================================================

-- 1) Debt RPC signatures (overload / 42725 guard)
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       pg_get_function_result(p.oid)             AS result_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'get_debt_followup_dashboard', 'get_debt_analytics_summary',
      'get_debt_today_tasks', 'get_debt_party_overview',
      'record_debt_reminder', 'complete_promise', 'break_overdue_promises',
      'log_collection_activity', 'get_party_collection_timeline',
      'get_debt_followup_actions', 'fn_assert_company_access',
      'user_can_manage_debts'
  )
ORDER BY p.proname, identity_args;

-- 2) Duplicate overloads (must be empty)
SELECT p.proname, COUNT(*) AS overloads
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('record_debt_reminder', 'complete_promise',
                    'get_debt_today_tasks', 'get_debt_analytics_summary',
                    'get_debt_followup_dashboard', 'break_overdue_promises')
GROUP BY p.proname
HAVING COUNT(*) > 1;

-- 3) Debt tables: columns that this plan depends on
SELECT table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
      (table_name = 'debt_followup_config'
         AND column_name IN ('due_soon_days', 'critical_days', 'reminder_window_days',
                             'stage_call_days', 'stage_visit_days', 'stage_legal_days'))
   OR (table_name = 'debt_message_log'
         AND column_name IN ('status', 'idempotency_key', 'provider_message_id', 'delivery_status'))
   OR (table_name = 'debt_payment_promises' AND column_name IN ('branch_id', 'status'))
   OR (table_name = 'customer_activities'
         AND column_name IN ('status', 'scheduled_at', 'assigned_to', 'activity_type', 'priority'))
  )
ORDER BY table_name, column_name;

-- 4) Unique constraints required by upserts (company_id / opening balances)
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype IN ('u', 'p')
  AND conrelid::regclass::text IN ('public.debt_followup_config',
                                   'public.party_opening_balances',
                                   'public.debt_payment_promises')
ORDER BY table_name, conname;

-- 5) Promise auto-completion trigger (Phase 1 / A1)
SELECT tgname, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND c.relname IN ('payments', 'invoices', 'debt_payment_promises')
ORDER BY c.relname, tgname;

-- 6) Cron jobs touching debts
SELECT jobid, jobname, schedule, command, active
FROM cron.job
ORDER BY jobid;

-- 7) Realtime publication coverage
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND (tablename LIKE 'debt_%'
       OR tablename IN ('party_opening_balances', 'customer_activities'))
ORDER BY tablename;

-- 8) HONESTY BASELINE: how many reminders claim to be sent?
SELECT status,
       COUNT(*)                                        AS rows,
       COUNT(*) FILTER (WHERE sent_at IS NOT NULL)     AS with_sent_at,
       MIN(created_at)::date                           AS first_seen,
       MAX(created_at)::date                           AS last_seen
FROM public.debt_message_log
GROUP BY status
ORDER BY rows DESC;

-- 9) HONESTY BASELINE: customers currently treated as already reminded
--    (they are hidden from the needs-reminder queue)
SELECT company_id,
       COUNT(DISTINCT party_id) AS parties_marked_reminded,
       COUNT(*)                 AS log_rows,
       MAX(created_at)          AS last_log_at
FROM public.debt_message_log
WHERE status = 'sent'
  AND created_at >= NOW() - INTERVAL '3 days'
GROUP BY company_id
ORDER BY parties_marked_reminded DESC;

-- 10) ORPHAN CHECK (P0-3): scheduled next actions nobody reads
SELECT ca.company_id,
       ca.status,
       ca.activity_type,
       COUNT(*) AS rows,
       COUNT(*) FILTER (WHERE ca.scheduled_at <= NOW()) AS due_or_overdue,
       MIN(ca.scheduled_at) AS oldest_due
FROM public.customer_activities ca
WHERE ca.status = 'pending'
GROUP BY ca.company_id, ca.status, ca.activity_type
ORDER BY due_or_overdue DESC, rows DESC;

-- 11) UNASSIGNED CHECK (P0-4)
SELECT COUNT(*) AS activities_total,
       COUNT(*) FILTER (WHERE assigned_to IS NULL) AS without_assignee
FROM public.customer_activities;

-- 12) RLS status of the debt tables (every row must be rowsecurity = true)
SELECT c.relname, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
       (SELECT COUNT(*) FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('debt_followup_config', 'debt_message_log',
                    'debt_message_templates', 'debt_payment_promises',
                    'party_opening_balances', 'customer_activities')
ORDER BY c.relname;

-- 13) H-1 channel-key privacy: generated flags present + column privileges
--     (secrets must be readable by NO client role; flags by authenticated)
SELECT column_name, is_generated, generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messaging_config'
  AND column_name IN ('has_whatsapp_key', 'has_sms_key', 'has_telegram_token')
ORDER BY column_name;

SELECT grantee, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'messaging_config'
  AND column_name IN ('whatsapp_api_key', 'sms_api_key', 'telegram_bot_token',
                      'has_whatsapp_key', 'whatsapp_api_url')
ORDER BY column_name, grantee;

-- 14) G1 pre-flight for get_company_settings: dump the LIVE body BEFORE any
--     rewrite (it currently returns row_to_json(messaging_config), i.e. the
--     raw provider keys). Diff it against 20260916000015 first.
SELECT pg_get_functiondef(p.oid) AS function_body
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_company_settings';
