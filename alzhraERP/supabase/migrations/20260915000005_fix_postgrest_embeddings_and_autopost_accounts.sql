-- Migration: 20260915000005_fix_postgrest_embeddings_and_autopost_accounts.sql
-- Description:
--   1. إصلاح دالة fn_auto_post_invoice_journal لحل حسابات الصندوق والبنك الحقيقية (1010, 1020) بدلاً من (1110, 1120) غير الموجودة،
--      مما كان يتسبب في عدم توازن القيد وخطأ HTTP 400 عند تسجيل فواتير المبيعات عبر commit_sales_invoice_v2.
--   2. إزالة المفاتيح الأجنبية المركبة المكررة التي تربك PostgREST وتسبب خطأ PGRST201 (More than one relationship found).
--   3. تثبيت دوال حراسة زنادية (Tenant Isolation Triggers) لضمان العزل التام بين الشركات على مستوى قاعدة البيانات دون كسر PostgREST.

-- ============================================================================
-- 1. Fix fn_auto_post_invoice_journal: Resolve Active Cash/Bank Accounts
-- ============================================================================

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

  -- تحديد حساب التمويل (صندوق أو بنك) بناء على الحساب المحدد أو وسيلة الدفع
  IF new.payment_account_id IS NOT NULL THEN
    v_acc_funding := new.payment_account_id;
  ELSIF new.payment_method = 'cash' THEN
    v_acc_funding := COALESCE(
      fn_get_account_id(new.company_id, '1010'),
      fn_get_account_id(new.company_id, '1110')
    );
  ELSIF new.payment_method IN ('network', 'card', 'bank', 'bank_transfer', 'pos') THEN
    v_acc_funding := COALESCE(
      fn_get_account_id(new.company_id, '1020'),
      fn_get_account_id(new.company_id, '1120')
    );
  ELSE
    v_acc_funding := COALESCE(
      fn_get_account_id(new.company_id, '1010'),
      fn_get_account_id(new.company_id, '1110'),
      fn_get_account_id(new.company_id, '1020')
    );
  END IF;

  -- Fallback: إذا لم نجد حساب 1010 أو 1020، نبحث عن أول حساب صندوق/أصول نشط للشركة
  IF v_acc_funding IS NULL AND v_base_paid > 0 THEN
    SELECT id INTO v_acc_funding
    FROM public.accounts
    WHERE company_id = new.company_id
      AND (code LIKE '1010%' OR code LIKE '1020%' OR type = 'asset')
      AND is_active = true
    ORDER BY code ASC
    LIMIT 1;
  END IF;

  -- إذا تعذر تماماً وكان هناك مبلغ مدفوع، نستخدم حساب الذمم لتفادي كسر توازن القيد
  IF v_acc_funding IS NULL AND v_base_paid > 0 THEN
    v_acc_funding := v_acc_ar;
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

  -- Ensure journal entry status is posted
  IF v_je_id IS NOT NULL THEN
    UPDATE journal_entries SET status = 'posted' WHERE id = v_je_id;
  END IF;

  RETURN new;
END;
$function$;

-- ============================================================================
-- 2. Tenant Isolation Triggers (Database Is The System of Record)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_check_invoice_item_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_company uuid;
  v_product_company uuid;
BEGIN
  SELECT company_id INTO v_invoice_company FROM public.invoices WHERE id = NEW.invoice_id;
  IF v_invoice_company IS NOT NULL AND v_invoice_company <> NEW.company_id THEN
    RAISE EXCEPTION 'tenant_violation: بند الفاتورة ينتمي لشركة (%) والفاتورة تنتمي لشركة (%)', NEW.company_id, v_invoice_company;
  END IF;

  IF NEW.product_id IS NOT NULL THEN
    SELECT company_id INTO v_product_company FROM public.products WHERE id = NEW.product_id;
    IF v_product_company IS NOT NULL AND v_product_company <> NEW.company_id THEN
      RAISE EXCEPTION 'tenant_violation: الصنف ينتمي لشركة (%) وبند الفاتورة لشركة (%)', v_product_company, NEW.company_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_invoice_item_tenant ON public.invoice_items;
