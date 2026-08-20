-- ============================================================
-- FIX: return RPCs insert the journal header as 'posted' BEFORE
--      their lines → blocked by the live trigger
--      trg_journal_entry_lines_immutability
--      (prevent_posted_journal_line_modification) with SQLSTATE 23514
--      'Cannot add lines to a posted journal entry' → PostgREST
--      returns HTTP 400, so commit_purchase_return / process_sales_return
--      ALWAYS fail and every save rolls back.
--
-- Same-file fix: process_sales_return read p_items with camelCase keys
-- ("productId"/"unitPrice"/"costPrice") while the frontend sends snake_case
-- (toReturnPayloadItems → product_id/unit_price/cost_price), so subtotals
-- became NULL and the invoices.total_amount NOT NULL constraint failed.
-- Now reads snake_case (the frontend contract) defensively.
--
-- Type alignment: the live `invoices_type_check` allows only
-- 'purchase_return'/'sale_return' (NOT 'return_purchase'/'return_sale'),
-- and the live function writes 'purchase_return' everywhere (invoices.type,
-- inventory_transactions.transaction_type, journal_entries.reference_type).
-- This migration keeps those live values; the frontend was aligned to match.
--
-- This is the same "posted-first" bug class fixed for post_manual_journal /
-- fn_auto_post_invoice_journal / commit_payment in ADR-005/006/007:
--   insert header as 'draft' → insert lines → set 'posted'.
--
-- The return invoice is also inserted as 'draft' and switched to 'posted'
-- ONLY AFTER the journal is complete, so the AFTER INSERT/UPDATE OF status
-- trigger fn_auto_post_invoice_journal sees v_already_posted = true and does
-- not create a second (zero) journal entry for the same invoice.
--
-- Signature unchanged → no privilege changes needed; GRANTs re-applied
-- defensively. Date: 2026-08-20
-- ============================================================

-- ============================================================
-- 1) commit_purchase_return
-- ============================================================

