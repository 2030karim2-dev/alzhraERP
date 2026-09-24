-- Migration: 20260924000006_drop_unused_indexes.sql
-- Description: Second cleanup pass on indexes, driven by real usage statistics
--              (`pg_stat_user_indexes.idx_scan`) rather than by guesswork.
--
-- Context: this project's `invoices`, `journal_entries`, `journal_entry_lines`
-- and `products` tables carried far more indexes than any query needed. Each
-- index was classified before being dropped:
--
--   (A) a duplicate of an existing UNIQUE constraint, so the integrity
--       guarantee is unchanged;
--   (B) never used once in the whole statistics window (idx_scan = 0) and not
--       supporting any PRIMARY KEY / UNIQUE / FOREIGN KEY constraint.
--
-- Every index kept here that IS the target of a foreign key was left in place
-- (e.g. `invoices_company_id_uq`, which six composite FKs depend on).
--
-- Measured saving: ~33.9 MB.

-- ---------- (A) fully implied by a stricter UNIQUE constraint ----------
-- (company_id, invoice_number) is already UNIQUE, so a unique index on
-- (company_id, type, invoice_number) can never reject anything new.
DROP INDEX IF EXISTS public.invoices_unique_number_per_company_type;
-- Same reasoning for the partial duplicate of the same key.
DROP INDEX IF EXISTS public.ux_invoices_company_invoice_number;
-- (company_id, payment_number) is already UNIQUE via a real constraint.
DROP INDEX IF EXISTS public.payments_unique_number_per_company;
DROP INDEX IF EXISTS public.uq_payments_company_number;

-- ---------- (B) unused, no constraint backing ----------
-- invoices
DROP INDEX IF EXISTS public.idx_invoices_company_type_status_date;
DROP INDEX IF EXISTS public.idx_invoices_company_status;
DROP INDEX IF EXISTS public.idx_invoices_company_account;
DROP INDEX IF EXISTS public.idx_invoices_currency_fk;
DROP INDEX IF EXISTS public.idx_invoices_payment_account_id;

-- payments
DROP INDEX IF EXISTS public.idx_payments_account_fk;
DROP INDEX IF EXISTS public.idx_payments_currency_fk;
DROP INDEX IF EXISTS public.idx_payments_counterparty_account_id;

-- journal_entries
DROP INDEX IF EXISTS public.idx_journal_entries_company_date;
DROP INDEX IF EXISTS public.idx_journal_entries_company_status;

-- journal_entry_lines
-- A large covering index (debit/credit aggregation by party) that no query used.
DROP INDEX IF EXISTS public.idx_jel_comp_party_act;

-- products
-- `global_search_text` and `search_vector` are never queried by the application.
-- NOTE: idx_products_normalized_trgm is deliberately KEPT — three services
-- (productService, useProductsPaginated, pos/searchService) run
-- `normalized_search_text ILIKE '%term%'` against it.
DROP INDEX IF EXISTS public.idx_products_global_search;
DROP INDEX IF EXISTS public.idx_products_search_vector;
DROP INDEX IF EXISTS public.idx_products_part_number;
DROP INDEX IF EXISTS public.idx_products_company_updated;
DROP INDEX IF EXISTS public.idx_products_category_id;

-- invoice_items
DROP INDEX IF EXISTS public.idx_invoice_items_company_product;
DROP INDEX IF EXISTS public.idx_invoice_items_tax_rate_fk;

-- parties
DROP INDEX IF EXISTS public.idx_parties_company_type_name;
DROP INDEX IF EXISTS public.idx_parties_name;
DROP INDEX IF EXISTS public.idx_parties_category_id;
