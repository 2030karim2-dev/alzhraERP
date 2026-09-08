-- ==============================================================================
-- Migration: 20260908000008_fix_multicurrency_normalization_and_yer_scaling.sql
-- Description:
--   1. Fix multi-currency conversion in fn_auto_post_invoice_journal:
--      Support both rate_to_base (< 1, e.g. 0.002439) and units_per_base (>= 1, e.g. 410)
--      preventing multi-million SAR inflation on foreign currency transactions.
--   2. Update get_sales_chart_data with the same dual-rate normalization.
--   3. Correct journal entry line amounts for invoice INV-20260908-0005.
-- ==============================================================================

-- 1. Correct journal entry lines for INV-20260908-0005 if inflated
DO $$
DECLARE
  v_je_id uuid;
BEGIN
  SELECT id INTO v_je_id 
  FROM public.journal_entries 
  WHERE reference_id = '4decf10a-8f7f-4bfd-874e-ddf606b31c09' LIMIT 1;

  IF v_je_id IS NOT NULL THEN
    UPDATE public.journal_entry_lines
    SET debit_amount = 129.27
    WHERE journal_entry_id = v_je_id AND debit_amount > 1000000;

    UPDATE public.journal_entry_lines
    SET credit_amount = 129.27
    WHERE journal_entry_id = v_je_id AND credit_amount > 1000000;
  END IF;
END $$;

