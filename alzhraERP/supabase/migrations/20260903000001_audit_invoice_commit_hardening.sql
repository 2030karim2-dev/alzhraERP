-- ============================================================
-- Migration: 20260903000001_audit_invoice_commit_hardening.sql
-- ------------------------------------------------------------
-- [AUDIT-FIX] إصلاحات خادمية اختيارية لا تغيّر توقيعات الدوال إطلاقاً،
-- لذا تبقى الواجهة الحالية تعمل حتى لو لم يُطبَّق هذا الملف.
-- ============================================================

-- ============================================================
-- 1) get_next_invoice_number — إصلاح انهيار ::bigint
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_company_id uuid, p_type text DEFAULT 'sale'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || p_company_id::text || ':' || COALESCE(p_type, 'sale')));
  SELECT COALESCE(MAX((regexp_match(invoice_number, '\d+$'))[1]::bigint), 0) + 1
  INTO v_next
  FROM public.invoices
  WHERE company_id = p_company_id
    AND type = p_type
    AND deleted_at IS NULL;
  RETURN v_next::text;
END;
$function$;

-- ============================================================
-- 2) get_next_sequence — إضافة فرع 'sale' (كان مفقوداً → '1')
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_next_sequence(p_company_id uuid, p_sequence_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
BEGIN
  CASE p_sequence_name
    WHEN 'invoice' THEN
      SELECT COALESCE(MAX((regexp_match(invoice_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.invoices WHERE company_id = p_company_id AND type = 'sale' AND deleted_at IS NULL;
    WHEN 'sale' THEN
      SELECT COALESCE(MAX((regexp_match(invoice_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.invoices WHERE company_id = p_company_id AND type = 'sale' AND deleted_at IS NULL;
    WHEN 'purchase' THEN
      SELECT COALESCE(MAX((regexp_match(invoice_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.invoices WHERE company_id = p_company_id AND type = 'purchase' AND deleted_at IS NULL;
    WHEN 'expense' THEN
      SELECT COALESCE(MAX((regexp_match(voucher_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.expenses WHERE company_id = p_company_id AND deleted_at IS NULL;
    WHEN 'payment' THEN
      SELECT COALESCE(MAX((regexp_match(payment_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.payments WHERE company_id = p_company_id AND deleted_at IS NULL;
    WHEN 'bond' THEN
      SELECT COALESCE(MAX((regexp_match(payment_number, '\d+$'))[1]::bigint), 0) + 1 INTO v_next
      FROM public.payments WHERE company_id = p_company_id AND deleted_at IS NULL;
    ELSE
      v_next := 1;
  END CASE;
  RETURN v_next::text;
END;
$function$;

-- ============================================================
-- 3) commit_sales_invoice_v2 — توحيد الترقيم + حد البيع بالعملة الأساس
--    + تسجيل تكلفة البضاعة في حركة المخزون + دعم خصم/تكلفة البنود الاختياري
-- ============================================================
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
AS $function$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_item record;
  v_available numeric;
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
  v_stock_record record;
  v_party_name text;
  v_is_cash boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT company_id INTO v_company_id FROM public.user_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_invoice_id FROM public.invoices
    WHERE company_id = v_company_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_invoice_id;
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invoice must have at least one item';
  END IF;

  SELECT id INTO v_warehouse_id FROM public.warehouses
  WHERE company_id = v_company_id AND is_primary = true AND deleted_at IS NULL
  LIMIT 1;

  IF p_party_id IS NOT NULL THEN
    SELECT name INTO v_party_name FROM public.parties WHERE id = p_party_id AND company_id = v_company_id;
  END IF;

  -- === PHASE 1: VALIDATE STOCK + PRICES WITH ROW LOCKS ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric,
      warehouse_id uuid, cost_price numeric, discount_amount numeric)
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity (%) for product %', v_item.quantity, v_item.product_id;
    END IF;

    SELECT sale_price, cost_price INTO v_db_price, v_sale_cost FROM public.products
    WHERE id = v_item.product_id AND company_id = v_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found in company', v_item.product_id;
    END IF;

    -- [AUDIT-FIX] تحويل سعر الوحدة إلى العملة الأساس قبل مقارنة حد البيع الأدنى
    IF p_currency_code IS NULL OR p_currency_code = 'SAR' THEN
      v_unit_base := v_item.unit_price;
    ELSE
      SELECT exchange_operator INTO v_exchange_operator
      FROM public.supported_currencies
      WHERE code = p_currency_code
      LIMIT 1;
      v_exchange_operator := COALESCE(v_exchange_operator, 'multiply');
      IF v_exchange_operator = 'divide' AND p_exchange_rate > 0 THEN
        v_unit_base := v_item.unit_price / p_exchange_rate;
      ELSE
        v_unit_base := v_item.unit_price * p_exchange_rate;
      END IF;
    END IF;

    v_min_allowed_price := v_db_price * 0.7;
    IF v_unit_base < v_min_allowed_price THEN
      RAISE EXCEPTION 'Price (%) below minimum allowed (%) for product %',
        v_item.unit_price, v_min_allowed_price, v_item.product_id;
    END IF;

    IF v_item.tax_rate IS NOT NULL AND (v_item.tax_rate < 0 OR v_item.tax_rate > 100) THEN
      RAISE EXCEPTION 'Invalid tax rate (%) for product %', v_item.tax_rate, v_item.product_id;
    END IF;

    -- === STOCK CHECK WITH ROW LOCK ===
    SELECT ps.quantity, ps.warehouse_id INTO v_stock_record
    FROM public.product_stock ps
    WHERE ps.product_id = v_item.product_id
      AND ps.warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND ps.company_id = v_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No stock record found for product % in warehouse', v_item.product_id;
    END IF;

    v_available := v_stock_record.quantity;

    IF v_available < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
        v_item.product_id, v_available, v_item.quantity;
    END IF;

    -- [AUDIT-FIX] الخصم الاختياري للبند يُطرح من إجمالي السطر (متوافق مع من يرسل خصماً)
    v_line_total := GREATEST(0, v_item.quantity * v_item.unit_price - COALESCE(v_item.discount_amount, 0));
    v_total_amount := v_total_amount + v_line_total;
    v_total_discount := v_total_discount + COALESCE(v_item.discount_amount, 0);
    v_total_tax := v_total_tax + COALESCE(v_line_total * v_item.tax_rate / 100, 0);
  END LOOP;

  -- === PHASE 2: GENERATE INVOICE NUMBER ===
  -- [AUDIT-FIX] توليد الرقم عبر generate_invoice_number الموحّدة (نوع sale فقط)
  -- بدل COUNT(*) لجميع أنواع الفواتير — فتتطابق المعاينة مع الرقم النهائي.
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || v_company_id::text || ':sale'));
  v_invoice_number := public.generate_invoice_number(v_company_id, 'sale');

  v_is_cash := coalesce(p_payment_type, 'cash') <> 'credit';

  -- === PHASE 3: CREATE INVOICE ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, discount_amount, payment_method, payment_account_id, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id, paid_amount
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_total_amount + v_total_tax, v_total_tax, v_total_discount, p_payment_type, p_payment_account_id,
    CASE WHEN v_is_cash THEN 'paid' ELSE 'posted' END, p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id,
    CASE WHEN v_is_cash THEN v_total_amount + v_total_tax ELSE 0 END
  ) RETURNING id INTO v_invoice_id;

  -- === PHASE 4: CREATE INVOICE ITEMS + DEDUCT STOCK ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric,
      warehouse_id uuid, cost_price numeric, discount_amount numeric)
  LOOP
    v_line_total := GREATEST(0, v_item.quantity * v_item.unit_price - COALESCE(v_item.discount_amount, 0));

    -- [AUDIT-FIX] تسجيل cost_price وdiscount_amount في بنود الفاتورة
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

    UPDATE public.product_stock
    SET quantity = quantity - v_item.quantity, updated_at = now()
    WHERE product_id = v_item.product_id
      AND warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND company_id = v_company_id;

    -- [AUDIT-FIX] unit_cost = تكلفة البضاعة الفعلية بدل سعر البيع (COGS صحيح)
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

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;

-- ============================================================
-- 4) commit_purchase_invoice — خصم الشراء ينعكس على تكلفة المخزون
--    (يستخدم pg_get_functiondef فلا يتطلب كتابة الدالة كاملة، ويتخطى بأمان
--     إذا تغيّرت الصيغة الحية في قاعدة البيانات).
-- ============================================================
DO $audit$
DECLARE
  v_oid oid;
  v_def text;
  v_src text;
  v_target text;
BEGIN
  SELECT 'public.commit_purchase_invoice(uuid, uuid, uuid, jsonb, numeric, text, date, text, uuid, text, text, uuid, date)'::regprocedure::oid
  INTO v_oid;

  IF v_oid IS NULL THEN
    RAISE NOTICE 'commit_purchase_invoice not found — skipping purchase cost fix';
    RETURN;
  END IF;

  SELECT pg_get_functiondef(v_oid) INTO v_def;

  -- 1) invoice_items.cost_price تُسجَّل صافية بعد خصم المورد
  v_src := 'v_unit_cost, v_unit_cost, v_item_discount';
  v_target := 'v_unit_cost, (CASE WHEN v_qty > 0 THEN ROUND(GREATEST(0, v_qty * v_unit_cost - v_item_discount) / v_qty, 6) ELSE v_unit_cost END), v_item_discount';
  IF POSITION(v_src IN v_def) > 0 THEN
    v_def := REPLACE(v_def, v_src, v_target);
  END IF;

  -- 2) حركة المخزون تُسجَّل بالتكلفة الصافية بعد الخصم لا القيمة الإجمالية
  v_src := 'v_unit_cost, ROUND(v_qty * v_unit_cost, 4)';
  v_target := '(CASE WHEN v_qty > 0 THEN ROUND(GREATEST(0, v_qty * v_unit_cost - v_item_discount) / v_qty, 6) ELSE v_unit_cost END), ROUND(GREATEST(0, v_qty * v_unit_cost - v_item_discount), 4)';
  IF POSITION(v_src IN v_def) > 0 THEN
    v_def := REPLACE(v_def, v_src, v_target);
  END IF;

  EXECUTE v_def;
END
$audit$;
