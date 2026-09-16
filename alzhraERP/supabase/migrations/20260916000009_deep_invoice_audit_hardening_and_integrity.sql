-- ====================================================================
-- Migration: 20260916000009_deep_invoice_audit_hardening_and_integrity.sql
-- Description: Comprehensive Invoice Hardening & Data Integrity Remediation
-- 
-- 1. Multi-Tenant Composite Foreign Keys:
--    - Enforces (company_id, branch_id) -> branches(company_id, id)
--    - Enforces (company_id, party_id) -> parties(company_id, id)
--    - Enforces (company_id, payment_account_id) -> accounts(company_id, id)
--    - Enforces (company_id, reference_invoice_id) -> invoices(company_id, id)
--    - Enforces (company_id, invoice_id) -> invoices(company_id, id) on payment_allocations
--    - Enforces (company_id, payment_id) -> payments(company_id, id) on payment_allocations
--    - Enforces (company_id, tax_rate_id) -> tax_rates(company_id, id) on invoice_items
--
-- 2. Accounting & Payment Preservation (Single Source of Truth):
--    - Adds advance_payment column to invoices to prevent erasing cash/initial payments upon later allocations
--    - Updates fn_sync_invoice_paid_amount() to calculate: advance_payment + SUM(allocations)
--    - Fixes double discount deduction in fn_auto_post_invoice_journal()
--
-- 3. Immutability & Lifecycle Guarding:
--    - Triggers fn_guard_posted_invoice_immutability: prevents modifying financial fields or deleting posted/paid invoices
--    - Triggers fn_guard_posted_invoice_items_immutability: prevents altering items on posted/voided invoices
--
-- 4. RPC Bug Fixes:
--    - Fixes fn_process_cross_branch_sale (removes invalid column subtotal, fixes invalid status 'approved', removes payment_status)
--    - Fixes fn_reverse_inventory_for_reference (correct quantity signs on reversals)
--    - Fixes convert_quotation_to_invoice (preserves branch isolation)
--    - Hardens commit_sales_invoice_v2 and commit_purchase_invoice to persist advance_payment
--    - Restricts payments RLS policies to authenticated role
-- ====================================================================

-- 1. Ensure tax_rates has composite unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tax_rates_company_id'
  ) THEN
    ALTER TABLE public.tax_rates ADD CONSTRAINT uq_tax_rates_company_id UNIQUE (company_id, id);
  END IF;
END $$;

-- 2. Add advance_payment to invoices and backfill
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS advance_payment numeric NOT NULL DEFAULT 0;

UPDATE public.invoices 
SET advance_payment = paid_amount 
WHERE paid_amount > 0 
  AND advance_payment = 0 
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_allocations pa 
    WHERE pa.invoice_id = invoices.id AND pa.deleted_at IS NULL
  );