-- 2. Update get_sales_chart_data
CREATE OR REPLACE FUNCTION public.get_sales_chart_data(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date
)
RETURNS TABLE(name text, date date, value numeric, sales numeric, purchases numeric, expenses numeric, profit numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_from date := COALESCE(p_date_from, (CURRENT_DATE - INTERVAL '30 days'));
    v_to date := COALESCE(p_date_to, CURRENT_DATE);
    v_day date;
    v_sales numeric;
    v_purchases numeric;
    v_expenses numeric;
BEGIN
    v_day := v_from;
    WHILE v_day <= v_to LOOP
        name := to_char(v_day, 'YYYY-MM-DD');
        date := v_day;

        -- Daily net sales / net purchases accurately normalized to base currency (SAR)
        SELECT
            COALESCE(SUM(CASE
                WHEN i.type = 'sale' THEN i.amount
                WHEN i.type = 'sale_return' THEN -i.amount
                ELSE 0 END), 0),
            COALESCE(SUM(CASE
                WHEN i.type = 'purchase' THEN i.amount
                WHEN i.type = 'purchase_return' THEN -i.amount
                ELSE 0 END), 0)
        INTO v_sales, v_purchases
        FROM (
            SELECT
                i.type,
                CASE
                    WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL THEN i.total_amount
                    WHEN COALESCE(i.exchange_rate, 1) > 0 AND i.exchange_rate < 1
                        THEN ROUND(i.total_amount * i.exchange_rate, 4)
                    WHEN i.currency_code = 'YER' AND COALESCE(i.exchange_rate, 1) >= 1
                        THEN ROUND(i.total_amount / i.exchange_rate, 4)
                    WHEN COALESCE(i.exchange_rate, 1) >= 1
                        THEN ROUND(i.total_amount * i.exchange_rate, 4)
                    ELSE i.total_amount
                END AS amount
            FROM public.invoices i
            WHERE i.company_id = p_company_id
              AND i.status IN ('posted', 'paid', 'partial', 'partially_paid')
              AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
              AND i.issue_date = v_day
              AND i.deleted_at IS NULL
        ) i;

        -- Daily expenses accurately normalized to base currency
        SELECT COALESCE(SUM(
            CASE
                WHEN e.currency_code = 'SAR' OR e.currency_code IS NULL THEN e.amount
                WHEN COALESCE(e.exchange_rate, 1) > 0 AND e.exchange_rate < 1
                    THEN ROUND(e.amount * e.exchange_rate, 4)
                WHEN e.currency_code = 'YER' AND COALESCE(e.exchange_rate, 1) >= 1
                    THEN ROUND(e.amount / e.exchange_rate, 4)
                WHEN COALESCE(e.exchange_rate, 1) >= 1
                    THEN ROUND(e.amount * e.exchange_rate, 4)
                ELSE e.amount
            END
        ), 0)
        INTO v_expenses
        FROM public.expenses e
        WHERE e.company_id = p_company_id
          AND e.status IN ('posted', 'paid')
          AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
          AND e.expense_date = v_day
          AND e.deleted_at IS NULL;

        value := v_sales;
        sales := v_sales;
        purchases := GREATEST(v_purchases, 0);
        expenses := GREATEST(v_expenses, 0);
        profit := v_sales - v_purchases - v_expenses;

        RETURN NEXT;
        v_day := v_day + INTERVAL '1 day';
    END LOOP;
END;
$function$;

-- 3. Update fn_auto_post_invoice_journal
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
  ELSIF COALESCE(new.exchange_rate, 1) > 0 AND new.exchange_rate < 1 THEN
    v_base_net_amount     := ROUND(v_net_amount * new.exchange_rate, 4);
    v_base_net_receivable := ROUND(v_net_receivable * new.exchange_rate, 4);
    v_base_tax            := ROUND(COALESCE(new.tax_amount, 0) * new.exchange_rate, 4);
  ELSIF new.currency_code = 'YER' AND COALESCE(new.exchange_rate, 1) >= 1 THEN
    v_base_net_amount     := ROUND(v_net_amount / new.exchange_rate, 4);
    v_base_net_receivable := ROUND(v_net_receivable / new.exchange_rate, 4);
    v_base_tax            := ROUND(COALESCE(new.tax_amount, 0) / new.exchange_rate, 4);
  ELSIF COALESCE(new.exchange_rate, 1) >= 1 THEN
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
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, v_base_tax, 0, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'استرداد ضريبة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    -- Cr Cash / AR (party_id strictly on AR account)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ar), new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'مردودات ذمم عملاء - ' ELSE 'مستردات نقدية للعميل - ' end || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

    -- Auto Restock lines (party_id must be NULL)
    IF v_total_cogs > 0 AND v_acc_cogs IS NOT NULL AND v_acc_inventory IS NOT NULL THEN
      -- Dr Inventory (1200)
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_total_cogs, 0, NULL, 'SAR', 1,
              'استرجاع مخزون مردودات - ' || COALESCE(new.invoice_number, ''), NULL);

      -- Cr COGS (5100)
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_cogs, new.company_id, new.branch_id, 0, v_total_cogs, NULL, 'SAR', 1,
              'تخفيض تكلفة مبيعات مردودة - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

  -- =========================================================================
  -- 3) PURCHASE INVOICE (شراء)
  -- =========================================================================
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

    -- Dr Inventory (party_id must be NULL)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_base_net_amount, 0, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'مخزون مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);

    -- Dr Tax (party_id must be NULL)
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
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ap), new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'دائنون - ' ELSE 'مدفوعات نقدية لمورد - ' end || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

  -- =========================================================================
  -- 4) PURCHASE RETURN (مردود مشتريات)
  -- =========================================================================
  ELSIF new.type IN ('purchase_return', 'return_purchase') THEN
    IF v_acc_inventory IS NULL THEN
      RAISE EXCEPTION 'auto_post_failed: حساب المخزون (1200) غير موجود للشركة %', new.company_id;
    END IF;

    INSERT INTO journal_entries (company_id, branch_id, entry_date, reference_type, reference_id, description, status, created_by)
    VALUES (new.company_id, new.branch_id, new.issue_date, 'purchase_return', new.id,
            'ترحيل تلقائي - مردود مشتريات ' || COALESCE(new.invoice_number, ''), 'draft', new.created_by)
    RETURNING id INTO v_je_id;

    -- Dr Cash / AP (party_id strictly on AP account)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ap), new.company_id, new.branch_id, v_base_net_receivable, 0, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'مردودات ذمم موردين - ' ELSE 'مستردات نقدية من مورد - ' end || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

    -- Cr Inventory (party_id must be NULL)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, 0, v_base_net_amount, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'إخراج مخزون مردود - ' || COALESCE(new.invoice_number, ''), NULL);

    -- Cr Tax (party_id must be NULL)
    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, v_base_tax, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'تخفيض ضريبة مشتريات مردودة - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;
  END IF;

  -- Auto-post the created journal entry to avoid stale draft states
  IF v_je_id IS NOT NULL THEN
    UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;
  END IF;

  RETURN new;
END;
$function$;
