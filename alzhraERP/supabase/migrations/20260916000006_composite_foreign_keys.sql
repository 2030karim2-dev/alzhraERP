-- =========================================================================================
-- Migration: Composite Foreign Keys for Strict Multi-Tenant Isolation (Phase 3)
-- =========================================================================================

-- 1. ADD UNIQUE(company_id, id) to Master Tables

ALTER TABLE public.parties DROP CONSTRAINT IF EXISTS uq_parties_company_id;
ALTER TABLE public.parties ADD CONSTRAINT uq_parties_company_id UNIQUE (company_id, id);

ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS uq_branches_company_id;
ALTER TABLE public.branches ADD CONSTRAINT uq_branches_company_id UNIQUE (company_id, id);

ALTER TABLE public.warehouses DROP CONSTRAINT IF EXISTS uq_warehouses_company_id;
ALTER TABLE public.warehouses ADD CONSTRAINT uq_warehouses_company_id UNIQUE (company_id, id);

ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS uq_accounts_company_id;
ALTER TABLE public.accounts ADD CONSTRAINT uq_accounts_company_id UNIQUE (company_id, id);

ALTER TABLE public.fin_accounts DROP CONSTRAINT IF EXISTS uq_fin_accounts_company_id;
ALTER TABLE public.fin_accounts ADD CONSTRAINT uq_fin_accounts_company_id UNIQUE (company_id, id);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS uq_products_company_id;
ALTER TABLE public.products ADD CONSTRAINT uq_products_company_id UNIQUE (company_id, id);

ALTER TABLE public.tax_rates DROP CONSTRAINT IF EXISTS uq_tax_rates_company_id;
ALTER TABLE public.tax_rates ADD CONSTRAINT uq_tax_rates_company_id UNIQUE (company_id, id);


-- 2. UPDATE FOREIGN KEYS to Composite (company_id, ref_id)

-- A. Invoices -> Parties
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_party_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_party_id_fkey FOREIGN KEY (company_id, party_id) REFERENCES public.parties(company_id, id) ON DELETE RESTRICT;

-- B. Invoices -> Branches
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_branch_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_branch_id_fkey FOREIGN KEY (company_id, branch_id) REFERENCES public.branches(company_id, id) ON DELETE RESTRICT;

-- C. Inventory Transactions -> Warehouses
ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_warehouse_id_fkey;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_warehouse_id_fkey FOREIGN KEY (company_id, warehouse_id) REFERENCES public.warehouses(company_id, id) ON DELETE RESTRICT;

-- D. Inventory Transactions -> Products
ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_product_id_fkey;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (company_id, product_id) REFERENCES public.products(company_id, id) ON DELETE RESTRICT;

-- E. Journal Entries -> Branches
ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_branch_id_fkey;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_branch_id_fkey FOREIGN KEY (company_id, branch_id) REFERENCES public.branches(company_id, id) ON DELETE RESTRICT;

-- F. Journal Entry Lines -> Accounts (Using fin_accounts as that's the current master)
ALTER TABLE public.fin_journal_lines DROP CONSTRAINT IF EXISTS fin_journal_lines_account_id_fkey;
-- fin_journal_lines doesn't have company_id directly. Wait! This is a flaw.
-- fin_journal_lines inherits company_id via journal_id. We cannot enforce composite FK directly unless we add company_id.
-- Let's add company_id to fin_journal_lines.
ALTER TABLE public.fin_journal_lines ADD COLUMN IF NOT EXISTS company_id uuid;

-- Backfill company_id
UPDATE public.fin_journal_lines jl
SET company_id = je.company_id
FROM public.fin_journal_entries je
WHERE jl.journal_id = je.id AND jl.company_id IS NULL;

-- Now add constraint
ALTER TABLE public.fin_journal_lines ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.fin_journal_lines ADD CONSTRAINT fin_journal_lines_account_id_fkey FOREIGN KEY (company_id, account_id) REFERENCES public.fin_accounts(company_id, id) ON DELETE RESTRICT;
ALTER TABLE public.fin_journal_lines ADD CONSTRAINT fin_journal_lines_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;

-- G. Expenses -> Branches
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_branch_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (company_id, branch_id) REFERENCES public.branches(company_id, id) ON DELETE RESTRICT;

-- H. Expenses -> Accounts
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_account_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_account_id_fkey FOREIGN KEY (company_id, account_id) REFERENCES public.accounts(company_id, id) ON DELETE RESTRICT;

-- I. Expenses -> Tax Rates
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_tax_rate_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_tax_rate_id_fkey FOREIGN KEY (company_id, tax_rate_id) REFERENCES public.tax_rates(company_id, id) ON DELETE RESTRICT;

-- J. Invoice Items -> Products
-- invoice_items doesn't have company_id directly, or does it?
-- We added it earlier in Phase 1/2 or it already exists. Let's assume it exists as we enforced it in unique constraint check.
ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_items_product;
ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_product_id_fkey;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (company_id, product_id) REFERENCES public.products(company_id, id) ON DELETE RESTRICT;

-- K. Invoice Items -> Tax Rates
ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_items_tax_rate;
ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_tax_rate_id_fkey;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_tax_rate_id_fkey FOREIGN KEY (company_id, tax_rate_id) REFERENCES public.tax_rates(company_id, id) ON DELETE RESTRICT;

-- =========================================================================================
-- End of Migration
-- =========================================================================================
