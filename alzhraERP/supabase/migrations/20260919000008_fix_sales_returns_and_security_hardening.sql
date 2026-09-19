-- =============================================================
-- Migration: 20260919000008_fix_sales_returns_and_security_hardening
-- Date: 2026-09-19
-- Fixes:
--   BUG-01: credit sale_return journal posts to cash instead of AR (1100)
--   BUG-03: 1710 fully-paid cash invoices stuck in 'posted' status
--   BUG-07: 0.02 rounding diff in purchase invoice total_amount
--   BUG-09: duplicate UNIQUE constraint on product_stock
--   BUG-10: 16 zero-amount posted sale invoices with no GL entries
--   SEC-01: revoke direct SELECT on sensitive views from authenticated role
-- =============================================================

-- =============================================================
-- BUG-01: Fix fn_auto_post_invoice_journal
-- Root cause: when payment_method='credit', the ELSE clause used to
-- fall through and populate v_acc_funding from a cash account lookup,
-- causing credit sale-returns to credit the cash box instead of AR.
-- Fix: set v_acc_funding = NULL for credit sale_returns after the
-- funding-resolution block, before building the journal lines.
-- =============================================================
CREATE OR REPLACE FUNCTION public.fn_auto_post_invoice_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF NOT (new.status = ANY(v_postable_statuses)) THEN RETURN new; END IF;

  SELECT exists(SELECT 1 FROM public.journal_entries je
    WHERE je.reference_id = new.id AND je.deleted_at IS NULL)
  INTO v_already_posted;
  IF v_already_posted THEN RETURN new; END IF;

  v_acc_ar        := fn_get_account_id(new.company_id, '1100');
  v_acc_ap        := fn_get_account_id(new.company_id, '2100');
  v_acc_revenue   := fn_get_account_id(new.company_id, '4100');
  v_acc_vat       := fn_get_account_id(new.company_id, '2200');
  v_acc_inventory := fn_get_account_id(new.company_id, '1200');
  v_acc_cogs      := fn_get_account_id(new.company_id, '5100');

  SELECT COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0)
  INTO v_total_cogs FROM public.invoice_items WHERE invoice_id = new.id;

  v_net_amount     := (new.total_amount - COALESCE(new.tax_amount, 0)) - COALESCE(new.discount_amount, 0);
  v_net_receivable := new.total_amount - COALESCE(new.discount_amount, 0);
  v_base_net_amount     := public.fn_to_base_amount(new.currency_code, v_net_amount, new.exchange_rate);
  v_base_tax            := public.fn_to_base_amount(new.currency_code, COALESCE(new.tax_amount, 0), new.exchange_rate);
  v_base_net_receivable := v_base_net_amount + v_base_tax;

  IF new.payment_method = 'cash' AND (new.paid_amount IS NULL OR new.paid_amount = 0) THEN
    v_paid_foreign := v_net_receivable;
  ELSE
    v_paid_foreign := LEAST(COALESCE(new.paid_amount, 0), v_net_receivable);
  END IF;
  v_unpaid_foreign := v_net_receivable - v_paid_foreign;

  IF v_net_receivable > 0 THEN
    v_base_paid   := round(v_base_net_receivable * (v_paid_foreign / v_net_receivable), 4);
    v_base_unpaid := v_base_net_receivable - v_base_paid;
  ELSE
    v_base_paid := 0; v_base_unpaid := 0;
  END IF;

  -- Determine funding account (cash/bank)
  IF new.payment_account_id IS NOT NULL THEN
    v_acc_funding := new.payment_account_id;
  ELSIF new.payment_method = 'cash' THEN
    v_acc_funding := COALESCE(
      public.fn_get_default_cash_account(new.company_id, new.currency_code),
      fn_get_account_id(new.company_id, '1010-01'),
      fn_get_account_id(new.company_id, '101001')
    );
  ELSIF new.payment_method IN ('network','card','bank','bank_transfer','pos') THEN
    v_acc_funding := COALESCE(
      fn_get_account_id(new.company_id, '1020'),
      fn_get_account_id(new.company_id, '1120')
    );
  ELSE
    -- credit / deferred: no immediate cash outflow
    v_acc_funding := NULL;
  END IF;

  -- Validate funding account allows posting
  IF v_acc_funding IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = v_acc_funding AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ) THEN
      v_acc_funding := public.fn_get_default_cash_account(new.company_id, new.currency_code);
    END IF;
  END IF;

  -- Fallback for immediate-payment types only
  IF v_acc_funding IS NULL AND v_base_paid > 0
     AND new.payment_method IN ('cash','network','card','bank','bank_transfer','pos') THEN
    SELECT id INTO v_acc_funding FROM public.accounts
    WHERE company_id = new.company_id
      AND (code LIKE '101%' OR code LIKE '102%' OR type = 'asset')
      AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ORDER BY CASE WHEN code LIKE '101%' THEN 0 ELSE 1 END, code ASC LIMIT 1;
  END IF;

  -- Last resort for cash types only
  IF v_acc_funding IS NULL AND v_base_paid > 0
     AND new.payment_method IN ('cash','network','card','bank','bank_transfer','pos') THEN
    v_acc_funding := v_acc_ar;
  END IF;

  -- ============================================================
  -- BUG-01 FIX: credit sale returns must credit AR, not cash
  -- ============================================================
  IF new.type IN ('sale_return','return_sale') AND new.payment_method = 'credit' THEN
    v_acc_funding := NULL;
  END IF;

  -- ============================================================
  -- 1. Sale invoice
  -- ============================================================
  IF new.type = 'sale' THEN
    IF v_acc_revenue IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: revenue 4100 missing for company %', new.company_id;
    END IF;
    IF v_acc_funding IS NULL AND v_acc_ar IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: AR 1100 and cash both missing for company %', new.company_id;
    END IF;

    INSERT INTO journal_entries(company_id,branch_id,entry_date,reference_type,reference_id,description,status,created_by)
    VALUES(new.company_id,new.branch_id,new.issue_date,'sales_invoice',new.id,
           'ترحيل تلقائي - فاتورة مبيعات '||COALESCE(new.invoice_number,''),'draft',new.created_by)
    RETURNING id INTO v_je_id;

    IF v_base_paid > 0 AND v_acc_funding IS NOT NULL THEN
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_funding,new.company_id,new.branch_id,v_base_paid,0,v_paid_foreign,new.currency_code,COALESCE(new.exchange_rate,1),
             CASE WHEN v_base_unpaid>0 THEN 'سداد جزئي نقدي/بنكي - ' ELSE 'مبيعات نقدية/بنكية - ' END||COALESCE(new.invoice_number,''),NULL);
    END IF;
    IF v_base_unpaid > 0 OR (v_base_paid = 0 AND v_acc_funding IS NULL) THEN
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_ar,new.company_id,new.branch_id,v_base_unpaid,0,v_unpaid_foreign,new.currency_code,COALESCE(new.exchange_rate,1),
             CASE WHEN v_base_paid>0 THEN 'متبقي ذمم عملاء - ' ELSE 'مبيعات آجل - ' END||COALESCE(new.invoice_number,''),new.party_id);
    END IF;
    INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
    VALUES(v_je_id,v_acc_revenue,new.company_id,new.branch_id,0,v_base_net_amount,v_net_amount,new.currency_code,COALESCE(new.exchange_rate,1),
           'إيراد مبيعات - '||COALESCE(new.invoice_number,''),NULL);
    IF COALESCE(new.tax_amount,0) <> 0 THEN
      IF v_acc_vat IS NULL THEN RAISE EXCEPTION 'auto_post_failed: VAT 2200 missing for company %', new.company_id; END IF;
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_vat,new.company_id,new.branch_id,0,v_base_tax,new.tax_amount,new.currency_code,COALESCE(new.exchange_rate,1),
             'ضريبة مخرجات مبيعات - '||COALESCE(new.invoice_number,''),NULL);
    END IF;
    IF v_total_cogs > 0 THEN
      IF v_acc_cogs IS NULL OR v_acc_inventory IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: COGS 5100 or inventory 1200 missing for company %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_cogs,new.company_id,new.branch_id,v_total_cogs,0,NULL,NULL,NULL,'تكلفة مبيعات - '||COALESCE(new.invoice_number,''),NULL);
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_inventory,new.company_id,new.branch_id,0,v_total_cogs,NULL,NULL,NULL,'إخراج بضاعة مباعة - '||COALESCE(new.invoice_number,''),NULL);
    END IF;

  -- ============================================================
  -- 2. Purchase invoice
  -- ============================================================
  ELSIF new.type = 'purchase' THEN
    IF v_acc_inventory IS NULL THEN RAISE EXCEPTION 'auto_post_failed: inventory 1200 missing for company %', new.company_id; END IF;
    IF v_acc_funding IS NULL AND v_acc_ap IS NULL THEN RAISE EXCEPTION 'auto_post_failed: AP 2100 and cash both missing for company %', new.company_id; END IF;

    INSERT INTO journal_entries(company_id,branch_id,entry_date,reference_type,reference_id,description,status,created_by)
    VALUES(new.company_id,new.branch_id,new.issue_date,'purchase_invoice',new.id,
           'ترحيل تلقائي - فاتورة مشتريات '||COALESCE(new.invoice_number,''),'draft',new.created_by)
    RETURNING id INTO v_je_id;

    INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
    VALUES(v_je_id,v_acc_inventory,new.company_id,new.branch_id,v_base_net_amount,0,v_net_amount,new.currency_code,COALESCE(new.exchange_rate,1),
           'إدخال مخزون مشتريات - '||COALESCE(new.invoice_number,''),NULL);
    IF COALESCE(new.tax_amount,0) <> 0 THEN
      IF v_acc_vat IS NULL THEN RAISE EXCEPTION 'auto_post_failed: VAT 2200 missing for company %', new.company_id; END IF;
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_vat,new.company_id,new.branch_id,v_base_tax,0,new.tax_amount,new.currency_code,COALESCE(new.exchange_rate,1),
             'ضريبة مدخلات مشتريات - '||COALESCE(new.invoice_number,''),NULL);
    END IF;
    IF v_base_paid > 0 AND v_acc_funding IS NOT NULL THEN
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_funding,new.company_id,new.branch_id,0,v_base_paid,v_paid_foreign,new.currency_code,COALESCE(new.exchange_rate,1),
             CASE WHEN v_base_unpaid>0 THEN 'سداد جزئي نقدي/بنكي لمورد - ' ELSE 'مشتريات نقدية/بنكية - ' END||COALESCE(new.invoice_number,''),NULL);
    END IF;
    IF v_base_unpaid > 0 OR (v_base_paid = 0 AND v_acc_funding IS NULL) THEN
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_ap,new.company_id,new.branch_id,0,v_base_unpaid,v_unpaid_foreign,new.currency_code,COALESCE(new.exchange_rate,1),
             CASE WHEN v_base_paid>0 THEN 'متبقي ذمم موردين - ' ELSE 'مشتريات آجل - ' END||COALESCE(new.invoice_number,''),new.party_id);
    END IF;

  -- ============================================================
  -- 3. Sale return [BUG-01 FIXED]
  --    credit return: v_acc_funding=NULL → COALESCE → AR (correct)
  --    cash return:   v_acc_funding=cash → cash exits to customer (correct)
  -- ============================================================
  ELSIF new.type IN ('sale_return','return_sale') THEN
    IF v_acc_revenue IS NULL THEN RAISE EXCEPTION 'auto_post_failed: revenue 4100 missing for company %', new.company_id; END IF;
    IF v_acc_funding IS NULL AND v_acc_ar IS NULL THEN RAISE EXCEPTION 'auto_post_failed: AR 1100 and cash both missing for company %', new.company_id; END IF;

    INSERT INTO journal_entries(company_id,branch_id,entry_date,reference_type,reference_id,description,status,created_by)
    VALUES(new.company_id,new.branch_id,new.issue_date,'sales_return',new.id,
           'ترحيل تلقائي - مردود مبيعات '||COALESCE(new.invoice_number,''),'draft',new.created_by)
    RETURNING id INTO v_je_id;

    -- Debit revenue (reversal)
    INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
    VALUES(v_je_id,v_acc_revenue,new.company_id,new.branch_id,v_base_net_amount,0,v_net_amount,new.currency_code,COALESCE(new.exchange_rate,1),
           'مردود مبيعات - '||COALESCE(new.invoice_number,''),NULL);
    IF COALESCE(new.tax_amount,0) <> 0 THEN
      IF v_acc_vat IS NULL THEN RAISE EXCEPTION 'auto_post_failed: VAT 2200 missing for company %', new.company_id; END IF;
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_vat,new.company_id,new.branch_id,v_base_tax,0,new.tax_amount,new.currency_code,COALESCE(new.exchange_rate,1),
             'تخفيض ضريبة مردودات - '||COALESCE(new.invoice_number,''),NULL);
    END IF;
    -- Credit AR (deferred) or cash (refund)
    INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
    VALUES(
      v_je_id, COALESCE(v_acc_funding, v_acc_ar),
      new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable,
      new.currency_code, COALESCE(new.exchange_rate,1),
      CASE WHEN v_acc_funding IS NULL THEN 'مردودات تخفض ذمم عملاء - ' ELSE 'مستردات نقدية لعميل - ' END||COALESCE(new.invoice_number,''),
      CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END
    );
    -- Return inventory
    IF v_total_cogs > 0 THEN
      IF v_acc_cogs IS NULL OR v_acc_inventory IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: COGS/inventory missing for company %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_inventory,new.company_id,new.branch_id,v_total_cogs,0,NULL,NULL,NULL,'إرجاع مخزون مردودات مبيعات - '||COALESCE(new.invoice_number,''),NULL);
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_cogs,new.company_id,new.branch_id,0,v_total_cogs,NULL,NULL,NULL,'تخفيض تكلفة مبيعات - '||COALESCE(new.invoice_number,''),NULL);
    END IF;

  -- ============================================================
  -- 4. Purchase return
  -- ============================================================
  ELSIF new.type IN ('purchase_return','return_purchase') THEN
    IF v_acc_inventory IS NULL THEN RAISE EXCEPTION 'auto_post_failed: inventory 1200 missing for company %', new.company_id; END IF;
    IF v_acc_funding IS NULL AND v_acc_ap IS NULL THEN RAISE EXCEPTION 'auto_post_failed: AP/cash missing for company %', new.company_id; END IF;

    INSERT INTO journal_entries(company_id,branch_id,entry_date,reference_type,reference_id,description,status,created_by)
    VALUES(new.company_id,new.branch_id,new.issue_date,'purchase_return',new.id,
           'ترحيل تلقائي - مردود مشتريات '||COALESCE(new.invoice_number,''),'draft',new.created_by)
    RETURNING id INTO v_je_id;

    INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
    VALUES(v_je_id,COALESCE(v_acc_funding,v_acc_ap),new.company_id,new.branch_id,v_base_net_receivable,0,v_net_receivable,new.currency_code,COALESCE(new.exchange_rate,1),
           CASE WHEN v_acc_funding IS NULL THEN 'مردودات ذمم موردين - ' ELSE 'مستردات نقدية من مورد - ' END||COALESCE(new.invoice_number,''),
           CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);
    INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
    VALUES(v_je_id,v_acc_inventory,new.company_id,new.branch_id,0,v_base_net_amount,v_net_amount,new.currency_code,COALESCE(new.exchange_rate,1),
           'تخفيض مخزون مردودات - '||COALESCE(new.invoice_number,''),NULL);
    IF COALESCE(new.tax_amount,0) <> 0 THEN
      IF v_acc_vat IS NULL THEN RAISE EXCEPTION 'auto_post_failed: VAT 2200 missing for company %', new.company_id; END IF;
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,company_id,branch_id,debit_amount,credit_amount,foreign_amount,currency_code,exchange_rate,description,party_id)
      VALUES(v_je_id,v_acc_vat,new.company_id,new.branch_id,0,v_base_tax,new.tax_amount,new.currency_code,COALESCE(new.exchange_rate,1),
             'استرداد ضريبة مشتريات - '||COALESCE(new.invoice_number,''),NULL);
    END IF;
  END IF;

  IF v_je_id IS NOT NULL THEN
    UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;
  END IF;

  RETURN new;
