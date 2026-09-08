-- Migration: 20260908000012_fix_sales_analytics_and_journal_posting.sql
-- 1. Ensure fn_auto_post_invoice_journal marks journal_entries as 'posted'
-- 2. Backfill draft invoice journal entries to 'posted'
-- 3. Comprehensive multi-currency get_sales_analytics with full breakdown data
-- 4. Multi-currency normalization in get_dashboard_summary & get_sales_chart_data

-- ============================================================
-- 1. Update fn_auto_post_invoice_journal to set status = 'posted'
-- ============================================================
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

  v_net_amount := (new.total_amount - COALESCE(new.tax_amount, 0)) - COALESCE(new.discount_amount, 0);
  v_net_receivable := new.total_amount - COALESCE(new.discount_amount, 0);

  IF new.currency_code = 'SAR' OR new.currency_code IS NULL THEN
    v_base_net_amount     := v_net_amount;
    v_base_net_receivable := v_net_receivable;
    v_base_tax            := COALESCE(new.tax_amount, 0);
  ELSIF (SELECT exchange_operator FROM public.supported_currencies WHERE code = new.currency_code) = 'divide' THEN
    IF COALESCE(new.exchange_rate, 0) <= 0 THEN
      RAISE EXCEPTION 'auto_post_failed: سعر صرف غير صالح للعملة %', new.currency_code;
    END IF;
    v_base_net_amount     := round(v_net_amount / new.exchange_rate, 4);
    v_base_tax            := round(COALESCE(new.tax_amount, 0) / new.exchange_rate, 4);
    v_base_net_receivable := v_base_net_amount + v_base_tax;
  ELSE
    v_base_net_amount     := round(v_net_amount * COALESCE(new.exchange_rate, 1), 4);
    v_base_tax            := round(COALESCE(new.tax_amount, 0) * COALESCE(new.exchange_rate, 1), 4);
    v_base_net_receivable := v_base_net_amount + v_base_tax;
  END IF;

  v_paid_foreign := LEAST(COALESCE(new.paid_amount, 0), v_net_receivable);
  v_unpaid_foreign := v_net_receivable - v_paid_foreign;

  IF v_net_receivable > 0 THEN
    v_base_paid := round(v_base_net_receivable * (v_paid_foreign / v_net_receivable), 4);
    v_base_unpaid := v_base_net_receivable - v_base_paid;
  ELSE
    v_base_paid := 0;
    v_base_unpaid := 0;
  END IF;

  IF new.payment_account_id IS NOT NULL THEN
    v_acc_funding := new.payment_account_id;
  ELSIF new.payment_method = 'cash' THEN
    v_acc_funding := fn_get_account_id(new.company_id, '1110');
  ELSIF new.payment_method = 'network' THEN
    v_acc_funding := fn_get_account_id(new.company_id, '1120');
  ELSE
    v_acc_funding := NULL;
  END IF;

  -- 1. فاتورة مبيعات
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

  -- 2. فاتورة مشتريات
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

  -- 3. مردود مبيعات
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
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, v_base_tax, 0, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
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

  -- 4. مردود مشتريات
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
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ap), new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
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

  -- Ensure journal entry status is posted
  IF v_je_id IS NOT NULL THEN
    UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;
  END IF;

  RETURN new;
END;
$function$;

-- ============================================================
-- 2. Backfill existing draft invoice journals to 'posted'
-- ============================================================
UPDATE journal_entries
SET status = 'posted'
WHERE reference_type IN ('sales_invoice', 'purchase_invoice', 'sales_return', 'purchase_return', 'sale_return', 'return_sale')
  AND status = 'draft';

-- ============================================================
-- 3. Rewrite get_sales_analytics with currency normalization & full breakdown
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_sales_analytics(
  p_company_id uuid,
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  vc uuid;
  v_from date := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '30 days')::date);
  v_to date := COALESCE(p_end_date, CURRENT_DATE);
  v_period_len integer;
  v_prev_from date;
  v_prev_to date;

  v_total_sales numeric := 0;
  v_total_returns numeric := 0;
  v_net_sales numeric := 0;
  v_invoice_count integer := 0;
  v_avg_invoice numeric := 0;

  v_prev_total_sales numeric := 0;
  v_prev_total_returns numeric := 0;
  v_prev_net_sales numeric := 0;

  v_top_products jsonb := '[]'::jsonb;
  v_top_customers jsonb := '[]'::jsonb;
  v_sales_by_day jsonb := '[]'::jsonb;
  v_sales_by_payment jsonb := '[]'::jsonb;