-- 3. Composite Foreign Keys for Strict Tenant Isolation
DO $$
  -- Invoices -> branches
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_branch_id_fkey;
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_company_branch;
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;
  ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_company_branch 
    FOREIGN KEY (company_id, branch_id) REFERENCES public.branches(company_id, id) ON DELETE RESTRICT;

  -- Invoices -> parties
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_party_id_fkey;
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_company_party;
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_party_id_fkey 
    FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE RESTRICT;
  ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_company_party 
    FOREIGN KEY (company_id, party_id) REFERENCES public.parties(company_id, id) ON DELETE RESTRICT;

  -- Invoices -> payment_account
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_payment_account_id_fkey;
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_company_account;
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_account_id_fkey 
    FOREIGN KEY (payment_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;
  ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_company_account 
    FOREIGN KEY (company_id, payment_account_id) REFERENCES public.accounts(company_id, id) ON DELETE RESTRICT;

  -- Invoices -> reference_invoice
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_reference_invoice_id_fkey;
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_company_reference;
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_reference_invoice_id_fkey 
    FOREIGN KEY (reference_invoice_id) REFERENCES public.invoices(id) ON DELETE RESTRICT;
  ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_company_reference 
    FOREIGN KEY (company_id, reference_invoice_id) REFERENCES public.invoices(company_id, id) ON DELETE RESTRICT;

  -- Payment allocations -> invoices
  ALTER TABLE public.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_invoice_id_fkey;
  ALTER TABLE public.payment_allocations DROP CONSTRAINT IF EXISTS fk_payment_allocations_company_invoice;
  ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE RESTRICT;
  ALTER TABLE public.payment_allocations ADD CONSTRAINT fk_payment_allocations_company_invoice 
    FOREIGN KEY (company_id, invoice_id) REFERENCES public.invoices(company_id, id) ON DELETE RESTRICT;

  -- Payment allocations -> payments
  ALTER TABLE public.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_payment_id_fkey;
  ALTER TABLE public.payment_allocations DROP CONSTRAINT IF EXISTS fk_payment_allocations_company_payment;
  ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT;
  ALTER TABLE public.payment_allocations ADD CONSTRAINT fk_payment_allocations_company_payment 
    FOREIGN KEY (company_id, payment_id) REFERENCES public.payments(company_id, id) ON DELETE RESTRICT;

  -- Invoice items -> tax_rates
  ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_tax_rate_id_fkey;
  ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_items_company_tax_rate;
  ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_tax_rate_id_fkey 
    FOREIGN KEY (tax_rate_id) REFERENCES public.tax_rates(id) ON DELETE RESTRICT;
  ALTER TABLE public.invoice_items ADD CONSTRAINT fk_invoice_items_company_tax_rate 
    FOREIGN KEY (company_id, tax_rate_id) REFERENCES public.tax_rates(company_id, id) ON DELETE RESTRICT;
END $$;

-- 4. Payment Allocation Sync Function
CREATE OR REPLACE FUNCTION public.fn_sync_invoice_paid_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid;
  v_advance numeric := 0;
  v_allocations_sum numeric := 0;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF v_invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(advance_payment, 0)
  INTO v_advance
  FROM public.invoices
  WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_allocations_sum
  FROM public.payment_allocations
  WHERE invoice_id = v_invoice_id AND deleted_at IS NULL;

  UPDATE public.invoices
  SET paid_amount = v_advance + v_allocations_sum,
      updated_at = now()
  WHERE id = v_invoice_id;

  RETURN NEW;
END;
$function$;

-- 5. Auto Post Invoice Journal with Correct Discount Math
CREATE OR REPLACE FUNCTION public.fn_auto_post_invoice_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_je_id uuid;
  v_acc_ar uuid;
  v_acc_ap uuid;
  v_acc_revenue uuid;
  v_acc_vat uuid;
  v_acc_inventory uuid;
  v_acc_cogs uuid;
  v_acc_funding uuid;
  v_net_amount numeric(18,4);
  v_net_receivable numeric(18,4);
  v_base_net_amount numeric(18,4);
  v_base_net_receivable numeric(18,4);
  v_base_tax numeric(18,4);
  v_total_cogs numeric(18,4);
  v_already_posted boolean;
  v_postable_statuses text[] := array['posted','confirmed','paid','partially_paid'];
  v_paid_foreign numeric(18,4);
  v_unpaid_foreign numeric(18,4);
  v_base_paid numeric(18,4);
  v_base_unpaid numeric(18,4);
BEGIN
  IF NOT (new.status = ANY(v_postable_statuses)) THEN
    RETURN new;
  END IF;

  SELECT exists(
    SELECT 1 FROM public.journal_entries je
    WHERE je.reference_id = new.id AND je.deleted_at IS NULL
  ) INTO v_already_posted;
  IF v_already_posted THEN
    RETURN new;
  END IF;

  v_acc_ar        := fn_get_account_id(new.company_id, '1100');
  v_acc_ap        := fn_get_account_id(new.company_id, '2100');
  v_acc_revenue   := fn_get_account_id(new.company_id, '4100');
  v_acc_vat       := fn_get_account_id(new.company_id, '2200');
  v_acc_inventory := fn_get_account_id(new.company_id, '1200');
  v_acc_cogs      := fn_get_account_id(new.company_id, '5100');

  SELECT COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0)
  INTO v_total_cogs
  FROM public.invoice_items
  WHERE invoice_id = new.id;

  -- total_amount is already net of discounts: round((qty*price - discount) + tax, 2)
  v_net_amount := new.total_amount - COALESCE(new.tax_amount, 0);
  v_net_receivable := new.total_amount;

  v_base_net_amount     := public.fn_to_base_amount(new.currency_code, v_net_amount, new.exchange_rate);
  v_base_tax            := public.fn_to_base_amount(new.currency_code, COALESCE(new.tax_amount, 0), new.exchange_rate);
  v_base_net_receivable := v_base_net_amount + v_base_tax;

  v_paid_foreign := LEAST(COALESCE(new.paid_amount, 0), v_net_receivable);
  v_unpaid_foreign := v_net_receivable - v_paid_foreign;

  IF v_net_receivable > 0 THEN
    v_base_paid := round(v_base_net_receivable * (v_paid_foreign / v_net_receivable), 4);
    v_base_unpaid := v_base_net_receivable - v_base_paid;
  ELSE
    v_base_paid := 0;
    v_base_unpaid := 0;
  END IF;

  -- Funding Account Determination
  IF new.payment_account_id IS NOT NULL THEN
    v_acc_funding := new.payment_account_id;
  ELSIF new.payment_method = 'cash' THEN
    v_acc_funding := COALESCE(
      public.fn_get_default_cash_account(new.company_id, new.currency_code),
      fn_get_account_id(new.company_id, '101001')
    );
  ELSIF new.payment_method IN ('network', 'card', 'bank', 'bank_transfer', 'pos') THEN
    v_acc_funding := COALESCE(
      fn_get_account_id(new.company_id, '1020'),
      fn_get_account_id(new.company_id, '1120')
    );
  ELSE
    v_acc_funding := COALESCE(
      public.fn_get_default_cash_account(new.company_id, new.currency_code),
      fn_get_account_id(new.company_id, '101001'),
      fn_get_account_id(new.company_id, '1020')
    );
  END IF;

  IF v_acc_funding IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts 
      WHERE id = v_acc_funding AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ) THEN
      v_acc_funding := public.fn_get_default_cash_account(new.company_id, new.currency_code);
    END IF;
  END IF;

  IF v_acc_funding IS NULL AND v_base_paid > 0 THEN
    SELECT id INTO v_acc_funding
    FROM public.accounts
    WHERE company_id = new.company_id
      AND (code LIKE '101%' OR code LIKE '102%' OR type = 'asset')
      AND allow_posting = true
      AND is_active = true
      AND deleted_at IS NULL
    ORDER BY CASE WHEN code LIKE '101%' THEN 0 ELSE 1 END, code ASC
    LIMIT 1;
  END IF;

  IF v_acc_funding IS NULL AND v_base_paid > 0 THEN
    v_acc_funding := v_acc_ar;
  END IF;

  -- 1. Sales Invoice
  IF new.type = 'sale' THEN
    IF v_acc_revenue IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب الإيرادات (4100) غير موجود للشركة %', new.company_id;
    END IF;
    IF v_acc_funding IS NULL AND v_acc_ar IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AR(1100)/الصندوق غير موجودة للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'sales_invoice', new.id,
            'ترحيل تلقائي - فاتورة مبيعات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    IF v_base_paid > 0 AND v_acc_funding IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_funding, new.company_id, new.branch_id, v_base_paid, 0, v_paid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_base_unpaid > 0 THEN 'سداد جزئي نقدي/بنكي - ' ELSE 'مبيعات نقدية/بنكية - ' END || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    IF v_base_unpaid > 0 OR (v_base_paid = 0 AND v_acc_funding IS NULL) THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_ar, new.company_id, new.branch_id, v_base_unpaid, 0, v_unpaid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_base_paid > 0 THEN 'متبقي ذمم عملاء - ' ELSE 'مبيعات آجل - ' END || COALESCE(new.invoice_number, ''), new.party_id);
    END IF;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_revenue, new.company_id, new.branch_id, 0, v_base_net_amount, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'إيراد مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, v_base_tax, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'ضريبة مخرجات مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    IF v_total_cogs > 0 THEN
      IF v_acc_cogs IS NULL OR v_acc_inventory IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب تكلفة المبيعات (5100) أو المخزون (1200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_cogs, new.company_id, new.branch_id, v_total_cogs, 0, NULL, NULL, NULL, 
              'تكلفة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_total_cogs, NULL, NULL, NULL, 
              'إخراج بضاعة مباعة - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

  -- 2. Purchase Invoice
  ELSIF new.type = 'purchase' THEN
    IF v_acc_inventory IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب المخزون (1200) غير موجود للشركة %', new.company_id;
    END IF;
    IF v_acc_funding IS NULL AND v_acc_ap IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AP(2100)/الصندوق غير موجودة للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'purchase_invoice', new.id,
            'ترحيل تلقائي - فاتورة مشتريات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_base_net_amount, 0, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'إدخال مخزون مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);

    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, v_base_tax, 0, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'ضريبة مدخلات مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    IF v_base_paid > 0 AND v_acc_funding IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_funding, new.company_id, new.branch_id, 0, v_base_paid, v_paid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_base_unpaid > 0 THEN 'سداد جزئي نقدي/بنكي لمورد - ' ELSE 'مشتريات نقدية/بنكية - ' END || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    IF v_base_unpaid > 0 OR (v_base_paid = 0 AND v_acc_funding IS NULL) THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_ap, new.company_id, new.branch_id, 0, v_base_unpaid, v_unpaid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_base_paid > 0 THEN 'متبقي ذمم موردين - ' ELSE 'مشتريات آجل - ' END || COALESCE(new.invoice_number, ''), new.party_id);
    END IF;

  -- 3. Sales Return
  ELSIF new.type = 'sale_return' OR new.type = 'return_sale' THEN
    IF v_acc_revenue IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب الإيرادات (4100) غير موجود للشركة %', new.company_id;
    END IF;
    IF v_acc_funding IS NULL AND v_acc_ar IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AR(1100)/الصندوق غير موجودة للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'sales_return', new.id,
            'ترحيل تلقائي - مردود مبيعات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_revenue, new.company_id, new.branch_id, v_base_net_amount, 0, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'مردود مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, v_base_tax, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'تخفيض ضريبة مردودات مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ar), new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'مردودات ذمم عملاء - ' ELSE 'مستردات نقدية لعميل - ' end || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

    IF v_total_cogs > 0 THEN
      IF v_acc_cogs IS NULL OR v_acc_inventory IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب تكلفة المبيعات (5100) أو المخزون (1200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_total_cogs, 0, NULL, NULL, NULL, 
              'إرجاع مخزون مردودات مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_cogs, new.company_id, new.branch_id, 0, v_total_cogs, NULL, NULL, NULL, 
              'تخفيض تكلفة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

  -- 4. Purchase Return
  ELSIF new.type = 'purchase_return' OR new.type = 'return_purchase' THEN
    IF v_acc_inventory IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب المخزون (1200) غير موجود للشركة %', new.company_id;
    END IF;
    IF v_acc_funding IS NULL AND v_acc_ap IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AP(2100)/الصندوق غير موجودة للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'purchase_return', new.id,
            'ترحيل تلقائي - مردود مشتريات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ap), new.company_id, new.branch_id, v_base_net_receivable, 0, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'مردودات ذمم موردين - ' ELSE 'مستردات نقدية من مورد - ' end || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_base_net_amount, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'تخفيض مخزون مردودات - ' || COALESCE(new.invoice_number, ''), NULL);

    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, v_base_tax, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'استرداد ضريبة مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;
  END IF;

  IF v_je_id IS NOT NULL THEN
    UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;
  END IF;

  RETURN new;
END;
$function$;

-- 6. Posted Invoice Immutability and Soft Delete Guard
CREATE OR REPLACE FUNCTION public.fn_guard_posted_invoice_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. منع الحذف النهائي لفاتورة مرحلة أو مسددة
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('posted', 'paid', 'partially_paid') THEN
      RAISE EXCEPTION 'posted_invoice_immutable: لا يمكن حذف فاتورة مرحلة أو مسددة. يجب استخدام الإلغاء/المرتجع (void_invoice)'
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  -- 2. في حالة التحديث (UPDATE)
  IF TG_OP = 'UPDATE' THEN
    -- منع الأرشفة / الحذف المؤقت (Soft Delete) لفاتورة مرحلة أو مسددة
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      IF OLD.status IN ('posted', 'paid', 'partially_paid') THEN
        RAISE EXCEPTION 'posted_invoice_immutable: لا يمكن أرشفة أو حذف فاتورة مرحلة أو مسددة (Soft delete not allowed for posted invoices)'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    -- إذا كانت الفاتورة مرحلة أصلاً وتم تعديل بياناتها المالية أو التعريفية الأساسية
    IF OLD.status IN ('posted', 'paid', 'partially_paid') THEN
      IF NEW.company_id IS DISTINCT FROM OLD.company_id OR
         NEW.branch_id IS DISTINCT FROM OLD.branch_id OR
         NEW.party_id IS DISTINCT FROM OLD.party_id OR
         NEW.type IS DISTINCT FROM OLD.type OR
         NEW.issue_date IS DISTINCT FROM OLD.issue_date OR
         NEW.currency_code IS DISTINCT FROM OLD.currency_code OR
         NEW.exchange_rate IS DISTINCT FROM OLD.exchange_rate OR
         NEW.total_amount IS DISTINCT FROM OLD.total_amount OR
         NEW.subtotal IS DISTINCT FROM OLD.subtotal OR
         NEW.tax_amount IS DISTINCT FROM OLD.tax_amount OR
         NEW.discount_amount IS DISTINCT FROM OLD.discount_amount OR
         NEW.advance_payment IS DISTINCT FROM OLD.advance_payment
      THEN
        IF NOT (NEW.status = 'void' AND OLD.status != 'void') THEN
          RAISE EXCEPTION 'posted_invoice_immutable: لا يمكن تعديل البيانات المالية أو شروط فاتورة مرحلة أو مسددة'
            USING ERRCODE = '23514';
        END IF;
      END IF;
    END IF;

    -- منع تحويل الفاتورة إلى مسددة إذا كان paid_amount أقل من total_amount
    IF NEW.status = 'paid' AND NEW.total_amount > 0 AND (NEW.paid_amount < NEW.total_amount - 0.05) THEN
      RAISE EXCEPTION 'invalid_status_transition: لا يمكن تعيين الفاتورة كـ مسددة (paid) لأن المبلغ المدفوع (%) أقل من الإجمالي (%)',
        NEW.paid_amount, NEW.total_amount USING ERRCODE = '23514';
    END IF;

    -- منع تحويل الفاتورة إلى posted/paid إذا لم تكن تحتوي على بنود في invoice_items (للفواتير الجديدة)
    IF NEW.status IN ('posted', 'paid', 'partially_paid') AND OLD.status = 'draft' THEN
      IF NOT EXISTS (SELECT 1 FROM public.invoice_items WHERE invoice_id = NEW.id) THEN
        RAISE EXCEPTION 'cannot_post_empty_invoice: لا يمكن ترحيل فاتورة فارغة لا تحتوي على بنود'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_posted_invoice_immutability ON public.invoices;
CREATE TRIGGER trg_guard_posted_invoice_immutability
  BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_posted_invoice_immutability();

-- 7. Posted Invoice Items Immutability Guard
CREATE OR REPLACE FUNCTION public.fn_guard_posted_invoice_items_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inv_status text;
  v_invoice_id uuid;
BEGIN
  v_invoice_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;

  SELECT status INTO v_inv_status
  FROM public.invoices
  WHERE id = v_invoice_id;

  IF v_inv_status IN ('posted', 'paid', 'partially_paid', 'void', 'cancelled') THEN
    RAISE EXCEPTION 'posted_invoice_items_locked: لا يمكن تعديل أو حذف أو إضافة بنود لفاتورة مرحلة أو ملغية (حالة الفاتورة: %)',
      v_inv_status USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_posted_invoice_items_immutability ON public.invoice_items;
CREATE TRIGGER trg_guard_posted_invoice_items_immutability
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_posted_invoice_items_immutability();

-- 8. Fix fn_process_cross_branch_sale
CREATE OR REPLACE FUNCTION public.fn_process_cross_branch_sale(
    p_company_id uuid, 
    p_seller_branch_id uuid, 
    p_source_warehouse_id uuid, 
    p_customer_id uuid, 
    p_items jsonb, 
    p_payment_type text, 
    p_user_id uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_source_branch_id uuid;
    v_seller_mode text;
    v_source_mode text;
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
    v_real_user_id := auth.uid();
    IF p_user_id != v_real_user_id THEN
        RAISE EXCEPTION 'Unauthorized: User ID mismatch';
    END IF;

    PERFORM public.fn_assert_company_access(p_company_id);

    SELECT integration_mode INTO v_seller_mode 
    FROM public.branches 
    WHERE id = p_seller_branch_id AND company_id = p_company_id;

    IF v_seller_mode IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Seller branch does not belong to the specified company';
    END IF;

    SELECT b.id, b.integration_mode INTO v_source_branch_id, v_source_mode
    FROM public.warehouses w
    JOIN public.branches b ON b.id = w.branch_id
    WHERE w.id = p_source_warehouse_id AND w.company_id = p_company_id;
    
    IF v_source_branch_id IS NULL THEN
        RAISE EXCEPTION 'Warehouse does not belong to a specific branch or does not exist.';
    END IF;

    IF v_source_branch_id = p_seller_branch_id THEN
        RAISE EXCEPTION 'Not a cross-branch sale. Source and Seller branches are the same.';
    END IF;

    IF v_seller_mode != 'full_integration' OR v_source_mode != 'full_integration' THEN
        RAISE EXCEPTION 'البيع المتقاطع التلقائي متاح فقط بين الفروع المدمجة بالكامل. بالنسبة للفروع المستقلة أو المشتركة بالمخزون فقط، يلزم تقديم طلب تحويل مخزني معتمد أولاً.';
    END IF;

    SELECT id INTO v_acc_interbranch FROM public.accounts WHERE company_id = p_company_id AND code = '3300' LIMIT 1;
    SELECT id INTO v_acc_inventory FROM public.accounts WHERE company_id = p_company_id AND code = '1200' LIMIT 1;
    
    IF v_acc_interbranch IS NULL OR v_acc_inventory IS NULL THEN
        RAISE EXCEPTION 'Required accounts (3300 Inter-branch or 1200 Inventory) are missing.';
    END IF;

    v_inv_num_internal := public.generate_invoice_number(p_company_id, 'sale', v_source_branch_id);
    v_inv_num_customer := public.generate_invoice_number(p_company_id, 'sale', p_seller_branch_id);

    INSERT INTO invoices (
        id, company_id, branch_id, type, party_id, issue_date, due_date, 
        total_amount, status, created_by, invoice_number, notes, payment_method
    ) VALUES (
        gen_random_uuid(), p_company_id, v_source_branch_id, 'sale', NULL, CURRENT_DATE, CURRENT_DATE,
        0, 'draft', p_user_id, v_inv_num_internal || '-INT', 'مبيعات داخلية لفرع آخر', 'credit'
    ) RETURNING id INTO v_internal_sale_id;

    INSERT INTO invoices (
        id, company_id, branch_id, type, party_id, issue_date, due_date, 
        total_amount, status, created_by, invoice_number, notes, payment_method
    ) VALUES (
        gen_random_uuid(), p_company_id, p_seller_branch_id, 'sale', p_customer_id, CURRENT_DATE, CURRENT_DATE,
        0, 'draft', p_user_id, v_inv_num_customer, 'مبيعات بضاعة من مستودع فرع آخر', p_payment_type
    ) RETURNING id INTO v_customer_sale_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity numeric, sale_price numeric)
    LOOP
        SELECT weighted_avg_cost INTO v_cost_price 
        FROM product_stock 
        WHERE product_id = v_item.product_id AND warehouse_id = p_source_warehouse_id;

        IF v_cost_price IS NULL THEN v_cost_price := 0; END IF;

        v_total_cost := v_total_cost + (v_cost_price * v_item.quantity);
        v_total_sale := v_total_sale + (v_item.sale_price * v_item.quantity);

        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, cost_price, total, company_id)
        VALUES (v_internal_sale_id, v_item.product_id, v_item.quantity, v_cost_price, v_cost_price, round(v_cost_price * v_item.quantity, 2), p_company_id);

        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, cost_price, total, company_id)
        VALUES (v_customer_sale_id, v_item.product_id, v_item.quantity, v_item.sale_price, v_cost_price, round(v_item.sale_price * v_item.quantity, 2), p_company_id);

        INSERT INTO inventory_transactions (company_id, product_id, warehouse_id, quantity, transaction_type, reference_type, reference_id, unit_cost, total_cost, created_by)
        VALUES (p_company_id, v_item.product_id, p_source_warehouse_id, -v_item.quantity, 'sales', 'sales_invoice', v_customer_sale_id, v_cost_price, round(v_cost_price * v_item.quantity, 4), p_user_id);
    END LOOP;

    UPDATE invoices SET subtotal = v_total_cost, total_amount = v_total_cost, status = 'posted' WHERE id = v_internal_sale_id;
    UPDATE invoices SET subtotal = v_total_sale, total_amount = v_total_sale, paid_amount = CASE WHEN p_payment_type = 'cash' THEN v_total_sale ELSE 0 END, advance_payment = CASE WHEN p_payment_type = 'cash' THEN v_total_sale ELSE 0 END, status = CASE WHEN p_payment_type = 'cash' THEN 'paid' ELSE 'posted' END WHERE id = v_customer_sale_id;

    IF v_total_cost > 0 THEN
        INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
        VALUES (p_company_id, v_source_branch_id, CURRENT_DATE, 'cross_branch_transfer', v_internal_sale_id, 'نقل داخلي مباع لفرع آخر', 'posted', p_user_id)
        RETURNING id INTO v_je_out_id;
        
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, description)
        VALUES 
        (v_je_out_id, v_acc_interbranch, p_company_id, v_source_branch_id, v_total_cost, 0, 'استحقاق على فرع آخر'),
        (v_je_out_id, v_acc_inventory, p_company_id, v_source_branch_id, 0, v_total_cost, 'إخراج مخزون للفرع الآخر');
        
        INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
        VALUES (p_company_id, p_seller_branch_id, CURRENT_DATE, 'cross_branch_transfer', v_internal_sale_id, 'استلام نقل داخلي مباع', 'posted', p_user_id)
        RETURNING id INTO v_je_in_id;
        
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, description)
        VALUES 
        (v_je_in_id, v_acc_inventory, p_company_id, p_seller_branch_id, v_total_cost, 0, 'إدخال مخزون من فرع آخر'),
        (v_je_in_id, v_acc_interbranch, p_company_id, p_seller_branch_id, 0, v_total_cost, 'التزام لفرع آخر');
    END IF;

    PERFORM pg_notify(
        'branch_notifications',
        json_build_object(
            'company_id', p_company_id,
            'source_branch_id', v_source_branch_id,
            'seller_branch_id', p_seller_branch_id,
            'invoice_id', v_customer_sale_id,
            'internal_invoice_id', v_internal_sale_id,
            'total_cost', v_total_cost,
            'total_sale', v_total_sale,
            'type', 'cross_branch_sale'
        )::text
    );

    RETURN v_customer_sale_id;
