-- ============================================================================
-- Migration: 20260914050000_branch_security_phase1.sql
-- Description: Phase-1 hardening of the Branches subsystem (deep audit 2026-09-14):
--   1. Restrict branches INSERT/UPDATE to owner/admin/manager (was: ANY member
--      of the company — even viewer — could create/edit branches).
--   2. Trigger-enforce that invoices / expenses / payments / journal_entries /
--      quotations can only reference a branch_id of their own company. This
--      closes the SECURITY DEFINER bypass: commit_sales_invoice_v2 accepted an
--      arbitrary p_branch_id because RLS WITH CHECK does not apply to definer
--      functions (findings C-2 / C-3 of the audit).
--   3. Fix generate_invoice_number fallback: company-scoped lookup + neutral
--      'MAIN' code instead of the tenant-specific hardcoded 'WN' (finding H-3).
--   4. Restore the branch_notifications INSERT inside fn_process_cross_branch_sale
--      — migration 20260914000004 dropped it and kept pg_notify only, so the
--      frontend realtime (postgres_changes) subscription never fired (H-1).
--   5. Normalized uniqueness per company: LOWER(TRIM(name)), unique branch
--      code, and a single main branch per company (finding M-1).
--   6. Seed 'settings:manage' for the manager role (UI/RLS parity with the
--      user_is_admin_or_manager policies).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. branches INSERT/UPDATE → admin/manager only (DELETE stays owner-only per
--    migration 20260913000001)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "branches_insert" ON public.branches;
CREATE POLICY "branches_insert" ON public.branches FOR INSERT TO public WITH CHECK (
  is_super_admin() OR public.user_is_admin_or_manager(company_id)
);

DROP POLICY IF EXISTS "branches_update" ON public.branches;
CREATE POLICY "branches_update" ON public.branches FOR UPDATE TO public USING (
  is_super_admin() OR public.user_is_admin_or_manager(company_id)
) WITH CHECK (
  is_super_admin() OR public.user_is_admin_or_manager(company_id)
);

-- ---------------------------------------------------------------------------
-- 2. Branch/company integrity trigger — fires for ALL writers, including
--    SECURITY DEFINER RPCs that bypass RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_validate_branch_belongs_to_company()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.branches
      WHERE id = NEW.branch_id
        AND company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'الفرع المحدد لا ينتمي إلى منشأة هذه العملية (branch_id غير صالح)'
        USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_branch_company_invoices ON public.invoices;
CREATE TRIGGER trg_validate_branch_company_invoices
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_branch_belongs_to_company();

DROP TRIGGER IF EXISTS trg_validate_branch_company_expenses ON public.expenses;
CREATE TRIGGER trg_validate_branch_company_expenses
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_branch_belongs_to_company();

DROP TRIGGER IF EXISTS trg_validate_branch_company_payments ON public.payments;
CREATE TRIGGER trg_validate_branch_company_payments
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_branch_belongs_to_company();

DROP TRIGGER IF EXISTS trg_validate_branch_company_journal_entries ON public.journal_entries;
CREATE TRIGGER trg_validate_branch_company_journal_entries
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_branch_belongs_to_company();

DROP TRIGGER IF EXISTS trg_validate_branch_company_quotations ON public.quotations;
CREATE TRIGGER trg_validate_branch_company_quotations
  BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_branch_belongs_to_company();

-- ---------------------------------------------------------------------------
-- 3. generate_invoice_number — company-scoped branch-code fallback + neutral
--    'MAIN' code (was: unscoped lookup + hardcoded 'WN' of a specific tenant)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_company_id uuid,
  p_type text,
  p_branch_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_count  bigint;
  v_branch_code text := '';
  v_lock_key text;