BEGIN
  vc := public.verify_company_access(p_company_id);

  v_period_len := (v_to - v_from) + 1;
  IF v_period_len <= 0 THEN
    v_period_len := 1;
  END IF;
  v_prev_from := v_from - v_period_len;
  v_prev_to := v_from - 1;

  -- 1. Main Period KPI Totals (Normalized to base currency)
  SELECT
    COALESCE(SUM(CASE WHEN i.type = 'sale' THEN
      CASE 
        WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
        WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
        ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
      END
    ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN i.type IN ('return_sale', 'sale_return') THEN
      CASE 
        WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
        WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
        ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
      END
    ELSE 0 END), 0),
    COUNT(CASE WHEN i.type = 'sale' THEN 1 END)
  INTO v_total_sales, v_total_returns, v_invoice_count
  FROM public.invoices i
  LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
  WHERE i.company_id = vc
    AND i.type IN ('sale', 'return_sale', 'sale_return')
    AND i.status IN ('posted', 'paid', 'partially_paid')
    AND i.issue_date BETWEEN v_from AND v_to
    AND i.deleted_at IS NULL;

  v_net_sales := v_total_sales - v_total_returns;
  v_avg_invoice := CASE WHEN v_invoice_count > 0 THEN ROUND(v_total_sales / v_invoice_count, 2) ELSE 0 END;

  -- 2. Previous Period KPIs (for growth calculation)
  SELECT
    COALESCE(SUM(CASE WHEN i.type = 'sale' THEN
      CASE 
        WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
        WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
        ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
      END
    ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN i.type IN ('return_sale', 'sale_return') THEN
      CASE 
        WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
        WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
        ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
      END
    ELSE 0 END), 0)
  INTO v_prev_total_sales, v_prev_total_returns
  FROM public.invoices i
  LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
  WHERE i.company_id = vc
    AND i.type IN ('sale', 'return_sale', 'sale_return')
    AND i.status IN ('posted', 'paid', 'partially_paid')
    AND i.issue_date BETWEEN v_prev_from AND v_prev_to
    AND i.deleted_at IS NULL;

  v_prev_net_sales := v_prev_total_sales - v_prev_total_returns;

  -- 3. Top Products (Normalized)
  SELECT COALESCE(jsonb_agg(p_row), '[]'::jsonb) INTO v_top_products
  FROM (
    SELECT 
      ii.product_id AS "productId",
      COALESCE(p.name_ar, 'منتج غير معروف') AS "productName",
      ROUND(SUM(ii.quantity), 2) AS "quantity",
      ROUND(SUM(
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN ii.total
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ii.total / i.exchange_rate
          ELSE ii.total * COALESCE(i.exchange_rate, 1)
        END
      ), 2) AS "revenue"
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    LEFT JOIN public.products p ON p.id = ii.product_id
    LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
    WHERE i.company_id = vc
      AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to
      AND i.deleted_at IS NULL
    GROUP BY ii.product_id, p.name_ar
    ORDER BY "revenue" DESC
    LIMIT 10
  ) p_row;

  -- 4. Top Customers (Normalized)
  SELECT COALESCE(jsonb_agg(c_row), '[]'::jsonb) INTO v_top_customers
  FROM (
    SELECT 
      i.party_id AS "customerId",
      COALESCE(p.name, 'عميل نقدي') AS "customerName",
      ROUND(SUM(
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
          ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
        END
      ), 2) AS "totalAmount",
      COUNT(i.id) AS "invoiceCount"
    FROM public.invoices i
    LEFT JOIN public.parties p ON p.id = i.party_id
    LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
    WHERE i.company_id = vc
      AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to
      AND i.deleted_at IS NULL
    GROUP BY i.party_id, p.name
    ORDER BY "totalAmount" DESC
    LIMIT 10
  ) c_row;

  -- 5. Sales by Day (Normalized)
  SELECT COALESCE(jsonb_agg(d_row), '[]'::jsonb) INTO v_sales_by_day
  FROM (
    SELECT 
      i.issue_date::text AS "date",
      ROUND(SUM(CASE WHEN i.type = 'sale' THEN
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
          ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
        END
      ELSE 0 END), 2) AS "sales",
      ROUND(SUM(CASE WHEN i.type IN ('return_sale', 'sale_return') THEN
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
          ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
        END
      ELSE 0 END), 2) AS "returns"
    FROM public.invoices i
    LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
    WHERE i.company_id = vc
      AND i.type IN ('sale', 'return_sale', 'sale_return')
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to
      AND i.deleted_at IS NULL
    GROUP BY i.issue_date
    ORDER BY i.issue_date
  ) d_row;

  -- 6. Sales by Payment Method (Normalized)
  SELECT COALESCE(jsonb_agg(m_row), '[]'::jsonb) INTO v_sales_by_payment
  FROM (
    SELECT 
      COALESCE(i.payment_method, 'cash') AS "method",
      ROUND(SUM(
        CASE 
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
          ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
        END
      ), 2) AS "amount"
    FROM public.invoices i
    LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
    WHERE i.company_id = vc
      AND i.type = 'sale'
      AND i.status IN ('posted', 'paid', 'partially_paid')
      AND i.issue_date BETWEEN v_from AND v_to
      AND i.deleted_at IS NULL
    GROUP BY COALESCE(i.payment_method, 'cash')
    ORDER BY "amount" DESC
  ) m_row;

  RETURN jsonb_build_object(
    'totalSales', ROUND(v_total_sales, 2),
    'totalReturns', ROUND(v_total_returns, 2),
    'netSales', ROUND(v_net_sales, 2),
    'invoiceCount', v_invoice_count,
    'averageInvoiceValue', v_avg_invoice,
    'prevTotalSales', ROUND(v_prev_total_sales, 2),
    'prevTotalReturns', ROUND(v_prev_total_returns, 2),
    'prevNetSales', ROUND(v_prev_net_sales, 2),
    'topProducts', v_top_products,
    'topCustomers', v_top_customers,
    'salesByDay', v_sales_by_day,
    'salesByPaymentMethod', v_sales_by_payment
  );