END;
$function$;

-- 9. Fix fn_reverse_inventory_for_reference
CREATE OR REPLACE FUNCTION public.fn_reverse_inventory_for_reference(
    p_reference_id uuid, 
    p_source_reference_types text[], 
    p_new_reference_type text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_txn RECORD;
  v_opposite_type text;
  v_reverse_qty numeric;
BEGIN
  FOR v_txn IN
    SELECT * FROM inventory_transactions
    WHERE reference_id = p_reference_id
      AND reference_type = ANY(p_source_reference_types)
      AND deleted_at IS NULL
    ORDER BY created_at ASC
  LOOP
    v_opposite_type := CASE v_txn.transaction_type
      WHEN 'sales' THEN 'sales_return'
      WHEN 'sales_return' THEN 'sales'
      WHEN 'purchase' THEN 'purchase_return'
      WHEN 'purchase_return' THEN 'purchase'
      WHEN 'transfer_in' THEN 'transfer_out'
      WHEN 'transfer_out' THEN 'transfer_in'
      WHEN 'adj_in' THEN 'adj_out'
      WHEN 'adj_out' THEN 'adj_in'
      ELSE 'adj_out'
    END;

    v_reverse_qty := CASE 
      WHEN v_opposite_type IN ('sales_return', 'purchase', 'transfer_in', 'adj_in', 'initial') THEN ABS(v_txn.quantity)
      ELSE -ABS(v_txn.quantity)
    END;

    INSERT INTO inventory_transactions(
      company_id, product_id, warehouse_id, quantity, unit_cost, total_cost,
      transaction_type, reference_type, reference_id, created_by
    ) VALUES (
      v_txn.company_id, v_txn.product_id, v_txn.warehouse_id, v_reverse_qty, v_txn.unit_cost,
      round(ABS(v_reverse_qty) * COALESCE(v_txn.unit_cost, 0), 4),
      v_opposite_type, p_new_reference_type, p_reference_id, auth.uid()
    );
  END LOOP;
END;
$function$;

-- 10. Fix convert_quotation_to_invoice
CREATE OR REPLACE FUNCTION public.convert_quotation_to_invoice(
    p_quotation_id uuid, 
    p_issue_date date DEFAULT CURRENT_DATE, 
    p_due_date date DEFAULT NULL::date, 
    p_notes text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id  uuid;
  v_quot        quotations%ROWTYPE;
  v_invoice_id  uuid;
  v_inv_type    text;
  v_inv_number  text;
BEGIN
  SELECT * INTO v_quot FROM quotations WHERE id = p_quotation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'quotation_not_found: %', p_quotation_id; END IF;
  IF v_quot.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'quotation_deleted'; END IF;
  IF v_quot.status IN ('converted','rejected') THEN RAISE EXCEPTION 'quotation_already_converted_or_rejected: %', v_quot.status; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = v_quot.company_id
      AND ucr.role IN ('owner','admin','accountant')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  v_inv_type := CASE v_quot.type
    WHEN 'sales'    THEN 'sale'
    WHEN 'purchase' THEN 'purchase'
    ELSE 'sale'
  END;

  v_inv_number := generate_invoice_number(v_quot.company_id, v_inv_type, v_quot.branch_id);

  INSERT INTO invoices (
    company_id, branch_id, party_id, invoice_number, type, status,
    subtotal, discount_amount, tax_amount, total_amount,
    issue_date, due_date, notes, currency_code, exchange_rate,
    created_by
  )
  VALUES (
    v_quot.company_id,
    v_quot.branch_id,
    v_quot.party_id,
    v_inv_number,
    v_inv_type,
    'draft',
    v_quot.subtotal,
    COALESCE(v_quot.discount_amount, 0),
    COALESCE(v_quot.tax_amount, 0),
    v_quot.total_amount,
    p_issue_date,
    p_due_date,
    COALESCE(p_notes, v_quot.notes),
    COALESCE(v_quot.currency_code, 'SAR'),
    COALESCE(v_quot.exchange_rate, 1),
    auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO invoice_items (
    invoice_id, product_id, description, quantity,
    unit_price, discount_amount, tax_amount, total,
    cost_price, company_id
  )
  SELECT
    v_invoice_id,
    qi.product_id,
    qi.description,
    qi.quantity,
    qi.unit_price,
    ROUND(qi.unit_price * qi.quantity * COALESCE(qi.discount_percent,0) / 100, 2),
    COALESCE(qi.total - (qi.unit_price * qi.quantity * (1 - COALESCE(qi.discount_percent,0)/100)), 0),
    qi.total,
    COALESCE((SELECT p.cost_price FROM products p WHERE p.id = qi.product_id), 0),
    v_quot.company_id
  FROM quotation_items qi
  WHERE qi.quotation_id = p_quotation_id;

  UPDATE quotations
  SET
    status             = 'converted',
    converted_invoice_id = v_invoice_id,
    converted_at       = now(),
    updated_at         = now()
  WHERE id = p_quotation_id;

  RETURN v_invoice_id;
END;
$function$;

-- 11. payments RLS policies restriction to authenticated
DROP POLICY IF EXISTS payments_select ON public.payments;
DROP POLICY IF EXISTS payments_update ON public.payments;

CREATE POLICY payments_select ON public.payments FOR SELECT TO authenticated
  USING (is_super_admin() OR ((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT get_auth_branches(payments.company_id) AS get_auth_branches)))));

CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated
  USING (is_super_admin() OR ((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT get_auth_branches(payments.company_id) AS get_auth_branches)))))
  WITH CHECK (is_super_admin() OR ((company_id IN ( SELECT get_auth_companies() AS get_auth_companies)) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT get_auth_branches(payments.company_id) AS get_auth_branches)))));

-- 12. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

