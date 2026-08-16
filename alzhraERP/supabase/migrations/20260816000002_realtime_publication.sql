-- ============================================================
-- Migration: Extend Realtime publication coverage
-- Date: 2026-08-16
-- Phase: D / Task 16
--
-- The `supabase_realtime` publication previously covered only 8
-- business tables (invoices, invoice_items, payments, expenses,
-- journal_entries, products, parties, companies). The frontend
-- Realtime sync expects changes for inventory/audit/commission/debt
-- tables too. Add them here.
--
-- postgres_changes respects RLS: users only receive changes for rows
-- they can SELECT, so cross-company data is never broadcast.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.product_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incentive_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incentive_periods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incentive_engineer_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incentive_calculations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_followup_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_payment_promises;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_message_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_message_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_opening_balances;
