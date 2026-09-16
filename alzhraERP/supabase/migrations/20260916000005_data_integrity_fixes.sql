-- =====================================================================================
-- Phase 2: Schema Integrity, Dangerous Cascades, and Status Check Constraints
-- =====================================================================================

-- 1. Remove dangerous ON DELETE CASCADE from historical transaction tables
-- We drop the existing cascade constraints and add them back with RESTRICT.

-- A. Inventory Transactions
ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_product_id_fkey;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_warehouse_id_fkey;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;

-- B. Journal Entries
-- (Assuming journal_entry_lines account_id doesn't cascade, but if it does, we should restrict)
ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_company_id_fkey;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;

-- C. Procurement Invoices & POs
ALTER TABLE public.prc_purchase_invoice_items DROP CONSTRAINT IF EXISTS prc_purchase_invoice_items_product_id_fkey;
-- (Add restriction on product deletion if it exists on invoices)

-- 2. Status Integrity - Enforcing valid states
-- Financial Journal Entries
ALTER TABLE public.fin_journal_entries DROP CONSTRAINT IF EXISTS chk_fin_journal_status;
ALTER TABLE public.fin_journal_entries ADD CONSTRAINT chk_fin_journal_status CHECK (status IN ('DRAFT', 'POSTED', 'VOIDED', 'REVERSED', 'CANCELLED'));

-- Purchase Orders
ALTER TABLE public.prc_purchase_orders DROP CONSTRAINT IF EXISTS chk_po_status;
ALTER TABLE public.prc_purchase_orders ADD CONSTRAINT chk_po_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'partially_received', 'fully_received', 'cancelled', 'closed'));

-- Purchase Invoices
ALTER TABLE public.prc_purchase_invoices DROP CONSTRAINT IF EXISTS chk_purchase_invoice_status;
ALTER TABLE public.prc_purchase_invoices ADD CONSTRAINT chk_purchase_invoice_status CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'paid', 'partially_paid', 'cancelled', 'reversed'));

-- Goods Receipts
ALTER TABLE public.prc_goods_receipts DROP CONSTRAINT IF EXISTS chk_grn_status;
ALTER TABLE public.prc_goods_receipts ADD CONSTRAINT chk_grn_status CHECK (status IN ('draft', 'inspected', 'partially_accepted', 'accepted', 'rejected', 'cancelled'));

-- Quotations
ALTER TABLE public.prc_quotations DROP CONSTRAINT IF EXISTS chk_quotation_status;
ALTER TABLE public.prc_quotations ADD CONSTRAINT chk_quotation_status CHECK (status IN ('draft', 'submitted', 'in_review', 'accepted', 'rejected', 'expired'));

-- RFQs
ALTER TABLE public.prc_rfqs DROP CONSTRAINT IF EXISTS chk_rfq_status;
ALTER TABLE public.prc_rfqs ADD CONSTRAINT chk_rfq_status CHECK (status IN ('draft', 'published', 'closed', 'evaluating', 'awarded', 'cancelled'));

-- Purchase Requests
ALTER TABLE public.prc_purchase_requests DROP CONSTRAINT IF EXISTS chk_pr_status;
ALTER TABLE public.prc_purchase_requests ADD CONSTRAINT chk_pr_status CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'converted_to_rfq', 'converted_to_po', 'cancelled'));

-- Suppliers
ALTER TABLE public.prc_suppliers DROP CONSTRAINT IF EXISTS chk_supplier_status;
ALTER TABLE public.prc_suppliers ADD CONSTRAINT chk_supplier_status CHECK (status IN ('active', 'inactive', 'blocked', 'blacklisted', 'pending'));

-- Supplier Contracts
ALTER TABLE public.prc_supplier_contracts DROP CONSTRAINT IF EXISTS chk_contract_status;
ALTER TABLE public.prc_supplier_contracts ADD CONSTRAINT chk_contract_status CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'suspended'));

-- Inventory Stock Movements
ALTER TABLE public.inv_stock_movements DROP CONSTRAINT IF EXISTS chk_inv_movement_status;
ALTER TABLE public.inv_stock_movements ADD CONSTRAINT chk_inv_movement_status CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED'));

-- Inventory Stock Audits
ALTER TABLE public.inv_stock_audits DROP CONSTRAINT IF EXISTS chk_inv_audit_status;
ALTER TABLE public.inv_stock_audits ADD CONSTRAINT chk_inv_audit_status CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'POSTED', 'CANCELLED'));

-- Background Workers / Jobs
ALTER TABLE public.sys_job_queue DROP CONSTRAINT IF EXISTS chk_job_status;
ALTER TABLE public.sys_job_queue ADD CONSTRAINT chk_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying', 'cancelled'));

-- Workflow Instances
ALTER TABLE public.sys_workflow_instances DROP CONSTRAINT IF EXISTS chk_workflow_instance_status;
ALTER TABLE public.sys_workflow_instances ADD CONSTRAINT chk_workflow_instance_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled', 'suspended'));

