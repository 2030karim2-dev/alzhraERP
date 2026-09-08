-- ============================================================
-- Migration: 20260908000002_fix_auto_post_invoice_journal_party_scoping.sql
-- Description:
--   1. Fix fn_auto_post_invoice_journal to strictly scope party_id to AR (1100) and AP (2100).
--      Inventory (1200), Revenue (4100), COGS (5100), and Tax (2200) lines must NEVER have party_id.
--   2. Update vw_inventory_valuation to robustly fallback between cost_price, weighted_avg_cost, and purchase_price.
-- ============================================================

-- 1. fn_auto_post_invoice_journal
CREATE OR REPLACE FUNCTION public.fn_auto_post_invoice_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  -- Calculate COGS from invoice_items (if any exist at posting time)
  SELECT COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0)
  INTO v_total_cogs
  FROM public.invoice_items
  WHERE invoice_id = new.id;

  -- Net value after tax & discount
  v_net_amount := (new.total_amount - COALESCE(new.tax_amount, 0)) - COALESCE(new.discount_amount, 0);
  -- Amount actually receivable/payable - GROSS
  v_net_receivable := new.total_amount - COALESCE(new.discount_amount, 0);

  -- ⚡ Multi-currency normalization to Base SAR for debit_amount / credit_amount
  IF new.currency_code = 'SAR' OR new.currency_code IS NULL THEN
    v_base_net_amount     := v_net_amount;
    v_base_net_receivable := v_net_receivable;
    v_base_tax            := COALESCE(new.tax_amount, 0);
  ELSIF new.currency_code = 'YER' AND COALESCE(new.exchange_rate, 1) > 0 THEN
    v_base_net_amount     := ROUND(v_net_amount / new.exchange_rate, 4);
    v_base_net_receivable := ROUND(v_net_receivable / new.exchange_rate, 4);
    v_base_tax            := ROUND(COALESCE(new.tax_amount, 0) / new.exchange_rate, 4);
  ELSIF COALESCE(new.exchange_rate, 1) > 0 THEN
    v_base_net_amount     := ROUND(v_net_amount * new.exchange_rate, 4);
    v_base_net_receivable := ROUND(v_net_receivable * new.exchange_rate, 4);
    v_base_tax            := ROUND(COALESCE(new.tax_amount, 0) * new.exchange_rate, 4);
  ELSE
    v_base_net_amount     := v_net_amount;
    v_base_net_receivable := v_net_receivable;
    v_base_tax            := COALESCE(new.tax_amount, 0);
  END IF;

  -- ⚡ Resolve funding account
  IF new.payment_method IS NULL OR COALESCE(new.payment_method, 'credit') = 'credit' THEN
    v_acc_funding := NULL;
  ELSE
    v_acc_funding := COALESCE(new.payment_account_id, public.fn_get_default_cash_account(new.company_id, new.currency_code));
    IF v_acc_funding IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = v_acc_funding AND allow_posting = true AND is_active = true AND deleted_at IS NULL
    ) THEN
      v_acc_funding := public.fn_get_default_cash_account(new.company_id, new.currency_code);
    END IF;
  END IF;

  -- =========================================================================
  -- 1) SALES INVOICE (بيع)
  -- =========================================================================
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

    -- Dr Cash / AR (party_id strictly on AR account)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ar), new.company_id, new.branch_id, v_base_net_receivable, 0, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'مدينون - ' ELSE 'مقبوضات نقدية - ' end || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

    -- Cr Revenue (party_id must be NULL)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_revenue, new.company_id, new.branch_id, 0, v_base_net_amount, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'إيراد مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

    -- Cr Tax (party_id must be NULL)
    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, v_base_tax, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'ضريبة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    -- Auto COGS lines for perpetual inventory (party_id must be NULL)
    IF v_total_cogs > 0 AND v_acc_cogs IS NOT NULL AND v_acc_inventory IS NOT NULL THEN
      -- Dr COGS (5100)
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_cogs, new.company_id, new.branch_id, v_total_cogs, 0, NULL, 'SAR', 1,
              'تكلفة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

      -- Cr Inventory (1200)
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_total_cogs, NULL, 'SAR', 1,
              'صرف مخزون لمبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

  -- =========================================================================
  -- 2) SALES RETURN (مردود مبيعات)
  -- =========================================================================
  ELSIF new.type IN ('sale_return', 'return_sale') THEN
    IF v_acc_revenue IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب الإيرادات (4100) غير موجود للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'sales_return', new.id,
            'ترحيل تلقائي - مردود مبيعات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    -- Dr Sales Revenue (party_id must be NULL)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_revenue, new.company_id, new.branch_id, v_base_net_amount, 0, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'مردود مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

    -- Dr Tax (party_id must be NULL)
    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NOT NULL THEN
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
        VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, v_base_tax, 0, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
                'عكس ضريبة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
      END IF;
    END IF;

    -- Cr Cash / AR (party_id strictly on AR account)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ar), new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'تخفيض مدينون - ' ELSE 'رد نقدي - ' END || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

    -- Auto COGS reversal for sales return (party_id must be NULL)
    IF v_total_cogs > 0 AND v_acc_inventory IS NOT NULL AND v_acc_cogs IS NOT NULL THEN
      -- Dr Inventory (1200)
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_total_cogs, 0, NULL, 'SAR', 1,
              'إرجاع بضاعة لمخزون - ' || COALESCE(new.invoice_number, ''), NULL);

      -- Cr COGS (5100)
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_cogs, new.company_id, new.branch_id, 0, v_total_cogs, NULL, 'SAR', 1,
              'عكس تكلفة مبيعات لمرتجع - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

  -- =========================================================================
  -- 3) PURCHASE INVOICE (شراء)
  -- =========================================================================
  ELSIF new.type = 'purchase' THEN
    IF v_acc_ap IS NULL OR v_acc_inventory IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AP(2100)/المخزون(1200) غير موجودة للشركة %', new.company_id;
    END IF;

    IF v_acc_funding IS NULL THEN
      v_acc_funding := v_acc_ap;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'purchase_invoice', new.id,
            'ترحيل تلقائي - فاتورة شراء ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    -- Dr Inventory (party_id MUST be NULL)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_base_net_amount, 0, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'إضافة مخزون - ' || COALESCE(new.invoice_number, ''), NULL);

    -- Dr Tax (party_id MUST be NULL)
    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, v_base_tax, 0, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'ضريبة مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    -- Cr Cash / AP (party_id strictly on AP account)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_funding, new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding = v_acc_ap THEN 'دائنون - ' ELSE 'صرف نقدي - ' END || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding = v_acc_ap THEN new.party_id ELSE NULL END);

  -- =========================================================================
  -- 4) PURCHASE RETURN (مردود مشتريات)
  -- =========================================================================
  ELSIF new.type IN ('purchase_return', 'return_purchase') THEN
    IF v_acc_ap IS NULL OR v_acc_inventory IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حسابات AP(2100)/المخزون(1200) غير موجودة للشركة %', new.company_id;
    END IF;

    IF v_acc_funding IS NULL THEN
      v_acc_funding := v_acc_ap;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'purchase_return', new.id,
            'ترحيل تلقائي - مرتجع شراء ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    -- Dr Cash / AP (party_id strictly on AP account)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_funding, new.company_id, new.branch_id, v_base_net_receivable, 0, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1), 
            CASE WHEN v_acc_funding = v_acc_ap THEN 'تخفيض دائنون - ' ELSE 'استرداد نقدي - ' END || COALESCE(new.invoice_number, ''), 
            CASE WHEN v_acc_funding = v_acc_ap THEN new.party_id ELSE NULL END);

    -- Cr Inventory (party_id MUST be NULL)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_base_net_amount, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'تخفيض مخزون - ' || COALESCE(new.invoice_number, ''), NULL);

    -- Cr Tax (party_id MUST be NULL)
    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NOT NULL THEN
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
        VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, v_base_tax, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
                'عكس ضريبة مدخلات - ' || COALESCE(new.invoice_number, ''), NULL);
      END IF;
    END IF;
  END IF;

  IF v_je_id IS NOT NULL THEN
    UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;
  END IF;

  RETURN new;
END;
$function$;

-- 2. Update vw_inventory_valuation
CREATE OR REPLACE VIEW public.vw_inventory_valuation AS
 SELECT 
    p.id AS product_id,
    p.company_id,
    p.name_ar,
    p.part_number,
    COALESCE(NULLIF(p.cost_price, 0), NULLIF(p.purchase_price, 0), 0) AS cost_price,
    COALESCE(SUM(ps.quantity), 0::numeric) AS total_quantity,
    ROUND(COALESCE(SUM(ps.quantity * COALESCE(NULLIF(ps.weighted_avg_cost, 0), NULLIF(p.cost_price, 0), NULLIF(p.purchase_price, 0), 0)), 0), 2) AS total_value
 FROM products p
 LEFT JOIN product_stock ps ON p.id = ps.product_id
 WHERE p.deleted_at IS NULL
 GROUP BY p.id, p.company_id, p.name_ar, p.part_number, p.cost_price, p.purchase_price;

-- 3. Privileges
REVOKE EXECUTE ON FUNCTION public.fn_auto_post_invoice_journal() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_auto_post_invoice_journal() TO authenticated;