END;
$function$;

-- ============================================================
-- 4. Update get_dashboard_summary to normalize foreign currencies
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
    vc uuid;
    v_effective_branch uuid;
    v_is_admin boolean;
    v_opening_cust_debts NUMERIC;
    v_opening_supp_debts NUMERIC;
BEGIN
    vc := public.verify_company_access(p_company_id);
    v_is_admin := public.is_main_branch_or_admin(vc);

    IF v_is_admin THEN
        v_effective_branch := p_branch_id;
    ELSE
        v_effective_branch := public.get_user_branch_id(vc);
    END IF;

    -- Opening customer debts
    SELECT COALESCE(SUM(
        CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END
        * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
            WHERE er.company_id = vc AND er.currency_code = ob.currency_code
            ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
    ), 0) INTO v_opening_cust_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'customer' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (v_effective_branch IS NULL OR ob.branch_id = v_effective_branch OR p.branch_id = v_effective_branch);

    -- Opening supplier debts
    SELECT COALESCE(SUM(
        CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE -ob.amount END
        * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
            WHERE er.company_id = vc AND er.currency_code = ob.currency_code
            ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
    ), 0) INTO v_opening_supp_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'supplier' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (v_effective_branch IS NULL OR ob.branch_id = v_effective_branch OR p.branch_id = v_effective_branch);

    RETURN (SELECT jsonb_build_object(
        'total_sales', COALESCE((SELECT ROUND(SUM(
            CASE 
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
              ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
            END
          ), 2) FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'sale'
            AND i.status IN ('posted','paid','partial','partially_paid')
            AND i.deleted_at IS NULL
            AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
            AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)), 0),
        'total_purchases', COALESCE((SELECT ROUND(SUM(
            CASE 
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
              ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
            END
          ), 2) FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND i.status IN ('posted','paid','partial','partially_paid')
            AND i.deleted_at IS NULL
            AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
            AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)), 0),
        'total_expenses', COALESCE((SELECT ROUND(SUM(
            CASE 
              WHEN e.currency_code = 'SAR' OR e.currency_code IS NULL OR sc.is_base THEN e.amount
              WHEN sc.exchange_operator = 'divide' AND e.exchange_rate > 0 THEN e.amount / e.exchange_rate
              ELSE e.amount * COALESCE(e.exchange_rate, 1)
            END
          ), 2) FROM public.expenses e
          LEFT JOIN public.supported_currencies sc ON sc.code = e.currency_code
          WHERE e.company_id = vc AND e.status IN ('posted','paid') AND e.deleted_at IS NULL
            AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
            AND (p_date_to IS NULL OR e.expense_date <= p_date_to)
            AND (v_effective_branch IS NULL OR e.branch_id = v_effective_branch)), 0),
        'receipt_bonds', COALESCE((SELECT ROUND(SUM(
            CASE 
              WHEN p.currency_code = 'SAR' OR p.currency_code IS NULL OR sc.is_base THEN p.amount
              WHEN sc.exchange_operator = 'divide' AND p.exchange_rate > 0 THEN p.amount / p.exchange_rate
              ELSE p.amount * COALESCE(p.exchange_rate, 1)
            END
          ), 2) FROM public.payments p
          LEFT JOIN public.supported_currencies sc ON sc.code = p.currency_code
          WHERE p.company_id = vc AND p.type = 'receipt' AND p.status = 'posted' AND p.deleted_at IS NULL
            AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
            AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
            AND (v_effective_branch IS NULL OR p.branch_id = v_effective_branch)), 0),
        'payment_bonds', COALESCE((SELECT ROUND(SUM(
            CASE 
              WHEN p.currency_code = 'SAR' OR p.currency_code IS NULL OR sc.is_base THEN p.amount
              WHEN sc.exchange_operator = 'divide' AND p.exchange_rate > 0 THEN p.amount / p.exchange_rate
              ELSE p.amount * COALESCE(p.exchange_rate, 1)
            END
          ), 2) FROM public.payments p
          LEFT JOIN public.supported_currencies sc ON sc.code = p.currency_code
          WHERE p.company_id = vc AND p.type = 'disbursement' AND p.status = 'posted' AND p.deleted_at IS NULL
            AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
            AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
            AND (v_effective_branch IS NULL OR p.branch_id = v_effective_branch)), 0),
        'total_debts', (COALESCE((SELECT ROUND(SUM(
            CASE 
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN (i.total_amount - COALESCE(i.paid_amount, 0))
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN (i.total_amount - COALESCE(i.paid_amount, 0)) / i.exchange_rate
              ELSE (i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1)
            END
          ), 2)
          FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'sale'
            AND i.status IN ('posted','partial','partially_paid')
            AND i.deleted_at IS NULL
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_cust_debts),
        'total_supplier_debts', (COALESCE((SELECT ROUND(SUM(
            CASE 
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN (i.total_amount - COALESCE(i.paid_amount, 0))
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN (i.total_amount - COALESCE(i.paid_amount, 0)) / i.exchange_rate
              ELSE (i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1)
            END
          ), 2)
          FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND i.status IN ('posted','partial','partially_paid')
            AND i.deleted_at IS NULL
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_supp_debts),
        'invoice_count', (SELECT COUNT(*) FROM public.invoices
            WHERE company_id = vc AND type = 'sale'
              AND status NOT IN ('draft','void')
              AND deleted_at IS NULL
              AND (p_date_from IS NULL OR issue_date >= p_date_from)
              AND (p_date_to IS NULL OR issue_date <= p_date_to)
              AND (v_effective_branch IS NULL OR branch_id = v_effective_branch))
    ));
END;
$function$;

-- ============================================================
-- 5. Update get_sales_chart_data with proper exchange operator
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_sales_chart_data(
  p_company_id uuid,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_date_from date DEFAULT NULL::date,
  p_date_to date DEFAULT NULL::date
)
RETURNS TABLE(
  name text,
  date date,
  value numeric,
  sales numeric,
  purchases numeric,
  expenses numeric,
  profit numeric
)
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

    SELECT
      COALESCE(SUM(CASE
        WHEN i.type = 'sale' THEN i.amount
        WHEN i.type IN ('sale_return', 'return_sale') THEN -i.amount
        ELSE 0 END), 0),
      COALESCE(SUM(CASE
        WHEN i.type = 'purchase' THEN i.amount
        WHEN i.type IN ('purchase_return', 'return_purchase') THEN -i.amount
        ELSE 0 END), 0)
    INTO v_sales, v_purchases
    FROM (
      SELECT
        i.type,
        CASE
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 2)
          ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 2)
        END AS amount
      FROM public.invoices i
      LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
      WHERE i.company_id = p_company_id
        AND i.status IN ('posted', 'paid', 'partial', 'partially_paid')
        AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
        AND i.issue_date = v_day
        AND i.deleted_at IS NULL
    ) i;

    -- Daily expenses (normalized to base currency)
    SELECT COALESCE(SUM(
      CASE
        WHEN e.currency_code = 'SAR' OR e.currency_code IS NULL OR sc.is_base THEN e.amount
        WHEN sc.exchange_operator = 'divide' AND e.exchange_rate > 0 THEN ROUND(e.amount / e.exchange_rate, 2)
        ELSE ROUND(e.amount * COALESCE(e.exchange_rate, 1), 2)
      END
    ), 0)
    INTO v_expenses
    FROM public.expenses e
    LEFT JOIN public.supported_currencies sc ON sc.code = e.currency_code
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

-- Privileges
REVOKE EXECUTE ON FUNCTION public.fn_auto_post_invoice_journal() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_auto_post_invoice_journal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_analytics(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) TO authenticated;
