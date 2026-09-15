-- Migration: 20260914004000_audit_and_harden_branch_invoices.sql
-- Description: Audit and hardening for invoices at Branch "Wael Al-Nazari" and cross-branch integrity:
-- 1. Sets branch code 'WN' for فرع وائل النظاري and ensures fallback codes for all branches.
-- 2. Upgrades generate_invoice_number with intelligent fallback branch code.
-- 3. Hardens commit_sales_invoice_v2 to pass p_branch_id to generate_invoice_number.
-- 4. Ensures convert_quotation_to_invoice retains quotation branch_id and passes it to numbering.
-- 5. Ensures process_sales_return inherits branch_id from the original invoice.

-- 1. Initialize branch code for "فرع وائل النظاري" (Main Branch) and all existing branches
UPDATE public.branches
SET code = 'WN'
WHERE id = '93fe776f-c072-42b9-98ea-aac2fdb0f4bf' AND (code IS NULL OR code = '');

UPDATE public.branches
SET code = CASE WHEN is_main THEN 'MAIN' ELSE 'B' || UPPER(SUBSTRING(id::text, 1, 4)) END
WHERE code IS NULL OR code = '';

-- 2. Upgraded generate_invoice_number with fallback code logic
CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_company_id uuid,
  p_type text,
  p_branch_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_count  bigint;
  v_branch_code text := '';
  v_lock_key text;
BEGIN
  v_prefix := CASE p_type
    WHEN 'sale'             THEN 'INV'
    WHEN 'purchase'         THEN 'PUR'
    WHEN 'sale_return'      THEN 'RET'
    WHEN 'purchase_return'  THEN 'RPR'
    ELSE                         'DOC'
  END;

  IF p_branch_id IS NOT NULL THEN
    SELECT code INTO v_branch_code FROM branches WHERE id = p_branch_id AND company_id = p_company_id;
    IF v_branch_code IS NULL OR v_branch_code = '' THEN
      SELECT CASE WHEN is_main THEN 'WN' ELSE 'B' || UPPER(SUBSTRING(id::text, 1, 4)) END
      INTO v_branch_code FROM branches WHERE id = p_branch_id;
    END IF;

    IF v_branch_code IS NOT NULL AND v_branch_code <> '' THEN
      v_prefix := v_prefix || '-' || v_branch_code;
    END IF;
    v_lock_key := p_company_id::text || p_type || p_branch_id::text;
  ELSE
    v_lock_key := p_company_id::text || p_type;
  END IF;

  -- Advisory lock to prevent invoice number race conditions
  PERFORM pg_advisory_xact_lock(hashtext(v_lock_key));

  IF p_branch_id IS NOT NULL THEN
    SELECT COUNT(*) + 1 INTO v_count
    FROM invoices
    WHERE company_id = p_company_id AND branch_id = p_branch_id AND type = p_type AND deleted_at IS NULL;
  ELSE
    SELECT COUNT(*) + 1 INTO v_count
    FROM invoices
    WHERE company_id = p_company_id AND branch_id IS NULL AND type = p_type AND deleted_at IS NULL;
  END IF;

  RETURN v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD')
         || '-' || LPAD(v_count::text, 4, '0');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(uuid, text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid, text, uuid) TO authenticated, service_role;

-- 3. Hardened commit_sales_invoice_v2 (12-arg primary)
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
  WHERE company_id = v_company_id AND (p_branch_id IS NULL OR branch_id = p_branch_id) AND is_primary = true AND deleted_at IS NULL
  LIMIT 1;

  IF v_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id FROM public.warehouses
    WHERE company_id = v_company_id AND (p_branch_id IS NULL OR branch_id = p_branch_id) AND deleted_at IS NULL
    LIMIT 1;
  END IF;

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

  -- === PHASE 2: GENERATE INVOICE NUMBER (WITH BRANCH ISOLATION) ===
  v_invoice_number := public.generate_invoice_number(v_company_id, 'sale', p_branch_id);

  v_is_cash := coalesce(p_payment_type, 'cash') <> 'credit';
  v_final_total := v_total_amount + v_total_tax;

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

  -- === PHASE 5: POST INVOICE ===
  UPDATE public.invoices
  SET status = v_status,
      paid_amount = v_actual_paid
  WHERE id = v_invoice_id;

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Backward compatibility overload (11-arg)
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

