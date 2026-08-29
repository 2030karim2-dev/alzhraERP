-- ============================================================
-- Migration: 20260830000002_optimize_performance_indexes_and_views.sql
-- Description: Add missing indexes on foreign keys, enable security_invoker
-- on legacy views, and clean up obsolete staging/legacy tables.
-- ============================================================

-- 1. Missing Foreign Key & Performance Indexes
CREATE INDEX IF NOT EXISTS idx_prc_quotations_converted_by ON public.prc_quotations(converted_by);
CREATE INDEX IF NOT EXISTS idx_prc_quotation_revisions_created_by ON public.prc_quotation_revisions(created_by);
CREATE INDEX IF NOT EXISTS idx_prc_supplier_products_product_id ON public.prc_supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_prc_quotation_items_product_id ON public.prc_quotation_items(product_id);
CREATE INDEX IF NOT EXISTS idx_prc_rfq_items_product_id ON public.prc_rfq_items(product_id);
CREATE INDEX IF NOT EXISTS idx_procurement_audit_logs_actor_id ON public.procurement_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_created_by ON public.chat_channels(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_message_attachments_uploaded_by ON public.chat_message_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_user_id ON public.chat_message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved_by ON public.security_alerts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_security_alerts_company_id ON public.security_alerts(company_id);

-- Indexes for high-frequency filters
CREATE INDEX IF NOT EXISTS idx_parties_company_type ON public.parties(company_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_company_type_status ON public.invoices(company_id, type, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_party_opening_balances_company_party ON public.party_opening_balances(company_id, party_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_status ON public.journal_entries(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_party_account ON public.journal_entry_lines(party_id, account_id) WHERE deleted_at IS NULL;

-- 2. Enable Security Invoker on Public Views
ALTER VIEW public.active_accounts SET (security_invoker = true);
ALTER VIEW public.active_expenses SET (security_invoker = true);
ALTER VIEW public.active_invoices SET (security_invoker = true);
ALTER VIEW public.active_journal_entries SET (security_invoker = true);
ALTER VIEW public.active_parties SET (security_invoker = true);
ALTER VIEW public.active_payments SET (security_invoker = true);
ALTER VIEW public.active_products SET (security_invoker = true);
ALTER VIEW public.account_balances SET (security_invoker = true);
ALTER VIEW public.low_stock_alert SET (security_invoker = true);
ALTER VIEW public.user_profiles SET (security_invoker = true);
ALTER VIEW public.party_balances SET (security_invoker = true);
ALTER VIEW public.party_balances_by_currency SET (security_invoker = true);

-- 3. Safely Drop Obsolete Staging and Unused Legacy Tables
DROP TABLE IF EXISTS public.staging_jaafari_import CASCADE;
DROP TABLE IF EXISTS public.fin_journal_lines CASCADE;
DROP TABLE IF EXISTS public.inv_stock_audit_items CASCADE;
DROP TABLE IF EXISTS public.inv_stock_movement_items CASCADE;
