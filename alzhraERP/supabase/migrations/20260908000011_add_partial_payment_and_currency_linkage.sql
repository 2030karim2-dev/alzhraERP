-- ============================================================
-- Migration: 20260908000011_add_partial_payment_and_currency_linkage
-- الغرض: دعم الدفع الجزئي للفواتير الآجلة وتوزيع القيود المحاسبية
-- بين الصندوق المالي وحساب الذمم (AR/AP) بدقة وتوازن 100%
-- ============================================================

-- 1. تحديث commit_sales_invoice_v2 لدعم p_paid_amount
CREATE OR REPLACE FUNCTION public.commit_sales_invoice_v2(
  p_party_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_items jsonb,
  p_payment_type text DEFAULT 'cash'::text,
  p_notes text DEFAULT NULL::text,
  p_currency_code text DEFAULT 'SAR'::text,
  p_exchange_rate numeric DEFAULT 1,
  p_idempotency_key text DEFAULT NULL::text,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_payment_account_id uuid DEFAULT NULL::uuid,
  p_paid_amount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_user_role text;
  v_invoice_id uuid;
  v_invoice_number text;
  v_item record;
  v_product_name text;
  v_product_sku text;
  v_db_price numeric;
  v_sale_cost numeric;
  v_unit_base numeric;
  v_min_allowed_price numeric;
  v_exchange_operator text;
  v_line_total numeric;
  v_total_amount numeric := 0;
  v_total_tax numeric := 0;
  v_total_discount numeric := 0;
  v_warehouse_id uuid;
  v_party_name text;
  v_is_cash boolean;
  v_final_total numeric;
  v_actual_paid numeric;
  v_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT company_id INTO v_company_id FROM public.user_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_user_role FROM public.user_company_roles 
  WHERE user_id = v_user_id AND company_id = v_company_id LIMIT 1;
  IF v_user_role IS NULL THEN
    SELECT role INTO v_user_role FROM public.user_profiles WHERE id = v_user_id;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_invoice_id FROM public.invoices
    WHERE company_id = v_company_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_invoice_id;
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'يجب أن تحتوي الفاتورة على صنف واحد على الأقل';
  END IF;

  SELECT id INTO v_warehouse_id FROM public.warehouses
  WHERE company_id = v_company_id AND is_primary = true AND deleted_at IS NULL
  LIMIT 1;

  IF v_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id FROM public.warehouses
    WHERE company_id = v_company_id AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF p_party_id IS NOT NULL THEN
    SELECT name INTO v_party_name FROM public.parties WHERE id = p_party_id AND company_id = v_company_id;
  END IF;

  -- === PHASE 1: VALIDATE ITEMS & PRICES ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric,
      warehouse_id uuid, cost_price numeric, discount_amount numeric)
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'الكمية المدخلة غير صحيحة (%) للصنف', v_item.quantity;
    END IF;

    SELECT name_ar, sku, sale_price, cost_price 
    INTO v_product_name, v_product_sku, v_db_price, v_sale_cost 
    FROM public.products
    WHERE id = v_item.product_id AND company_id = v_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'الصنف المحدد غير مسجل في بيانات المنشأة';
    END IF;

    -- تحويل سعر الوحدة إلى العملة الأساس قبل مقارنة حد البيع الأدنى
    IF p_currency_code IS NULL OR p_currency_code = 'SAR' THEN
      v_unit_base := v_item.unit_price;
    ELSE
      SELECT exchange_operator INTO v_exchange_operator
      FROM public.supported_currencies
      WHERE code = p_currency_code
      LIMIT 1;
      v_exchange_operator := COALESCE(v_exchange_operator, 'multiply');
      IF v_exchange_operator = 'divide' AND p_exchange_rate > 0 THEN
        IF p_exchange_rate < 1 THEN
          v_unit_base := v_item.unit_price * p_exchange_rate;
        ELSE
          v_unit_base := v_item.unit_price / p_exchange_rate;
        END IF;
      ELSE
        v_unit_base := v_item.unit_price * p_exchange_rate;
      END IF;
    END IF;

    IF COALESCE(v_user_role, 'viewer') NOT IN ('owner', 'admin') AND NOT is_super_admin() THEN
      v_min_allowed_price := v_db_price * 0.7;
      IF v_unit_base < v_min_allowed_price THEN
        RAISE EXCEPTION 'سعر البيع (% ر.س) أقل من الحد الأدنى المسموح به (% ر.س) للصنف "%"',
          ROUND(v_unit_base, 2), ROUND(v_min_allowed_price, 2), COALESCE(v_product_name, v_product_sku);
      END IF;
    END IF;

    IF v_item.tax_rate IS NOT NULL AND (v_item.tax_rate < 0 OR v_item.tax_rate > 100) THEN
      RAISE EXCEPTION 'نسبة الضريبة غير صحيحة (%) للصنف "%"', v_item.tax_rate, COALESCE(v_product_name, v_product_sku);
    END IF;

    v_line_total := GREATEST(0, v_item.quantity * v_item.unit_price - COALESCE(v_item.discount_amount, 0));
    v_total_amount := v_total_amount + v_line_total;
    v_total_discount := v_total_discount + COALESCE(v_item.discount_amount, 0);
    v_total_tax := v_total_tax + COALESCE(v_line_total * v_item.tax_rate / 100, 0);
  END LOOP;

  -- === PHASE 2: GENERATE INVOICE NUMBER ===
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || v_company_id::text || ':sale'));
  v_invoice_number := public.generate_invoice_number(v_company_id, 'sale');

  v_is_cash := coalesce(p_payment_type, 'cash') <> 'credit';
  v_final_total := v_total_amount + v_total_tax;

  -- حساب المبلغ المدفوع الفعلي وحالة الفاتورة
  IF v_is_cash THEN
    v_actual_paid := v_final_total;
    v_status := 'paid';
  ELSE
    v_actual_paid := LEAST(v_final_total, GREATEST(0, COALESCE(p_paid_amount, 0)));
    IF v_actual_paid >= v_final_total THEN
      v_status := 'paid';
    ELSIF v_actual_paid > 0 THEN
      v_status := 'partially_paid';
    ELSE
      v_status := 'posted';
    END IF;
  END IF;

  -- === PHASE 3: CREATE INVOICE AS DRAFT ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, discount_amount, payment_method, payment_account_id, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id, paid_amount
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_final_total, v_total_tax, v_total_discount, p_payment_type, p_payment_account_id,
    'draft', p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id,
    0
  ) RETURNING id INTO v_invoice_id;

  -- === PHASE 4: CREATE INVOICE ITEMS + ATOMIC STOCK UPSERT ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric,
      warehouse_id uuid, cost_price numeric, discount_amount numeric)
  LOOP
    SELECT cost_price INTO v_sale_cost FROM public.products
    WHERE id = v_item.product_id AND company_id = v_company_id;

    v_line_total := GREATEST(0, v_item.quantity * v_item.unit_price - COALESCE(v_item.discount_amount, 0));

    INSERT INTO public.invoice_items (
      invoice_id, product_id, quantity, unit_price, cost_price,
      discount_amount, tax_amount, total, company_id
    ) VALUES (
      v_invoice_id, v_item.product_id, v_item.quantity, v_item.unit_price,
      COALESCE(v_item.cost_price, v_sale_cost, 0),
      COALESCE(v_item.discount_amount, 0),
      COALESCE(round(v_line_total * v_item.tax_rate / 100, 4), 0),
      v_line_total, v_company_id
    );

    INSERT INTO public.product_stock (
      product_id, warehouse_id, quantity, company_id, updated_by, updated_at
    ) VALUES (
      v_item.product_id,
      COALESCE(v_item.warehouse_id, v_warehouse_id),
      -v_item.quantity,
      v_company_id,
      v_user_id,
      now()
    )
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity = product_stock.quantity - v_item.quantity,
      updated_at = now(),
      updated_by = v_user_id;

    INSERT INTO public.inventory_transactions (
      company_id, product_id, warehouse_id, quantity, transaction_type,
      reference_type, reference_id, unit_cost, total_cost, created_by
    ) VALUES (
      v_company_id, v_item.product_id, COALESCE(v_item.warehouse_id, v_warehouse_id),
      -v_item.quantity, 'sales', 'sales_invoice', v_invoice_id,
      COALESCE(v_item.cost_price, v_sale_cost, 0),
      round(v_item.quantity * COALESCE(v_item.cost_price, v_sale_cost, 0), 4),
      v_user_id
    );
  END LOOP;

  -- === PHASE 5: POST INVOICE (Triggers fn_auto_post_invoice_journal with full items & paid_amount) ===
  UPDATE public.invoices
  SET status = v_status,
      paid_amount = v_actual_paid
  WHERE id = v_invoice_id;

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- غلاف التوافق للخلف (11 وسيطاً)
CREATE OR REPLACE FUNCTION public.commit_sales_invoice_v2(
  p_party_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_items jsonb,
  p_payment_type text DEFAULT 'cash'::text,
  p_notes text DEFAULT NULL::text,
  p_currency_code text DEFAULT 'SAR'::text,
  p_exchange_rate numeric DEFAULT 1,
  p_idempotency_key text DEFAULT NULL::text,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_payment_account_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.commit_sales_invoice_v2(
    p_party_id, p_invoice_date, p_due_date, p_items, p_payment_type,
    p_notes, p_currency_code, p_exchange_rate, p_idempotency_key,
    p_branch_id, p_payment_account_id, 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_sales_invoice_v2(uuid, date, date, jsonb, text, text, text, numeric, text, uuid, uuid) TO authenticated;

-- ============================================================
-- 2. تحديث commit_purchase_invoice لدعم p_paid_amount
-- ============================================================
CREATE OR REPLACE FUNCTION public.commit_purchase_invoice(
  p_company_id uuid,
  p_user_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_exchange_rate numeric DEFAULT 1.0,
  p_currency text DEFAULT 'SAR'::text,
  p_issue_date date DEFAULT CURRENT_DATE,
  p_payment_method text DEFAULT 'credit'::text,
  p_payment_account_id uuid DEFAULT NULL::uuid,
  p_notes text DEFAULT NULL::text,
  p_invoice_number text DEFAULT NULL::text,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_due_date date DEFAULT NULL::date,
  p_paid_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_uid                  uuid := auth.uid();
  v_invoice_id           uuid;
  v_gen_number           text;
  v_subtotal             numeric(14,4) := 0;
  v_tax_total            numeric(14,4) := 0;
  v_total                numeric(14,4) := 0;
  v_item                 jsonb;
  v_product              record;
  v_primary_wh_id        uuid;
  v_journal_id           uuid;
  v_qty                  numeric;
  v_unit_cost            numeric;
  v_item_tax             numeric;
  v_item_discount        numeric;
  v_line_total           numeric;
  v_actual_paid          numeric;
  v_status               text;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = v_uid AND ucr.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'تاريخ الفاتورة يقع خارج سنة مالية مفتوحة';
  END IF;

  IF COALESCE(p_exchange_rate, 0) <= 0 THEN
    RAISE EXCEPTION 'سعر الصرف يجب أن يكون أكبر من صفر';
  END IF;

  SELECT id INTO v_primary_wh_id FROM warehouses
  WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id = p_branch_id) AND is_primary=true AND deleted_at IS NULL LIMIT 1;
  IF v_primary_wh_id IS NULL THEN
    SELECT id INTO v_primary_wh_id FROM warehouses
    WHERE company_id=p_company_id AND (p_branch_id IS NULL OR branch_id = p_branch_id) AND deleted_at IS NULL LIMIT 1;
  END IF;
  IF v_primary_wh_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مستودع مُعرَّف للشركة/الفرع';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM accounts WHERE company_id=p_company_id AND code='2100') THEN
    RAISE EXCEPTION 'حساب الدائنين (2100) غير موجود';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE company_id=p_company_id AND code='1200') THEN
    RAISE EXCEPTION 'حساب المخزون (1200) غير موجود';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || p_company_id::text || ':purchase'));

  v_gen_number := CASE
    WHEN p_invoice_number IS NOT NULL AND TRIM(p_invoice_number) != ''
    THEN p_invoice_number
    ELSE get_next_invoice_number(p_company_id, 'purchase')
  END;

  INSERT INTO invoices(
    company_id, branch_id, party_id, invoice_number, type, status,
    issue_date, due_date, notes, created_by, currency_code, exchange_rate,
    payment_method, payment_account_id, subtotal, tax_amount, total_amount, paid_amount
  ) VALUES (
    p_company_id, p_branch_id, p_supplier_id, v_gen_number, 'purchase', 'draft',
    p_issue_date, p_due_date, p_notes, v_uid, p_currency, p_exchange_rate,
    p_payment_method, p_payment_account_id, 0, 0, 0, 0
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products
    WHERE id=(v_item->>'product_id')::uuid AND company_id=p_company_id AND deleted_at IS NULL;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'المنتج غير موجود: %', v_item->>'product_id';
    END IF;

    v_qty          := COALESCE((v_item->>'quantity')::numeric, 0);
    v_unit_cost    := COALESCE((v_item->>'unit_cost')::numeric, (v_item->>'unit_price')::numeric, v_product.purchase_price);
    v_item_tax     := COALESCE((v_item->>'tax_amount')::numeric, 0);
    v_item_discount:= COALESCE((v_item->>'discount_amount')::numeric, 0);
    v_line_total   := ROUND((v_qty * v_unit_cost) - v_item_discount + v_item_tax, 4);

    IF v_qty <= 0 THEN RAISE EXCEPTION 'الكمية يجب أن تكون أكبر من صفر'; END IF;

    INSERT INTO invoice_items(
      invoice_id, product_id, description, quantity,
      unit_price, cost_price, discount_amount, tax_amount,
      tax_rate_id, total, company_id
    ) VALUES (
      v_invoice_id, v_product.id, v_product.name_ar, v_qty,
      v_unit_cost, v_unit_cost, v_item_discount, v_item_tax,
      NULLIF(v_item->>'tax_rate_id','')::uuid,
      v_line_total, p_company_id
    );

    INSERT INTO inventory_transactions(
      company_id, product_id, warehouse_id, quantity,
      transaction_type, reference_type, reference_id, created_by,
      unit_cost, total_cost
    ) VALUES (
      p_company_id, v_product.id, v_primary_wh_id, v_qty,
      'purchase', 'invoice', v_invoice_id, v_uid,
      v_unit_cost, ROUND(v_qty * v_unit_cost, 4)
    );

    v_subtotal  := v_subtotal  + ROUND(v_qty * v_unit_cost - v_item_discount, 4);
    v_tax_total := v_tax_total + v_item_tax;
  END LOOP;

  v_total := v_subtotal + v_tax_total;

  IF COALESCE(p_payment_method,'credit') <> 'credit' THEN
    v_actual_paid := v_total;
    v_status := 'posted';
  ELSE
    v_actual_paid := LEAST(v_total, GREATEST(0, COALESCE(p_paid_amount, 0)));
    IF v_actual_paid >= v_total THEN
      v_status := 'posted';
    ELSIF v_actual_paid > 0 THEN
      v_status := 'partially_paid';
    ELSE
      v_status := 'posted';
    END IF;
  END IF;

  UPDATE invoices
  SET subtotal = v_subtotal,
      tax_amount = v_tax_total,
      total_amount = v_total,
      paid_amount = v_actual_paid,
      status = v_status
  WHERE id = v_invoice_id;

  SELECT je.id INTO v_journal_id
  FROM journal_entries je
  WHERE je.reference_id = v_invoice_id
    AND je.reference_type = 'purchase_invoice'
    AND je.deleted_at IS NULL
  LIMIT 1;

  IF v_journal_id IS NULL THEN
    RAISE EXCEPTION 'فشل الترحيل المحاسبي التلقائي لفاتورة الشراء % - لم يُنشأ أي قيد', v_gen_number;
  END IF;

  RETURN jsonb_build_object(
    'id',             v_invoice_id,
    'invoice_number', v_gen_number,
    'total_amount',   v_total,
    'tax_amount',     v_tax_total,
    'currency',       p_currency,
    'exchange_rate',  p_exchange_rate,
    'status',         v_status
  );
END;
$function$;

-- غلاف التوافق للخلف (13 وسيطاً)
CREATE OR REPLACE FUNCTION public.commit_purchase_invoice(
  p_company_id uuid,
  p_user_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_exchange_rate numeric DEFAULT 1.0,
  p_currency text DEFAULT 'SAR'::text,
  p_issue_date date DEFAULT CURRENT_DATE,
  p_payment_method text DEFAULT 'credit'::text,
  p_payment_account_id uuid DEFAULT NULL::uuid,
  p_notes text DEFAULT NULL::text,
  p_invoice_number text DEFAULT NULL::text,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_due_date date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN public.commit_purchase_invoice(
    p_company_id, p_user_id, p_supplier_id, p_items, p_exchange_rate,
    p_currency, p_issue_date, p_payment_method, p_payment_account_id,
    p_notes, p_invoice_number, p_branch_id, p_due_date, 0
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date) TO authenticated;

-- ============================================================
-- 3. تحديث fn_auto_post_invoice_journal لدعم الدفع الجزئي
--    (توزيع القيود بين الصندوق والذمم AR/AP بدقة متوازنة 100%)
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
  -- مبالغ الدفع الجزئي
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

  -- تحويل العملة الأساس SAR
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

  -- تحديد حساب الصندوق المالي
  IF new.payment_method IS NULL OR (COALESCE(new.payment_method, 'credit') = 'credit' AND COALESCE(new.paid_amount, 0) <= 0) THEN
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

    -- هل الفاتورة آجلة مع دفعة مقدمة جزئية؟
    IF COALESCE(new.payment_method, 'credit') = 'credit' AND COALESCE(new.paid_amount, 0) > 0 AND new.paid_amount < new.total_amount THEN
      v_paid_foreign   := LEAST(new.total_amount, GREATEST(0, new.paid_amount));
      v_unpaid_foreign := new.total_amount - v_paid_foreign;
      v_base_paid      := ROUND(v_base_net_receivable * (v_paid_foreign / new.total_amount), 4);
      v_base_unpaid    := v_base_net_receivable - v_base_paid;

      -- Dr 1: الصندوق النقدي للدفعة المقدمة
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ar), new.company_id, new.branch_id, v_base_paid, 0, v_paid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              'دفعة نقدية مقدمة - فاتورة ' || COALESCE(new.invoice_number, ''), NULL);

      -- Dr 2: حساب الذمم (AR) للمبلغ المتبقي الآجل (party_id strictly on AR)
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_ar, new.company_id, new.branch_id, v_base_unpaid, 0, v_unpaid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              'متبقي آجل - فاتورة ' || COALESCE(new.invoice_number, ''), new.party_id);
    ELSE
      -- سداد كامل نقدي أو آجل بالكامل
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ar), new.company_id, new.branch_id, v_base_net_receivable, 0, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_acc_funding IS NULL THEN 'مدينون - ' ELSE 'مقبوضات نقدية - ' end || COALESCE(new.invoice_number, ''),
              CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);
    END IF;

    -- Cr Revenue
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_revenue, new.company_id, new.branch_id, 0, v_base_net_amount, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'إيراد مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

    -- Cr Tax
    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, 0, v_base_tax, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'ضريبة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    -- Auto COGS lines
    IF v_total_cogs > 0 AND v_acc_cogs IS NOT NULL AND v_acc_inventory IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_cogs, new.company_id, new.branch_id, v_total_cogs, 0, NULL, 'SAR', 1,
              'تكلفة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

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

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_revenue, new.company_id, new.branch_id, v_base_net_amount, 0, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'مردود مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);

    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, v_base_tax, 0, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'استرداد ضريبة مبيعات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ar), new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
            CASE WHEN v_acc_funding IS NULL THEN 'مردودات ذمم عملاء - ' ELSE 'مستردات نقدية للعميل - ' end || COALESCE(new.invoice_number, ''),
            CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);

    IF v_total_cogs > 0 AND v_acc_cogs IS NOT NULL AND v_acc_inventory IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_total_cogs, 0, NULL, 'SAR', 1,
              'استرجاع مخزون مردودات - ' || COALESCE(new.invoice_number, ''), NULL);

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

    -- Dr المخزون
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
    VALUES (v_je_id, v_acc_inventory, new.company_id, new.branch_id, v_base_net_amount, 0, v_net_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
            'مخزون مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);

    -- Dr الضريبة
    IF COALESCE(new.tax_amount, 0) <> 0 THEN
      IF v_acc_vat IS NULL THEN
        RAISE EXCEPTION 'auto_post_failed: حساب الضريبة (2200) غير موجود للشركة %', new.company_id;
      END IF;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_vat, new.company_id, new.branch_id, v_base_tax, 0, new.tax_amount, new.currency_code, COALESCE(new.exchange_rate, 1), 
              'ضريبة مشتريات - ' || COALESCE(new.invoice_number, ''), NULL);
    END IF;

    -- هل الفاتورة آجلة مع دفعة مقدمة جزئية؟
    IF COALESCE(new.payment_method, 'credit') = 'credit' AND COALESCE(new.paid_amount, 0) > 0 AND new.paid_amount < new.total_amount THEN
      v_paid_foreign   := LEAST(new.total_amount, GREATEST(0, new.paid_amount));
      v_unpaid_foreign := new.total_amount - v_paid_foreign;
      v_base_paid      := ROUND(v_base_net_receivable * (v_paid_foreign / new.total_amount), 4);
      v_base_unpaid    := v_base_net_receivable - v_base_paid;

      -- Cr 1: الصندوق النقدي للدفعة المسددة للمورد
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ap), new.company_id, new.branch_id, 0, v_base_paid, v_paid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              'دفعة نقدية مسددة للمورد - فاتورة ' || COALESCE(new.invoice_number, ''), NULL);

      -- Cr 2: حساب الذمم (AP) للمبلغ المتبقي الآجل (party_id strictly on AP)
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, v_acc_ap, new.company_id, new.branch_id, 0, v_base_unpaid, v_unpaid_foreign, new.currency_code, COALESCE(new.exchange_rate, 1),
              'متبقي آجل للمورد - فاتورة ' || COALESCE(new.invoice_number, ''), new.party_id);
    ELSE
      -- سداد كامل نقدي أو آجل بالكامل
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, company_id, branch_id, debit_amount, credit_amount, foreign_amount, currency_code, exchange_rate, description, party_id)
      VALUES (v_je_id, COALESCE(v_acc_funding, v_acc_ap), new.company_id, new.branch_id, 0, v_base_net_receivable, v_net_receivable, new.currency_code, COALESCE(new.exchange_rate, 1),
              CASE WHEN v_acc_funding IS NULL THEN 'دائنون - ' ELSE 'مدفوعات نقدية لمورد - ' end || COALESCE(new.invoice_number, ''),
              CASE WHEN v_acc_funding IS NULL THEN new.party_id ELSE NULL END);
    END IF;

  -- =========================================================================
  -- 4) PURCHASE RETURN (مردود مشتريات)
  -- =========================================================================
  ELSIF new.type IN ('purchase_return', 'return_purchase') THEN
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

  RETURN new;
END;
$function$;