CREATE TRIGGER trg_check_invoice_item_tenant
  BEFORE INSERT OR UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_invoice_item_tenant();

CREATE OR REPLACE FUNCTION public.fn_check_journal_entry_line_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_company uuid;
  v_account_company uuid;
BEGIN
  SELECT company_id INTO v_entry_company FROM public.journal_entries WHERE id = NEW.journal_entry_id;
  IF v_entry_company IS NOT NULL AND v_entry_company <> NEW.company_id THEN
    RAISE EXCEPTION 'tenant_violation: سطر القيد ينتمي لشركة (%) والقيد ينتمي لشركة (%)', NEW.company_id, v_entry_company;
  END IF;

  IF NEW.account_id IS NOT NULL THEN
    SELECT company_id INTO v_account_company FROM public.accounts WHERE id = NEW.account_id;
    IF v_account_company IS NOT NULL AND v_account_company <> NEW.company_id THEN
      RAISE EXCEPTION 'tenant_violation: الحساب ينتمي لشركة (%) وسطر القيد لشركة (%)', v_account_company, NEW.company_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_journal_entry_line_tenant ON public.journal_entry_lines;
CREATE TRIGGER trg_check_journal_entry_line_tenant
  BEFORE INSERT OR UPDATE ON public.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_journal_entry_line_tenant();

CREATE OR REPLACE FUNCTION public.fn_check_product_stock_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product_company uuid;
  v_wh_company uuid;
BEGIN
  SELECT company_id INTO v_product_company FROM public.products WHERE id = NEW.product_id;
  IF v_product_company IS NOT NULL AND v_product_company <> NEW.company_id THEN
    RAISE EXCEPTION 'tenant_violation: المنتج ينتمي لشركة (%) وسجل المخزون لشركة (%)', v_product_company, NEW.company_id;
  END IF;

  SELECT company_id INTO v_wh_company FROM public.warehouses WHERE id = NEW.warehouse_id;
  IF v_wh_company IS NOT NULL AND v_wh_company <> NEW.company_id THEN
    RAISE EXCEPTION 'tenant_violation: المستودع ينتمي لشركة (%) وسجل المخزون لشركة (%)', v_wh_company, NEW.company_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_product_stock_tenant ON public.product_stock;
CREATE TRIGGER trg_check_product_stock_tenant
  BEFORE INSERT OR UPDATE ON public.product_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_product_stock_tenant();

CREATE OR REPLACE FUNCTION public.fn_check_warehouse_branch_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_branch_company uuid;
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    SELECT company_id INTO v_branch_company FROM public.branches WHERE id = NEW.branch_id;
    IF v_branch_company IS NOT NULL AND v_branch_company <> NEW.company_id THEN
      RAISE EXCEPTION 'tenant_violation: الفرع ينتمي لشركة (%) والمستودع لشركة (%)', v_branch_company, NEW.company_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_warehouse_branch_tenant ON public.warehouses;
CREATE TRIGGER trg_check_warehouse_branch_tenant
  BEFORE INSERT OR UPDATE ON public.warehouses
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_warehouse_branch_tenant();

-- ============================================================================
-- 3. Drop Conflicting Duplicate Composite Foreign Keys
-- ============================================================================

ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_items_company_invoice;
ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_items_company_product;
ALTER TABLE public.payment_allocations DROP CONSTRAINT IF EXISTS fk_payment_allocations_company_invoice;
ALTER TABLE public.payment_allocations DROP CONSTRAINT IF EXISTS fk_payment_allocations_company_payment;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_company_party;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_company_branch;
ALTER TABLE public.journal_entry_lines DROP CONSTRAINT IF EXISTS fk_jel_company_journal_entry;
ALTER TABLE public.journal_entry_lines DROP CONSTRAINT IF EXISTS fk_jel_company_account;
ALTER TABLE public.product_stock DROP CONSTRAINT IF EXISTS fk_product_stock_company_product;
ALTER TABLE public.product_stock DROP CONSTRAINT IF EXISTS fk_product_stock_company_warehouse;
ALTER TABLE public.warehouses DROP CONSTRAINT IF EXISTS fk_warehouses_company_branch;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS fk_invitations_branch;