BEGIN
  v_prefix := CASE p_type
    WHEN 'sale'             THEN 'INV'
    WHEN 'purchase'         THEN 'PUR'
    WHEN 'sale_return'      THEN 'RET'
    WHEN 'purchase_return'  THEN 'RPR'
    ELSE                         'DOC'
  END;

  IF p_branch_id IS NOT NULL THEN
    SELECT code INTO v_branch_code FROM branches WHERE id = p_branch_id AND company_id = p_company_id;
    IF v_branch_code IS NULL OR v_branch_code = '' THEN
      -- [AUDIT FIX H-3] fallback scoped to the company + neutral 'MAIN' code
      -- (was: unscoped lookup returning tenant-specific 'WN' for any main branch)
      SELECT CASE WHEN is_main THEN 'MAIN' ELSE 'B' || UPPER(SUBSTRING(id::text, 1, 4)) END
      INTO v_branch_code FROM branches WHERE id = p_branch_id AND company_id = p_company_id;
    END IF;

    IF v_branch_code IS NOT NULL AND v_branch_code <> '' THEN
      v_prefix := v_prefix || '-' || v_branch_code;
    END IF;
    v_lock_key := p_company_id::text || p_type || p_branch_id::text;
  ELSE
    v_lock_key := p_company_id::text || p_type;
  END IF;

  -- Advisory lock to prevent invoice number race conditions
  PERFORM pg_advisory_xact_lock(hashtext(v_lock_key));

  IF p_branch_id IS NOT NULL THEN
    SELECT COUNT(*) + 1 INTO v_count
    FROM invoices
    WHERE company_id = p_company_id AND branch_id = p_branch_id AND type = p_type AND deleted_at IS NULL;
  ELSE
    SELECT COUNT(*) + 1 INTO v_count
    FROM invoices
    WHERE company_id = p_company_id AND branch_id IS NULL AND type = p_type AND deleted_at IS NULL;
  END IF;

  RETURN v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD')
         || '-' || LPAD(v_count::text, 4, '0');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(uuid, text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid, text, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. fn_process_cross_branch_sale — keeps all 20260914000004 security fixes and
--    re-adds the persisted branch_notifications row (H-1: the frontend listens
--    to postgres_changes INSERTs on this table; pg_notify alone never reaches it)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_process_cross_branch_sale(
    p_company_id uuid,
    p_seller_branch_id uuid,
    p_source_warehouse_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_payment_type text,
    p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_source_branch_id uuid;
    v_item record;
    v_cost_price numeric;
    v_internal_sale_id uuid;
    v_customer_sale_id uuid;
    v_total_cost numeric := 0;
    v_total_sale numeric := 0;
    v_inv_num_internal text;
    v_inv_num_customer text;
    v_acc_interbranch uuid;
    v_acc_inventory uuid;
    v_je_out_id uuid;
    v_je_in_id uuid;
    v_real_user_id uuid;
BEGIN
    -- [SECURITY FIX 1] Check User Impersonation
    v_real_user_id := auth.uid();
    IF p_user_id != v_real_user_id THEN
        RAISE EXCEPTION 'Unauthorized: User ID mismatch';
    END IF;

    -- [SECURITY FIX 2] Assert Company Access (Tenant Isolation)
    PERFORM public.fn_assert_company_access(p_company_id);

    -- [SECURITY FIX 3] Verify Seller Branch belongs to the company
    IF NOT EXISTS (SELECT 1 FROM public.branches WHERE id = p_seller_branch_id AND company_id = p_company_id) THEN
        RAISE EXCEPTION 'Unauthorized: Seller branch does not belong to the specified company';
    END IF;

    -- 1. Identify Source Branch
    SELECT branch_id INTO v_source_branch_id 
    FROM public.warehouses 
    WHERE id = p_source_warehouse_id AND company_id = p_company_id;
    
    IF v_source_branch_id IS NULL THEN
        RAISE EXCEPTION 'Warehouse does not belong to a specific branch or does not exist.';
    END IF;

    IF v_source_branch_id = p_seller_branch_id THEN
        RAISE EXCEPTION 'Not a cross-branch sale. Source and Seller branches are the same.';
    END IF;

    -- Get Accounts
    SELECT id INTO v_acc_interbranch FROM public.accounts WHERE company_id = p_company_id AND code = '3300' LIMIT 1;
    SELECT id INTO v_acc_inventory FROM public.accounts WHERE company_id = p_company_id AND code = '1200' LIMIT 1;
    
    IF v_acc_interbranch IS NULL OR v_acc_inventory IS NULL THEN
        RAISE EXCEPTION 'Required accounts (3300 Inter-branch or 1200 Inventory) are missing.';
    END IF;

    -- 2. Generate Invoice Numbers
    v_inv_num_internal := public.generate_invoice_number(p_company_id, 'sale', v_source_branch_id);
    v_inv_num_customer := public.generate_invoice_number(p_company_id, 'sale', p_seller_branch_id);

    -- 3. Create Internal Sale Invoice (Source Branch -> Seller Branch @ Cost)
    INSERT INTO invoices (
        id, company_id, branch_id, type, party_id, issue_date, due_date, 
        total_amount, status, payment_status, created_by, invoice_number, notes
    ) VALUES (
        gen_random_uuid(), p_company_id, v_source_branch_id, 'sale', NULL, CURRENT_DATE, CURRENT_DATE,
        0, 'approved', 'unpaid', p_user_id, v_inv_num_internal || '-INT', 'مبيعات داخلية لفرع آخر'
    ) RETURNING id INTO v_internal_sale_id;

    -- 4. Create Customer Sale Invoice (Seller Branch -> Customer @ Sale Price)
    INSERT INTO invoices (
        id, company_id, branch_id, type, party_id, issue_date, due_date, 
        total_amount, status, payment_status, created_by, invoice_number, notes, payment_method
    ) VALUES (
        gen_random_uuid(), p_company_id, p_seller_branch_id, 'sale', p_customer_id, CURRENT_DATE, CURRENT_DATE,
        0, 'draft', p_payment_type, p_user_id, v_inv_num_customer, 'مبيعات بضاعة من مستودع فرع آخر', p_payment_type
    ) RETURNING id INTO v_customer_sale_id;

    -- 5. Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity numeric, sale_price numeric)
    LOOP
        SELECT weighted_avg_cost INTO v_cost_price 
        FROM product_stock 
        WHERE product_id = v_item.product_id AND warehouse_id = p_source_warehouse_id;

        IF v_cost_price IS NULL THEN v_cost_price := 0; END IF;

        v_total_cost := v_total_cost + (v_cost_price * v_item.quantity);
        v_total_sale := v_total_sale + (v_item.sale_price * v_item.quantity);

        -- Add to Internal Sale (At Cost)
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, cost_price, subtotal, company_id)
        VALUES (v_internal_sale_id, v_item.product_id, v_item.quantity, v_cost_price, v_cost_price, v_cost_price * v_item.quantity, p_company_id);

        -- Add to Customer Sale (At Sale Price, MUST include cost_price for the auto journal trigger)
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, cost_price, subtotal, company_id)
        VALUES (v_customer_sale_id, v_item.product_id, v_item.quantity, v_item.sale_price, v_cost_price, v_item.sale_price * v_item.quantity, p_company_id);

        -- Deduct Inventory from Source Warehouse (Physical deduction)
        INSERT INTO inventory_transactions (company_id, product_id, warehouse_id, quantity, transaction_type, reference_type, reference_id, unit_cost, created_by)
        VALUES (p_company_id, v_item.product_id, p_source_warehouse_id, -v_item.quantity, 'sale', 'invoice', v_internal_sale_id, v_cost_price, p_user_id);
    END LOOP;

    -- Update Invoice Totals
    UPDATE invoices SET total_amount = v_total_cost WHERE id = v_internal_sale_id;
    UPDATE invoices SET total_amount = v_total_sale WHERE id = v_customer_sale_id;
    
    -- Now trigger the journal for the customer sale (Status change from draft -> posted/paid)
    UPDATE invoices SET status = CASE WHEN p_payment_type = 'cash' THEN 'paid' ELSE 'posted' END WHERE id = v_customer_sale_id;

    -- 6. Create Manual Journal Entries for the Inter-Branch Transfer
    IF v_total_cost > 0 THEN
        -- A. Transfer Out (Source Branch)
        INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
        VALUES (p_company_id, v_source_branch_id, CURRENT_DATE, 'cross_branch_transfer', v_internal_sale_id, 'نقل داخلي مباع لفرع آخر', 'posted', p_user_id)
        RETURNING id INTO v_je_out_id;
        
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, description)
        VALUES 
        (v_je_out_id, v_acc_interbranch, p_company_id, v_source_branch_id, v_total_cost, 0, 'استحقاق على فرع آخر'),
        (v_je_out_id, v_acc_inventory, p_company_id, v_source_branch_id, 0, v_total_cost, 'إخراج مخزون للفرع الآخر');
        
        -- B. Transfer In (Seller Branch)
        INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
        VALUES (p_company_id, p_seller_branch_id, CURRENT_DATE, 'cross_branch_transfer', v_internal_sale_id, 'استلام نقل داخلي مباع', 'posted', p_user_id)
        RETURNING id INTO v_je_in_id;
        
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, description)
        VALUES 
        (v_je_in_id, v_acc_inventory, p_company_id, p_seller_branch_id, v_total_cost, 0, 'إدخال مخزون من فرع آخر'),
        (v_je_in_id, v_acc_interbranch, p_company_id, p_seller_branch_id, 0, v_total_cost, 'التزام لفرع آخر');
    END IF;

    -- >>> CONTINUE-4C <<<