-- 4. Convert Quotation to Invoice: Retain Branch ID
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
  SELECT * INTO v_quot
  FROM quotations
  WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quotation_not_found: %', p_quotation_id;
  END IF;

  IF v_quot.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'quotation_deleted';
  END IF;

  IF v_quot.status IN ('converted','rejected') THEN
    RAISE EXCEPTION 'quotation_already_converted_or_rejected: %', v_quot.status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = v_quot.company_id
      AND ucr.role IN ('owner','admin','accountant','sales')
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  v_inv_type := CASE v_quot.type
    WHEN 'sales'    THEN 'sale'
    WHEN 'purchase' THEN 'purchase'
    ELSE 'sale'
  END;

  v_inv_number := public.generate_invoice_number(v_quot.company_id, v_inv_type, v_quot.branch_id);

  INSERT INTO invoices (
    company_id, party_id, invoice_number, type, status,
    subtotal, discount_amount, tax_amount, total_amount,
    issue_date, due_date, notes, currency_code, exchange_rate,
    branch_id, created_by
  )
  VALUES (
    v_quot.company_id,
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
    v_quot.branch_id,
    auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO invoice_items (
    company_id, invoice_id, product_id, description,
    quantity, unit_price, cost_price, tax_amount, discount_amount, total
  )
  SELECT
    v_quot.company_id,
    v_invoice_id,
    qi.product_id,
    qi.description,
    qi.quantity,
    qi.unit_price,
    COALESCE(p.cost_price, 0),
    COALESCE(qi.tax_amount, 0),
    COALESCE(qi.discount_amount, 0),
    qi.total
  FROM quotation_items qi
  LEFT JOIN products p ON p.id = qi.product_id
  WHERE qi.quotation_id = p_quotation_id;

  UPDATE quotations
  SET status = 'converted',
      updated_at = now()
  WHERE id = p_quotation_id;

  RETURN v_invoice_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.convert_quotation_to_invoice(uuid, date, date, text) TO authenticated;

-- 5. Process Sales Return: Inherit Branch ID
CREATE OR REPLACE FUNCTION public.process_sales_return(
  p_invoice_id uuid,
  p_party_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_return_reason text,
  p_status text,
  p_notes text,
  p_issue_date date,
  p_currency_code text,
  p_exchange_rate numeric,
  p_company_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_return_invoice_id UUID;
  v_invoice_number    TEXT;
  v_branch_id         UUID;
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
  v_base_total_amount NUMERIC;
  v_base_cost_total   NUMERIC;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE company_id = p_company_id
      AND p_issue_date BETWEEN start_date AND end_date
      AND is_closed = false
  ) THEN
    RAISE EXCEPTION 'التاريخ يقع خارج سنة مالية مفتوحة';
  END IF;

  -- Inherit branch_id from original invoice if available
  IF p_invoice_id IS NOT NULL THEN
    SELECT branch_id INTO v_branch_id FROM public.invoices WHERE id = p_invoice_id;
  END IF;

  -- Generate invoice number with branch code
  v_invoice_number := public.generate_invoice_number(p_company_id, 'sale_return', v_branch_id);

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(product_id uuid, quantity numeric, unit_price numeric, cost_price numeric)
  LOOP
    IF COALESCE(v_item.quantity, 0) <= 0 THEN
      RAISE EXCEPTION 'كمية الإرجاع يجب أن تكون أكبر من صفر';
    END IF;

    v_subtotal := v_subtotal + (v_item.quantity * v_item.unit_price);
    v_cost_total := v_cost_total + (v_item.quantity * COALESCE(v_item.cost_price, 0));
  END LOOP;

  v_total_amount := v_subtotal;

  INSERT INTO public.invoices (
    company_id, invoice_number, type, status, party_id,
    issue_date, due_date, total_amount, subtotal,
    tax_amount, discount_amount, notes, payment_method,
    currency_code, exchange_rate, reference_invoice_id,
    return_reason, branch_id, created_by
  ) VALUES (
    p_company_id, v_invoice_number, 'sale_return', 'draft', p_party_id,
    p_issue_date, p_issue_date, v_total_amount, v_subtotal,
    0, 0, p_notes, p_payment_method,
    p_currency_code, p_exchange_rate, p_invoice_id,
    p_return_reason, v_branch_id, p_user_id
  ) RETURNING id INTO v_return_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity,
    unit_price, total, cost_price, tax_amount, company_id
  )
  SELECT
    v_return_invoice_id,
    CASE 
      WHEN (item->>'product_id') IS NOT NULL AND (item->>'product_id') ~ '^[0-9a-fA-F-]{36}$'
      THEN (item->>'product_id')::UUID 
      ELSE NULL 
    END,
    COALESCE((item->>'name'), ''),
    COALESCE((item->>'quantity')::NUMERIC, 0),
    COALESCE((item->>'unit_price')::NUMERIC, 0),
    COALESCE((item->>'quantity')::NUMERIC, 0) * COALESCE((item->>'unit_price')::NUMERIC, 0),
    COALESCE((item->>'cost_price')::NUMERIC, 0),
    0,
    p_company_id
  FROM jsonb_array_elements(p_items) AS item;

  IF p_status = 'posted' THEN
    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE company_id = p_company_id AND (v_branch_id IS NULL OR branch_id = v_branch_id)
    ORDER BY is_primary DESC, created_at ASC
    LIMIT 1;

    FOR v_item IN
      SELECT * FROM jsonb_to_recordset(p_items)
        AS x(product_id uuid, quantity numeric, unit_price numeric, cost_price numeric)
    LOOP
      IF v_item.product_id IS NOT NULL AND v_warehouse_id IS NOT NULL THEN
        PERFORM public.update_stock_atomic(
          p_company_id,
          v_item.product_id,
          v_warehouse_id,
          v_item.quantity
        );

        INSERT INTO public.inventory_transactions (
          company_id, product_id, warehouse_id,
          transaction_type, quantity, unit_cost, total_cost,
          reference_id, reference_type, created_by
        ) VALUES (
          p_company_id, v_item.product_id, v_warehouse_id,
          'in', v_item.quantity, COALESCE(v_item.cost_price, 0),
          v_item.quantity * COALESCE(v_item.cost_price, 0),
          v_return_invoice_id, 'sale_return', p_user_id
        );
      END IF;
    END LOOP;

    UPDATE public.invoices
    SET status = 'posted'
    WHERE id = v_return_invoice_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'return_invoice_id', v_return_invoice_id,
    'invoice_number', v_invoice_number,
    'total_amount', v_total_amount,
    'branch_id', v_branch_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_sales_return(uuid, uuid, text, jsonb, text, text, text, date, text, numeric, uuid, uuid) TO authenticated;
