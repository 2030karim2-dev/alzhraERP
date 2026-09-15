-- Migration: 20260915000001_deep_schema_hardening_and_integrity_constraints.sql
-- Description: Deep schema hardening, multi-tenant composite foreign keys, inventory ledger immutability, payment allocation caps, party matching, accounting sanity checks, feature flag engine fix, and performance indexes.

-- ============================================================================
-- 1. Multi-Tenant Composite Unique Constraints (المفاتيح المركبة لضمان العزل التام)
-- ============================================================================

DO $$
BEGIN
  -- 1.1 Add Composite UNIQUE (company_id, id) on Parent Master Tables to enable Tenant Composite Foreign Keys
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_branches_company_id') THEN
    ALTER TABLE public.branches ADD CONSTRAINT uq_branches_company_id UNIQUE (company_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_warehouses_company_id') THEN
    ALTER TABLE public.warehouses ADD CONSTRAINT uq_warehouses_company_id UNIQUE (company_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_products_company_id') THEN
    ALTER TABLE public.products ADD CONSTRAINT uq_products_company_id UNIQUE (company_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_parties_company_id') THEN
    ALTER TABLE public.parties ADD CONSTRAINT uq_parties_company_id UNIQUE (company_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_invoices_company_id') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT uq_invoices_company_id UNIQUE (company_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_journal_entries_company_id') THEN
    ALTER TABLE public.journal_entries ADD CONSTRAINT uq_journal_entries_company_id UNIQUE (company_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_accounts_company_id') THEN
    ALTER TABLE public.accounts ADD CONSTRAINT uq_accounts_company_id UNIQUE (company_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_payments_company_id') THEN
    ALTER TABLE public.payments ADD CONSTRAINT uq_payments_company_id UNIQUE (company_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_prc_suppliers_company_id') THEN
    ALTER TABLE public.prc_suppliers ADD CONSTRAINT uq_prc_suppliers_company_id UNIQUE (company_id, supplier_id);
  END IF;

END $$;

-- ============================================================================
-- 2. Multi-Tenant Composite Foreign Keys (ربط العلاقات لمنع التداخل بين الشركات)
-- ============================================================================

DO $$
BEGIN
  -- 2.1 product_stock -> products & warehouses
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_stock_company_product') THEN
    ALTER TABLE public.product_stock 
      ADD CONSTRAINT fk_product_stock_company_product 
      FOREIGN KEY (company_id, product_id) REFERENCES public.products(company_id, id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_stock_company_warehouse') THEN
    ALTER TABLE public.product_stock 
      ADD CONSTRAINT fk_product_stock_company_warehouse 
      FOREIGN KEY (company_id, warehouse_id) REFERENCES public.warehouses(company_id, id) ON DELETE CASCADE;
  END IF;

  -- 2.2 invoice_items -> invoices & products
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoice_items_company_invoice') THEN
    ALTER TABLE public.invoice_items 
      ADD CONSTRAINT fk_invoice_items_company_invoice 
      FOREIGN KEY (company_id, invoice_id) REFERENCES public.invoices(company_id, id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoice_items_company_product') THEN
    ALTER TABLE public.invoice_items 
      ADD CONSTRAINT fk_invoice_items_company_product 
      FOREIGN KEY (company_id, product_id) REFERENCES public.products(company_id, id) ON DELETE RESTRICT;
  END IF;

  -- 2.3 invoices -> parties & branches
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_company_party') THEN
    ALTER TABLE public.invoices 
      ADD CONSTRAINT fk_invoices_company_party 
      FOREIGN KEY (company_id, party_id) REFERENCES public.parties(company_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_company_branch') THEN
    ALTER TABLE public.invoices 
      ADD CONSTRAINT fk_invoices_company_branch 
      FOREIGN KEY (company_id, branch_id) REFERENCES public.branches(company_id, id) ON DELETE RESTRICT;
  END IF;

  -- 2.4 warehouses -> branches
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_warehouses_company_branch') THEN
    ALTER TABLE public.warehouses 
      ADD CONSTRAINT fk_warehouses_company_branch 
      FOREIGN KEY (company_id, branch_id) REFERENCES public.branches(company_id, id) ON DELETE RESTRICT;
  END IF;

  -- 2.5 journal_entry_lines -> journal_entries & accounts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jel_company_journal_entry') THEN
    ALTER TABLE public.journal_entry_lines 
      ADD CONSTRAINT fk_jel_company_journal_entry 
      FOREIGN KEY (company_id, journal_entry_id) REFERENCES public.journal_entries(company_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jel_company_account') THEN
    ALTER TABLE public.journal_entry_lines 
      ADD CONSTRAINT fk_jel_company_account 
      FOREIGN KEY (company_id, account_id) REFERENCES public.accounts(company_id, id) ON DELETE RESTRICT;
  END IF;

  -- 2.6 payment_allocations -> payments & invoices
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_allocations_company_payment') THEN
    ALTER TABLE public.payment_allocations 
      ADD CONSTRAINT fk_payment_allocations_company_payment 
      FOREIGN KEY (company_id, payment_id) REFERENCES public.payments(company_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_allocations_company_invoice') THEN
    ALTER TABLE public.payment_allocations 
      ADD CONSTRAINT fk_payment_allocations_company_invoice 
      FOREIGN KEY (company_id, invoice_id) REFERENCES public.invoices(company_id, id) ON DELETE RESTRICT;
  END IF;

  -- 2.7 prc_suppliers -> parties (Accounting Party Integration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'prc_suppliers' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE public.prc_suppliers ADD COLUMN party_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prc_suppliers_company_party') THEN
    ALTER TABLE public.prc_suppliers 
      ADD CONSTRAINT fk_prc_suppliers_company_party 
      FOREIGN KEY (company_id, party_id) REFERENCES public.parties(company_id, id) ON DELETE SET NULL;
  END IF;

  -- 2.8 prc_goods_receipts -> warehouses
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prc_grn_company_warehouse') THEN
    ALTER TABLE public.prc_goods_receipts 
      ADD CONSTRAINT fk_prc_grn_company_warehouse 
      FOREIGN KEY (company_id, warehouse_id) REFERENCES public.warehouses(company_id, id) ON DELETE RESTRICT;
  END IF;

END $$;

-- ============================================================================
-- 3. Additional Composite Unique Constraints (منع التكرار على مستوى المنشأة)
-- ============================================================================

DO $$
BEGIN
  -- 3.1 prc_suppliers supplier_code
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prc_suppliers_supplier_code_key') THEN
    ALTER TABLE public.prc_suppliers DROP CONSTRAINT prc_suppliers_supplier_code_key;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_prc_suppliers_company_code') THEN
    ALTER TABLE public.prc_suppliers 
      ADD CONSTRAINT uq_prc_suppliers_company_code UNIQUE (company_id, supplier_code);
  END IF;

  -- 3.2 prc_supplier_contracts contract_number
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prc_supplier_contracts_contract_number_key') THEN
    ALTER TABLE public.prc_supplier_contracts DROP CONSTRAINT prc_supplier_contracts_contract_number_key;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_prc_contracts_company_number') THEN
    ALTER TABLE public.prc_supplier_contracts 
      ADD CONSTRAINT uq_prc_contracts_company_number UNIQUE (company_id, contract_number);
  END IF;

  -- 3.3 product_stock per warehouse uniqueness
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_product_stock_warehouse') THEN
    ALTER TABLE public.product_stock 
      ADD CONSTRAINT uq_product_stock_warehouse UNIQUE (product_id, warehouse_id);
  END IF;

END $$;

-- Anti-Duplication Indexes for Invoices & Payments (Excluding Archived/Deleted)
CREATE UNIQUE INDEX IF NOT EXISTS ux_invoices_company_invoice_number 
  ON public.invoices (company_id, invoice_number) 
  WHERE deleted_at IS NULL AND invoice_number IS NOT NULL AND invoice_number <> '';

CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_company_payment_number 
  ON public.payments (company_id, payment_number) 
  WHERE deleted_at IS NULL AND payment_number IS NOT NULL AND payment_number <> '';

-- ============================================================================
-- 4. Payment Allocation Hardening & Party Matching (حماية السندات والتوزيع)
-- ============================================================================

-- 4.1 Harden validate_payment_allocation_company to enforce matching party_id
CREATE OR REPLACE FUNCTION public.validate_payment_allocation_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment_company uuid;
  v_invoice_company uuid;
  v_payment_party   uuid;
  v_invoice_party   uuid;
BEGIN
  SELECT company_id, party_id INTO v_payment_company, v_payment_party FROM public.payments WHERE id = NEW.payment_id;
  SELECT company_id, party_id INTO v_invoice_company, v_invoice_party FROM public.invoices WHERE id = NEW.invoice_id;

  IF v_payment_company IS DISTINCT FROM v_invoice_company THEN
    RAISE EXCEPTION 'تعارض المنشأة: المنشأة في السند (%) لا تطابق المنشأة في الفاتورة (%)', v_payment_company, v_invoice_company USING ERRCODE = '23514';
  END IF;

  IF v_payment_party IS DISTINCT FROM v_invoice_party THEN
    RAISE EXCEPTION 'تعارض الطرف: العميل/المورد في السند لا يطابق الطرف في الفاتورة' USING ERRCODE = '23514';
  END IF;

  NEW.company_id := v_payment_company;
  RETURN NEW;
END;
$function$;

-- 4.2 Enforce Total Allocation Amount Cap (Sum of allocations <= Payment Amount)
CREATE OR REPLACE FUNCTION public.validate_payment_allocation_total_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment_id       uuid;
  v_total_allocated  numeric;
  v_payment_amount   numeric;
BEGIN
  v_payment_id := COALESCE(NEW.payment_id, OLD.payment_id);
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_allocated
  FROM public.payment_allocations
  WHERE payment_id = v_payment_id AND deleted_at IS NULL;

  SELECT amount INTO v_payment_amount
  FROM public.payments
  WHERE id = v_payment_id;

  IF v_payment_amount IS NOT NULL AND v_total_allocated > v_payment_amount + 0.001 THEN
    RAISE EXCEPTION 'إجمالي مبالغ التوزيع (%) يتجاوز قيمة السند الأصلية (%)', v_total_allocated, v_payment_amount USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_payment_allocation_total_amount ON public.payment_allocations;
CREATE TRIGGER trg_validate_payment_allocation_total_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_allocation_total_amount();

-- 4.3 Invoice Paid Amount Guard
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_paid_not_exceed_total') THEN
    ALTER TABLE public.invoices 
      ADD CONSTRAINT chk_invoices_paid_not_exceed_total CHECK (paid_amount <= total_amount + 0.01);
  END IF;
END $$;

-- ============================================================================
-- 5. Accounting Sanity & Journal Lines Guardrails
-- ============================================================================

DO $$
BEGIN
  -- 5.1 Ensure line must be strictly debit OR credit, rejecting zero-lines (0,0) and double-sided lines (>0,>0)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_jel_debit_credit_exclusive') THEN
    ALTER TABLE public.journal_entry_lines DROP CONSTRAINT chk_jel_debit_credit_exclusive;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_lines_one_side_only') THEN
    ALTER TABLE public.journal_entry_lines DROP CONSTRAINT journal_lines_one_side_only;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_jel_positive_one_side') THEN
    ALTER TABLE public.journal_entry_lines 
      ADD CONSTRAINT chk_jel_positive_one_side 
      CHECK (
        (debit_amount > 0 AND credit_amount = 0) 
        OR 
        (credit_amount > 0 AND debit_amount = 0)
      );
  END IF;
END $$;

-- ============================================================================
-- 6. Inventory Ledger Immutability Guardrail (حماية سجل الحركات التاريخية)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_inventory_ledger_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.product_id IS DISTINCT FROM NEW.product_id OR
       OLD.warehouse_id IS DISTINCT FROM NEW.warehouse_id OR
       OLD.quantity IS DISTINCT FROM NEW.quantity OR
       OLD.transaction_type IS DISTINCT FROM NEW.transaction_type OR
       OLD.unit_cost IS DISTINCT FROM NEW.unit_cost OR
       OLD.company_id IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'غير مسموح بتعديل قيم حركة المخزون التاريخية. استخدم تسوية أو حركة عكسية.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_inventory_ledger_modification ON public.inventory_transactions;
CREATE TRIGGER trg_prevent_inventory_ledger_modification
  BEFORE UPDATE ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_inventory_ledger_modification();

-- ============================================================================
-- 7. Fix Broken Feature Flag Engine & Job Queue RPC
-- ============================================================================

-- 7.1 Rewrite api_v1_sys_is_feature_enabled matching active schema
CREATE OR REPLACE FUNCTION public.api_v1_sys_is_feature_enabled(
  p_flag_name character varying,
  p_company_id uuid DEFAULT NULL::uuid,
  p_user_id uuid DEFAULT NULL::uuid,
  p_role character varying DEFAULT NULL::character varying
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_enabled boolean;
BEGIN
  IF p_company_id IS NOT NULL THEN
    PERFORM public.fn_assert_company_access(p_company_id);
  END IF;

  SELECT is_enabled INTO v_enabled
  FROM public.sys_feature_flags
  WHERE flag_name = p_flag_name
    AND company_id = p_company_id
    AND (effective_from IS NULL OR effective_from <= NOW())
    AND (effective_to IS NULL OR effective_to >= NOW())
  LIMIT 1;

  IF v_enabled IS NULL THEN
    SELECT COALESCE(is_enabled_globally, false) INTO v_enabled
    FROM public.feature_flags
    WHERE key = p_flag_name;
  END IF;

  RETURN COALESCE(v_enabled, false);
END;
$function$;

-- 7.2 Atomic Job Queue Claim RPC (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.api_v1_sys_claim_job(
  p_worker_id character varying,
  p_lease_seconds integer DEFAULT 60
)
RETURNS TABLE (
  job_id uuid,
  company_id uuid,
  job_type character varying,
  payload jsonb,
  correlation_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_job record;
BEGIN
  SELECT q.job_id, q.company_id, q.job_type, q.payload, q.correlation_id
  INTO v_job
  FROM public.sys_job_queue q
  WHERE q.status IN ('pending', 'retry')
    AND (q.run_after IS NULL OR q.run_after <= NOW())
    AND (q.locked_at IS NULL OR q.locked_at < NOW() - (p_lease_seconds || ' seconds')::interval)
  ORDER BY q.numeric_priority DESC, q.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_job.job_id IS NOT NULL THEN
    UPDATE public.sys_job_queue
    SET status = 'processing',
        worker_id = p_worker_id,
        locked_at = NOW(),
        heartbeat_at = NOW(),
        attempt_count = attempt_count + 1,
        updated_at = NOW()
    WHERE sys_job_queue.job_id = v_job.job_id;

    RETURN QUERY SELECT v_job.job_id, v_job.company_id, v_job.job_type, v_job.payload, v_job.correlation_id;
  END IF;
END;
$function$;

-- ============================================================================
-- 8. Performance Indexes for Unindexed Foreign Keys
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fixed_assets_accum_depr_account 
  ON public.fixed_assets(accumulated_depr_account_id);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_asset_account 
  ON public.fixed_assets(asset_account_id);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_branch 
  ON public.fixed_assets(branch_id);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_depr_exp_account 
  ON public.fixed_assets(depreciation_expense_account_id);

CREATE INDEX IF NOT EXISTS idx_fixed_asset_depr_company 
  ON public.fixed_asset_depreciations(company_id);

CREATE INDEX IF NOT EXISTS idx_fixed_asset_depr_journal_entry 
  ON public.fixed_asset_depreciations(journal_entry_id);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_req_created_by 
  ON public.stock_transfer_requests(created_by);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_req_product 
  ON public.stock_transfer_requests(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_req_reviewed_by 
  ON public.stock_transfer_requests(reviewed_by);