END;
$$;

-- =============================================================
-- BUG-03: Fix posted→paid for fully-paid invoices
-- =============================================================
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.invoices
  WHERE type IN ('sale','purchase') AND status='posted' AND deleted_at IS NULL
    AND total_amount > 0 AND paid_amount >= (total_amount - 0.005);
  RAISE NOTICE 'BUG-03 preflight: % invoices will be updated posted to paid', v_count;
END $$;

UPDATE public.invoices
SET status = 'paid', updated_at = NOW()
WHERE type IN ('sale','purchase')
  AND status = 'posted'
  AND deleted_at IS NULL
  AND total_amount > 0
  AND paid_amount >= (total_amount - 0.005);

-- =============================================================
-- BUG-07: Fix rounding diffs in purchase invoices (safe: max 0.05)
-- =============================================================
UPDATE public.invoices
SET total_amount = ROUND(
      COALESCE(subtotal,0) + COALESCE(tax_amount,0) - COALESCE(discount_amount,0), 2),
    updated_at = NOW()
WHERE type = 'purchase'
  AND status IN ('posted','paid')
  AND deleted_at IS NULL
  AND subtotal IS NOT NULL
  AND ABS(total_amount - (COALESCE(subtotal,0) + COALESCE(tax_amount,0) - COALESCE(discount_amount,0)))
      BETWEEN 0.001 AND 0.05;

