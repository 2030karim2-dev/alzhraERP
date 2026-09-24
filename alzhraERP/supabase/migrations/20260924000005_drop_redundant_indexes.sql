-- Migration: 20260924000005_drop_redundant_indexes.sql
-- Description: Drops 18 provably redundant indexes found during the 2026-09-24
--              database-size audit of project zzthamxjxnxzzpswllid.
--
-- Every index below is either
--   (a) an exact duplicate of another index on the same table,
--   (b) a strict prefix / INCLUDE-subset of another index (the wider index
--       serves every query the narrower one could), or
--   (c) functionally useless.
--
-- NONE of them backs a PRIMARY KEY, UNIQUE or FOREIGN KEY constraint
-- (verified against pg_constraint.conindid before dropping), so no integrity
-- guarantee is lost. Application query plans are unaffected because a covering
-- or equal index remains in place for each dropped one.
--
-- Measured saving: ~16 MB of index storage.

-- ---------- journal_entry_lines ----------
-- (c) indexes a column that is always NULL for every indexed row → useless.
DROP INDEX IF EXISTS public.idx_jel_deleted_at;
-- (b) superset: idx_jel_je_cov (same key, same predicate, superset INCLUDE).
DROP INDEX IF EXISTS public.idx_jel_journal_entry_id;
-- (b) superset: idx_jel_account (same key, no partial predicate).
DROP INDEX IF EXISTS public.idx_jel_account_id;
-- (b) superset: idx_jel_comp_account_entry_amounts.
DROP INDEX IF EXISTS public.idx_jel_company_account;
-- (b) superset: idx_jel_company_journal_entry.
DROP INDEX IF EXISTS public.idx_journal_entry_lines_company_id_fk;
-- (b) superset: idx_journal_entry_lines_party_account.
DROP INDEX IF EXISTS public.idx_journal_entry_lines_party_id;

-- ---------- journal_entries ----------
-- (b) superset: idx_je_comp_status_date_cov.
DROP INDEX IF EXISTS public.idx_journal_entries_company_status_date;

-- ---------- invoices ----------
-- (b) subset of idx_invoices_top_products_fast (same keys, fewer INCLUDE columns).
DROP INDEX IF EXISTS public.idx_invoices_top_products_180d;
-- (b) superset: idx_invoices_dashboard_covering.
DROP INDEX IF EXISTS public.idx_invoices_company_type_status;
-- (b) superset: idx_invoices_branch_covering.
DROP INDEX IF EXISTS public.idx_invoices_company_branch;

-- ---------- invoice_items ----------
-- (b) superset: idx_invoice_items_top_products.
DROP INDEX IF EXISTS public.idx_invoice_items_company_invoice;

-- ---------- product_search_numbers ----------
-- (b) superset: unique (product_id, normalized_number, number_type).
DROP INDEX IF EXISTS public.idx_product_search_numbers_prod;

-- ---------- payments ----------
-- (b) superset: uq_payments_company_number (stricter unique predicate).
DROP INDEX IF EXISTS public.ux_payments_company_payment_number;

-- ---------- product_stock ----------
-- (a) exact duplicate of uq_product_stock_per_warehouse.
DROP INDEX IF EXISTS public.idx_product_stock_lookup;

-- ---------- inventory_transactions ----------
-- (b) subset of idx_inventory_product_wh (non-partial).
DROP INDEX IF EXISTS public.idx_inv_tx_product_warehouse;

-- ---------- party_opening_balances ----------
-- (a) exact duplicate of uq_party_opening_balance.
DROP INDEX IF EXISTS public.idx_party_opening_bal_company_party_curr;

-- ---------- parties ----------
-- (b) superset: ux_parties_company_type_norm_name.
DROP INDEX IF EXISTS public.idx_parties_company_type;
DROP INDEX IF EXISTS public.idx_parties_company_type_lookup;
