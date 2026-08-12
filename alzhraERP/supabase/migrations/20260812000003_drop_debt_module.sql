-- ============================================================
-- Drop Debt & Receivables Module
-- Removes the debts feature tables and RPCs.
-- The debts frontend module has been removed from the app.
-- NOTE: get_party_statement is intentionally KEPT (used by parties feature).
-- NOTE: update_updated_at_column() is intentionally KEPT (shared with inventory).
-- ============================================================

-- 1. Drop debt-specific RPCs
DROP FUNCTION IF EXISTS public.get_party_balance_by_currency(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.get_party_all_balances(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_debt_followup_dashboard(uuid);
DROP FUNCTION IF EXISTS public.get_debt_today_tasks(uuid);
DROP FUNCTION IF EXISTS public.get_debt_analytics_summary(uuid);
DROP FUNCTION IF EXISTS public.update_party_credit_limit(uuid, numeric);

-- 2. Drop debt tables
-- (RLS policies, triggers, and indexes are dropped automatically with the tables)
DROP TABLE IF EXISTS public.debt_message_log CASCADE;
DROP TABLE IF EXISTS public.debt_message_templates CASCADE;
DROP TABLE IF EXISTS public.debt_followup_config CASCADE;
DROP TABLE IF EXISTS public.debt_payment_promises CASCADE;
DROP TABLE IF EXISTS public.party_opening_balances CASCADE;