-- =============================================================
-- BUG-09: Drop duplicate UNIQUE constraint on product_stock
-- =============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_product_stock_warehouse'
      AND conrelid = 'public.product_stock'::regclass
  ) THEN
    ALTER TABLE public.product_stock DROP CONSTRAINT uq_product_stock_warehouse;
    RAISE NOTICE 'BUG-09: dropped duplicate UNIQUE constraint uq_product_stock_warehouse';
  ELSE
    RAISE NOTICE 'BUG-09: constraint uq_product_stock_warehouse not found, skipping';
  END IF;
END $$;

-- =============================================================
-- BUG-10: Void zero-amount posted sale invoices with no GL entries
-- =============================================================
UPDATE public.invoices
SET status = 'void', updated_at = NOW()
WHERE type = 'sale'
  AND status = 'posted'
  AND deleted_at IS NULL
  AND total_amount = 0
  AND COALESCE(subtotal, 0) = 0
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.reference_id = invoices.id AND je.deleted_at IS NULL
  );

-- =============================================================
-- SEC-01: Revoke direct REST access on sensitive views
-- party_balances_by_currency: must be accessed only via
-- get_party_currencies_by_company() RPC (tenant-isolated)
-- Admin security views: must not be accessible to app users
-- =============================================================
REVOKE SELECT ON public.party_balances_by_currency FROM authenticated;
REVOKE SELECT ON public.party_balances FROM authenticated;
REVOKE SELECT ON public.v_api_v1_missing_tenant_guard FROM authenticated;
REVOKE SELECT ON public.v_csp_violations_recent FROM authenticated;
REVOKE SELECT ON public.v_functions_public_execute FROM authenticated;
REVOKE SELECT ON public.v_rpcs_missing_audit FROM authenticated;
REVOKE SELECT ON public.v_security_alerts_unresolved FROM authenticated;
REVOKE SELECT ON public.v_security_definer_no_search_path FROM authenticated;
REVOKE SELECT ON public.v_storage_policies_by_bucket FROM authenticated;
REVOKE SELECT ON public.v_tables_without_rls FROM authenticated;

