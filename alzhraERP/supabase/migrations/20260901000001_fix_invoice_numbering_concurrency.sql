-- Migration: 20260901000001_fix_invoice_numbering_concurrency.sql
-- Description: Adds advisory transaction locks on invoice number generation across sales and purchases
-- to prevent concurrency race conditions and unique key collision errors (23505) under simultaneous checkouts.

-- 1. Hardened get_next_invoice_number with advisory lock per company & type
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_company_id uuid, p_type text DEFAULT 'sale'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next bigint;
BEGIN
  -- Advisory lock per company & type to guarantee atomic sequencing
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || p_company_id::text || ':' || COALESCE(p_type, 'sale')));

  SELECT COALESCE(MAX(NULLIF(invoice_number, '')::bigint), 0) + 1
  INTO v_next
  FROM public.invoices
  WHERE company_id = p_company_id AND type = p_type;
  
  RETURN v_next::text;
END;
$function$;

-- 2. Hardened commit_sales_invoice_v2 with advisory lock
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
  v_min_allowed_price numeric;
  v_line_total numeric;
  v_total_amount numeric := 0;
  v_total_tax numeric := 0;
  v_warehouse_id uuid;
  v_stock_record record;
  v_party_name text;
  v_is_cash boolean;
BEGIN
  -- === AUTHENTICATION ===
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT company_id INTO v_company_id FROM public.user_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company' USING ERRCODE = '42501';
  END IF;

  -- === IDEMPOTENCY CHECK ===
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_invoice_id FROM public.invoices
    WHERE company_id = v_company_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_invoice_id;
    END IF;
  END IF;

  -- === VALIDATION: Items must exist ===
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invoice must have at least one item';
  END IF;

  -- === GET DEFAULT WAREHOUSE ===
  SELECT id INTO v_warehouse_id FROM public.warehouses
  WHERE company_id = v_company_id AND is_primary = true AND deleted_at IS NULL
  LIMIT 1;

  -- === GET PARTY NAME ===
  IF p_party_id IS NOT NULL THEN
    SELECT name INTO v_party_name FROM public.parties WHERE id = p_party_id AND company_id = v_company_id;
  END IF;

  -- === PHASE 1: VALIDATE STOCK + PRICES WITH ROW LOCKS (SORTED TO PREVENT DEADLOCKS) ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric, warehouse_id uuid)
  LOOP
    -- Validate quantity
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity (%) for product %', v_item.quantity, v_item.product_id;
    END IF;

    -- Get DB price for validation
    SELECT sale_price INTO v_db_price FROM public.products
    WHERE id = v_item.product_id AND company_id = v_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found in company', v_item.product_id;
    END IF;

    -- === PRICE VALIDATION (C4) ===
    -- Cannot sell below 70% of sale_price
    v_min_allowed_price := v_db_price * 0.7;
    IF v_item.unit_price < v_min_allowed_price THEN
      RAISE EXCEPTION 'Price (%) below minimum allowed (%) for product %',
        v_item.unit_price, v_min_allowed_price, v_item.product_id;
    END IF;

    -- Validate tax rate
    IF v_item.tax_rate < 0 OR v_item.tax_rate > 100 THEN
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

    -- Calculate totals (within the locked context)
    v_line_total := v_item.quantity * v_item.unit_price;
    v_total_amount := v_total_amount + v_line_total;
    v_total_tax := v_total_tax + COALESCE(v_line_total * v_item.tax_rate / 100, 0);
  END LOOP;

  -- === PHASE 2: GENERATE INVOICE NUMBER (ADVISORY-LOCKED PER COMPANY) ===
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || v_company_id::text || ':sale'));

  SELECT COALESCE('INV-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' ||
    lpad((COUNT(*) + 1)::text, 4, '0'), 'INV-0001') INTO v_invoice_number
  FROM public.invoices
  WHERE company_id = v_company_id
    AND issue_date BETWEEN date_trunc('year', CURRENT_DATE) AND CURRENT_DATE + INTERVAL '1 day';

  v_is_cash := coalesce(p_payment_type, 'cash') <> 'credit';

  -- === PHASE 3: CREATE INVOICE ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, payment_method, payment_account_id, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id, paid_amount
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_total_amount + v_total_tax, v_total_tax, p_payment_type, p_payment_account_id,
    CASE WHEN v_is_cash THEN 'paid' ELSE 'posted' END, p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id,
    CASE WHEN v_is_cash THEN v_total_amount + v_total_tax ELSE 0 END
  ) RETURNING id INTO v_invoice_id;

  -- === PHASE 4: CREATE INVOICE ITEMS + DEDUCT STOCK ===
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS
    x(product_id uuid, quantity numeric, unit_price numeric, tax_rate numeric, warehouse_id uuid)
  LOOP
    v_line_total := v_item.quantity * v_item.unit_price;

    -- Insert invoice item
    INSERT INTO public.invoice_items (
      invoice_id, product_id, quantity, unit_price, total, tax_amount, company_id
    ) VALUES (
      v_invoice_id, v_item.product_id, v_item.quantity, v_item.unit_price,
      v_line_total, round(v_line_total * v_item.tax_rate / 100, 4), v_company_id
    );

    -- Deduct stock (row already locked from Phase 1)
    UPDATE public.product_stock
    SET quantity = quantity - v_item.quantity, updated_at = now()
    WHERE product_id = v_item.product_id
      AND warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND company_id = v_company_id;

    -- Record inventory movement
    INSERT INTO public.inventory_transactions (
      company_id, product_id, warehouse_id, quantity, transaction_type,
      reference_type, reference_id, unit_cost, total_cost, created_by
    ) VALUES (
      v_company_id, v_item.product_id, COALESCE(v_item.warehouse_id, v_warehouse_id),
      -v_item.quantity, 'sales', 'sales_invoice', v_invoice_id,
      v_item.unit_price, v_line_total, v_user_id
    );
  END LOOP;

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;

-- 3. Hardened commit_purchase_invoice with advisory lock
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

  -- Advisory lock for purchase numbering
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

  UPDATE invoices
  SET subtotal=v_subtotal, tax_amount=v_tax_total, total_amount=v_total,
      paid_amount = CASE WHEN COALESCE(p_payment_method,'credit') <> 'credit' THEN v_total ELSE paid_amount END
  WHERE id=v_invoice_id;

  UPDATE invoices SET status = 'posted' WHERE id = v_invoice_id;

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
    'id',           v_invoice_id,
    'invoice_number', v_gen_number,
    'total_amount', v_total,
    'tax_amount',   v_tax_total,
    'currency',     p_currency,
    'exchange_rate', p_exchange_rate,
    'status',       'posted'
  );
END;
$function$;
