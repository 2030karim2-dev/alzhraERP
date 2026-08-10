-- ============================================================
-- Migration: Debt Module - RLS Policies
-- Date: 2026-08-10
-- ============================================================
-- Enables Row Level Security on all new debt module tables.
-- Uses the existing get_user_company_id() helper for tenant isolation.
-- ============================================================

-- ── party_opening_balances ──
ALTER TABLE public.party_opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_select_opening_balances" ON public.party_opening_balances
    FOR SELECT USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_insert_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_insert_opening_balances" ON public.party_opening_balances
    FOR INSERT WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('owner', 'admin', 'accountant')
    );

DROP POLICY IF EXISTS "debt_update_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_update_opening_balances" ON public.party_opening_balances
    FOR UPDATE USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('owner', 'admin', 'accountant')
    );

DROP POLICY IF EXISTS "debt_delete_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_delete_opening_balances" ON public.party_opening_balances
    FOR DELETE USING (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('owner', 'admin')
    );

-- ── debt_payment_promises ──
ALTER TABLE public.debt_payment_promises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_select_promises" ON public.debt_payment_promises
    FOR SELECT USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_insert_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_insert_promises" ON public.debt_payment_promises
    FOR INSERT WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('owner', 'admin', 'accountant', 'collector')
    );

DROP POLICY IF EXISTS "debt_update_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_update_promises" ON public.debt_payment_promises
    FOR UPDATE USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('owner', 'admin', 'accountant', 'collector')
    );

-- ── debt_followup_config ──
ALTER TABLE public.debt_followup_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_followup" ON public.debt_followup_config;
CREATE POLICY "debt_select_followup" ON public.debt_followup_config
    FOR SELECT USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_upsert_followup" ON public.debt_followup_config;
CREATE POLICY "debt_upsert_followup" ON public.debt_followup_config
    FOR ALL USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('owner', 'admin')
    );

-- ── debt_message_templates ──
ALTER TABLE public.debt_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_templates" ON public.debt_message_templates;
CREATE POLICY "debt_select_templates" ON public.debt_message_templates
    FOR SELECT USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_manage_templates" ON public.debt_message_templates;
CREATE POLICY "debt_manage_templates" ON public.debt_message_templates
    FOR ALL USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('owner', 'admin')
    );

-- ── debt_message_log ──
ALTER TABLE public.debt_message_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_select_msg_log" ON public.debt_message_log
    FOR SELECT USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_insert_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_insert_msg_log" ON public.debt_message_log
    FOR INSERT WITH CHECK (
        company_id = public.get_user_company_id()
    );

DROP POLICY IF EXISTS "debt_update_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_update_msg_log" ON public.debt_message_log
    FOR UPDATE USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_delete_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_delete_msg_log" ON public.debt_message_log
    FOR DELETE USING (
        company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('owner', 'admin')
    );

-- ── party_balances_by_currency (VIEW - RLS inherited from base tables) ──
-- No direct RLS on views; security is enforced by the underlying tables.