-- =============================================================
-- Post-migration verification (logged as NOTICE)
-- =============================================================
DO $$
DECLARE
  v_still_posted integer;
  v_still_zero   integer;
  v_has_dup      boolean;
BEGIN
  SELECT count(*) INTO v_still_posted FROM public.invoices
  WHERE type IN ('sale','purchase') AND status='posted' AND deleted_at IS NULL
    AND total_amount > 0 AND paid_amount >= (total_amount - 0.005);
  RAISE NOTICE 'VERIFY BUG-03: remaining posted+fully-paid = % (expect 0)', v_still_posted;

  SELECT count(*) INTO v_still_zero FROM public.invoices
  WHERE type='sale' AND status='posted' AND deleted_at IS NULL
    AND total_amount=0 AND COALESCE(subtotal,0)=0;
  RAISE NOTICE 'VERIFY BUG-10: remaining zero-amount posted = % (expect 0)', v_still_zero;

  SELECT EXISTS(
    SELECT 1 FROM pg_constraint
    WHERE conname='uq_product_stock_warehouse'
      AND conrelid='public.product_stock'::regclass
  ) INTO v_has_dup;
  RAISE NOTICE 'VERIFY BUG-09: duplicate constraint still exists = % (expect false)', v_has_dup;
END $$;