CREATE OR REPLACE FUNCTION public.commit_purchase_return(p_company_id uuid, p_user_id uuid, p_supplier_id uuid, p_items jsonb, p_notes text, p_currency text, p_exchange_rate numeric, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id           uuid;
  v_invoice_number       text;
  v_subtotal             numeric(14,4) := 0;
  v_total                numeric(14,4) := 0;
  v_item                 jsonb;
  v_product              RECORD;
  v_primary_wh_id        uuid;
  v_journal_id           uuid;
  v_payable_account_id   uuid;
  v_inventory_account_id uuid;
  v_base_total           numeric(14,4);
  v_base_subtotal        numeric(14,4);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id
      AND CURRENT_DATE BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  SELECT id INTO v_primary_wh_id FROM warehouses
    WHERE company_id=p_company_id AND (p_branch_id is null or branch_id=p_branch_id) AND is_primary=true LIMIT 1;
  IF v_primary_wh_id IS NULL THEN
    SELECT id INTO v_primary_wh_id FROM warehouses WHERE company_id=p_company_id AND (p_branch_id is null or branch_id=p_branch_id) LIMIT 1;
  END IF;
  IF v_primary_wh_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مستودع للفرع';
  END IF;

  SELECT id INTO v_payable_account_id
    FROM accounts WHERE company_id=p_company_id AND code='2100' LIMIT 1;
  IF v_payable_account_id IS NULL THEN RAISE EXCEPTION 'حساب الدائنين (2100) مفقود'; END IF;

  SELECT id INTO v_inventory_account_id
    FROM accounts WHERE company_id=p_company_id AND code='1200' LIMIT 1;
  IF v_inventory_account_id IS NULL THEN RAISE EXCEPTION 'حساب المخزون (1200) مفقود'; END IF;

  v_invoice_number := get_next_invoice_number(p_company_id, 'RPR');

  -- تُدرج الفاتورة كمسودة ثم تُرحَّل بعد اكتمال القيد المحاسبي (أسفل الدالة)
  -- حتى لا ينشئ trigger fn_auto_post_invoice_journal قيداً صفرياً مكرراً.
  INSERT INTO invoices(
    company_id, branch_id, party_id, invoice_number, type, status,
    notes, created_by, currency_code, exchange_rate, tax_amount, subtotal, total_amount
  ) VALUES (
    p_company_id, p_branch_id, p_supplier_id, v_invoice_number,
    'purchase_return', 'draft',
    p_notes, p_user_id, p_currency, p_exchange_rate, 0, 0, 0
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products
      WHERE id=(v_item->>'product_id')::uuid
        AND company_id=p_company_id AND deleted_at IS NULL;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'المنتج غير موجود: %', v_item->>'product_id';
    END IF;

    DECLARE
      v_qty       numeric := (v_item->>'quantity')::numeric;
      v_unit_cost numeric := COALESCE((v_item->>'unit_cost')::numeric, v_product.purchase_price);
      v_discount  numeric := COALESCE((v_item->>'discount_amount')::numeric, 0);
      v_line_sub  numeric := (v_qty * v_unit_cost) - v_discount;
    BEGIN
      IF v_qty <= 0 THEN RAISE EXCEPTION 'الكمية يجب أن تكون أكبر من صفر'; END IF;

      INSERT INTO invoice_items(
        invoice_id, product_id, description, quantity,
        unit_price, cost_price, discount_amount, tax_amount, total, company_id
      ) VALUES (
        v_invoice_id, v_product.id, v_product.name_ar, v_qty,
        v_unit_cost, v_unit_cost, v_discount, 0, v_line_sub, p_company_id
      );

      INSERT INTO inventory_transactions(
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by,
        unit_cost, total_cost
      ) VALUES (
        p_company_id, v_product.id, v_primary_wh_id, v_qty,
        'purchase_return', 'invoice', v_invoice_id, p_user_id,
        v_unit_cost, round(v_qty * v_unit_cost, 4)
      );

      v_subtotal := v_subtotal + v_line_sub;
    END;
  END LOOP;

  v_total := v_subtotal;
  UPDATE invoices SET subtotal=v_subtotal, tax_amount=0, total_amount=v_total WHERE id=v_invoice_id;

  v_base_subtotal := ROUND(v_subtotal * p_exchange_rate, 4);
  v_base_total    := ROUND(v_total    * p_exchange_rate, 4);

  -- [FIX] رأس القيد كمسودة أولاً ثم البنود ثم الترحيل:
  -- trg_journal_entry_lines_immutability يمنع إضافة بنود لقيد مرحَّل (SQLSTATE 23514).
  INSERT INTO journal_entries(
    company_id, branch_id, entry_date, description, reference_type, reference_id, status, created_by
  ) VALUES (
    p_company_id, p_branch_id, CURRENT_DATE, 'مرتجع مشتريات ' || v_invoice_number,
    'purchase_return', v_invoice_id, 'draft', p_user_id
  ) RETURNING id INTO v_journal_id;

  INSERT INTO journal_entry_lines(
    journal_entry_id, account_id, party_id, debit_amount, credit_amount,
    description, currency_code, exchange_rate, foreign_amount, company_id, branch_id
  ) VALUES
    (v_journal_id, v_payable_account_id, p_supplier_id, v_base_total, 0,
     'تخفيض ذمم المورد - ' || v_invoice_number, p_currency, p_exchange_rate, v_total, p_company_id, p_branch_id),
    (v_journal_id, v_inventory_account_id, NULL, 0, v_base_subtotal,
     'خصم مخزون مرتجع - ' || v_invoice_number, p_currency, p_exchange_rate, v_subtotal, p_company_id, p_branch_id);

  UPDATE journal_entries SET status='posted' WHERE id=v_journal_id;

  -- ترحيل الفاتورة بعد اكتمال القيد — trigger fn_auto_post_invoice_journal
  -- سيتحقق من v_already_posted فيتخطى (لا قيد تلقائي ثانٍ).
  UPDATE invoices SET status='posted' WHERE id=v_invoice_id;

  RETURN jsonb_build_object(
    'id', v_invoice_id, 'invoice_number', v_invoice_number,
    'total_base', v_base_total, 'currency', p_currency, 'status', 'posted'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.commit_purchase_return(uuid, uuid, uuid, jsonb, text, text, numeric, uuid) TO authenticated;

-- ============================================================
-- 2) process_sales_return (same bug class)
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_sales_return(p_invoice_id uuid, p_party_id uuid, p_payment_method text, p_items jsonb, p_return_reason text, p_status text, p_notes text, p_issue_date date, p_currency_code text, p_exchange_rate numeric, p_company_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_return_invoice_id UUID;
  v_invoice_number    TEXT;
  v_total_amount      NUMERIC := 0;
  v_subtotal          NUMERIC := 0;
  v_cost_total        NUMERIC := 0;
  v_warehouse_id      UUID;
  v_journal_id        UUID;
  v_item              RECORD;
  v_account_revenue   UUID;
  v_account_receivable UUID;
  v_account_cash      UUID;
  v_account_inventory UUID;
  v_account_cogs      UUID;
  v_credit_account    UUID;
BEGIN
  -- [FIX أمني حرج] لم تكن الدالة تتحقق أبداً أن p_user_id عضو في p_company_id.
  IF NOT is_super_admin() AND NOT EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = p_user_id AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- ① التحقق من السنة المالية المفتوحة
  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  -- ② توليد رقم الفاتورة
  v_invoice_number := public.get_next_invoice_number(p_company_id, 'RET');

  -- ③ حساب الإجماليات من الأصناف
  -- [FIX 2026-08-20] الواجهة ترسل p_items بمفاتيح snake_case
  -- (product_id / unit_price / cost_price) عبر toReturnPayloadItems — كانت الدالة
  -- تقرأ camelCase (productId/unitPrice) فتصير الإجماليات NULL ويفشل الإدراج
  -- (NOT NULL على invoices.total_amount) وتُتخطّى حركات المخزون صامتاً.
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(product_id uuid, quantity numeric, unit_price numeric, cost_price numeric)
  LOOP
    v_subtotal   := v_subtotal   + COALESCE(v_item.quantity * v_item.unit_price, 0);
    v_cost_total := v_cost_total + COALESCE(v_item.quantity * v_item.cost_price, 0);
  END LOOP;

  v_total_amount := v_subtotal;


  -- ④ إنشاء فاتورة المرتجع
  -- [FIX] كان type يُسجَّل كـ 'return_sale' وهي قيمة غير موجودة أبداً في invoices_type_check
  -- (التي تسمح فقط بـ 'sale_return')، مما كان يجعل الدالة تفشل بالكامل لأي استدعاء.
  -- [FIX 2026-08-20] تُدرج كمسودة ثم تُرحَّل بعد اكتمال القيد المحاسبي حتى لا ينشئ
  -- trigger fn_auto_post_invoice_journal قيداً صفرياً مكرراً.
  INSERT INTO public.invoices (
    company_id, invoice_number, type, status, party_id,
    issue_date, due_date, total_amount, subtotal,
    tax_amount, discount_amount, notes, payment_method,
    currency_code, exchange_rate, reference_invoice_id,
    return_reason, created_by
  ) VALUES (
    p_company_id, v_invoice_number, 'sale_return', 'draft', p_party_id,
    p_issue_date, p_issue_date, v_total_amount, v_subtotal,
    0, 0, p_notes, p_payment_method,
    p_currency_code, p_exchange_rate, p_invoice_id,
    p_return_reason, p_user_id
  ) RETURNING id INTO v_return_invoice_id;

  -- ⑤ إضافة أصناف الفاتورة
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity,
    unit_price, total, cost_price, tax_amount, company_id
  )
  SELECT
    v_return_invoice_id,
    (item->>'product_id')::UUID,
    COALESCE((item->>'name'), ''),
    (item->>'quantity')::NUMERIC,
    (item->>'unit_price')::NUMERIC,
    (item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC,
    COALESCE((item->>'cost_price')::NUMERIC, 0),
    0,
    p_company_id
  FROM jsonb_array_elements(p_items) AS item;

  -- ⑥ تحريك المخزون وإنشاء القيود المحاسبية عند الترحيل
  IF p_status = 'posted' THEN

    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE company_id = p_company_id AND is_primary = true
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
      SELECT id INTO v_warehouse_id
      FROM public.warehouses
      WHERE company_id = p_company_id
      LIMIT 1;
    END IF;

    IF v_warehouse_id IS NOT NULL THEN
      FOR v_item IN
        SELECT * FROM jsonb_to_recordset(p_items)
          AS x(product_id uuid, quantity numeric, cost_price numeric)
      LOOP
        IF v_item.product_id IS NOT NULL THEN
          -- [FIX] إضافة unit_cost (نفس مشكلة process_stock_transfer):
          -- trg_require_inventory_cost يفرض NOT NULL على كل حركة مخزون.
          INSERT INTO public.inventory_transactions (
            company_id, product_id, warehouse_id, quantity, unit_cost,
            transaction_type, reference_type, reference_id, created_by
          ) VALUES (
            p_company_id, v_item.product_id, v_warehouse_id, v_item.quantity,
            COALESCE(v_item.cost_price, 0),
            'sales_return', 'invoice', v_return_invoice_id, p_user_id
          );
        END IF;
      END LOOP;
    END IF;

    SELECT id INTO v_account_revenue     FROM public.accounts WHERE company_id = p_company_id AND code = '4100' LIMIT 1;
    SELECT id INTO v_account_receivable  FROM public.accounts WHERE company_id = p_company_id AND code = '1100' LIMIT 1;
    SELECT id INTO v_account_cash        FROM public.accounts WHERE company_id = p_company_id AND code = '1010' LIMIT 1;
    SELECT id INTO v_account_inventory   FROM public.accounts WHERE company_id = p_company_id AND code = '1200' LIMIT 1;
    SELECT id INTO v_account_cogs        FROM public.accounts WHERE company_id = p_company_id AND code = '5100' LIMIT 1;

    -- [FIX 2026-08-20] رأس القيد كمسودة أولاً ثم البنود ثم الترحيل:
    -- trg_journal_entry_lines_immutability يمنع إضافة بنود لقيد مرحَّل (SQLSTATE 23514).
    INSERT INTO public.journal_entries (
      company_id, entry_date, description, status,
      reference_type, reference_id, created_by
    ) VALUES (
      p_company_id, p_issue_date,
      'مرتجع مبيعات - ' || v_invoice_number,
      'draft', 'invoice', v_return_invoice_id, p_user_id
    ) RETURNING id INTO v_journal_id;


    IF v_account_revenue IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_account_revenue,
        ROUND(v_subtotal * p_exchange_rate, 4), 0,
        'عكس إيراد - مرتجع مبيعات',
        p_currency_code, p_exchange_rate, v_subtotal, p_company_id
      );
    END IF;

    v_credit_account := CASE
      WHEN p_payment_method = 'cash' THEN v_account_cash
      ELSE v_account_receivable
    END;

    IF v_credit_account IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, party_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES (
        v_journal_id, v_credit_account, p_party_id,
        0, ROUND(v_total_amount * p_exchange_rate, 4),
        CASE WHEN p_payment_method = 'cash'
             THEN 'رد نقدية للعميل'
             ELSE 'عكس مديونية العميل'
        END,
        p_currency_code, p_exchange_rate, v_total_amount, p_company_id
      );
    END IF;

    IF v_cost_total > 0
       AND v_account_inventory IS NOT NULL
       AND v_account_cogs IS NOT NULL
    THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        description, currency_code, exchange_rate, foreign_amount, company_id
      ) VALUES
      (
        v_journal_id, v_account_inventory,
        ROUND(v_cost_total * p_exchange_rate, 4), 0,
        'إرجاع بضاعة للمخزن',
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      ),
      (
        v_journal_id, v_account_cogs,
        0, ROUND(v_cost_total * p_exchange_rate, 4),
        'عكس تكلفة البضاعة المباعة',
        p_currency_code, p_exchange_rate, v_cost_total, p_company_id
      );
    END IF;

    UPDATE public.journal_entries SET status = 'posted' WHERE id = v_journal_id;

    -- ترحيل الفاتورة بعد اكتمال القيد — trigger fn_auto_post_invoice_journal
    -- سيتحقق من v_already_posted فيتخطى (لا قيد تلقائي ثانٍ).
    UPDATE public.invoices SET status = 'posted' WHERE id = v_return_invoice_id;

  END IF;

  RETURN jsonb_build_object(
    'id',             v_return_invoice_id,
    'invoice_number', v_invoice_number,
    'status',         'success'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_sales_return(uuid, uuid, text, jsonb, text, text, text, date, text, numeric, uuid, uuid) TO authenticated;

