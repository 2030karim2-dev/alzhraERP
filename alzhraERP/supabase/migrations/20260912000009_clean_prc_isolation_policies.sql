-- ============================================================
-- Migration: 20260912000009_clean_prc_isolation_policies.sql
-- Drops redundant duplicate procurement isolation policies
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "prc_quotations_isolation_policy" ON public.prc_quotations;
DROP POLICY IF EXISTS "prc_quotation_items_isolation_policy" ON public.prc_quotation_items;
DROP POLICY IF EXISTS "prc_rfq_items_isolation_policy" ON public.prc_rfq_items;

COMMIT;
