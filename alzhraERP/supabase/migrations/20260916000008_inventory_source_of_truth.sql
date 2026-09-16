-- ===============================================================================
-- Migration: Inventory Single Source of Truth (Phase 6)
-- ===============================================================================


CREATE OR REPLACE FUNCTION public.trg_update_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_qty_change   numeric;
  v_company_id   uuid;
BEGIN
  -- NO BYPASS. ALL TRANSACTIONS MUST TRIGGER STOCK UPDATE TO MAINTAIN SOURCE OF TRUTH.
  
  SELECT company_id INTO v_company_id FROM products WHERE id = NEW.product_id;

  v_qty_change := CASE NEW.transaction_type
    WHEN 'purchase'        THEN  ABS(NEW.quantity)
    WHEN 'sales_return'    THEN  ABS(NEW.quantity)
    WHEN 'transfer_in'     THEN  ABS(NEW.quantity)
    WHEN 'adj_in'          THEN  ABS(NEW.quantity)
    WHEN 'initial'         THEN  ABS(NEW.quantity)
    WHEN 'sales'           THEN -ABS(NEW.quantity)
    WHEN 'purchase_return' THEN -ABS(NEW.quantity)
    WHEN 'transfer_out'    THEN -ABS(NEW.quantity)
    WHEN 'adj_out'         THEN -ABS(NEW.quantity)
    WHEN 'adj'             THEN  NEW.quantity
    ELSE 0
  END;

  IF v_qty_change = 0 THEN RETURN NEW; END IF;

  INSERT INTO product_stock(product_id, warehouse_id, quantity, company_id, updated_by)
  VALUES (NEW.product_id, NEW.warehouse_id, v_qty_change, v_company_id, NEW.created_by)
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET
    quantity   = product_stock.quantity + v_qty_change,
    updated_at = now(),
    updated_by = NEW.created_by;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_recalculate_all_stock(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated int := 0;
  v_row     RECORD;
  v_qty     numeric;
BEGIN
  -- فقط للمالك
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'access_denied: يتطلب صلاحية مالك';
  END IF;

  FOR v_row IN
    SELECT DISTINCT product_id, warehouse_id
    FROM inventory_transactions
    WHERE company_id = p_company_id AND deleted_at IS NULL
  LOOP
    SELECT COALESCE(SUM(
      CASE transaction_type
        WHEN 'purchase'        THEN  ABS(quantity)
        WHEN 'sales_return'    THEN  ABS(quantity)
        WHEN 'transfer_in'     THEN  ABS(quantity)
        WHEN 'adj_in'          THEN  ABS(quantity)
        WHEN 'initial'         THEN  ABS(quantity)
        WHEN 'sales'           THEN -ABS(quantity)
        WHEN 'purchase_return' THEN -ABS(quantity)
        WHEN 'transfer_out'    THEN -ABS(quantity)
        WHEN 'adj_out'         THEN -ABS(quantity)
        WHEN 'adj'             THEN  quantity
        ELSE 0
      END
    ), 0) INTO v_qty
    FROM inventory_transactions
    WHERE product_id   = v_row.product_id
      AND warehouse_id = v_row.warehouse_id
      AND company_id   = p_company_id
      AND deleted_at   IS NULL;

-- [REMOVED BY AUDIT]     INSERT INTO product_stock(product_id, warehouse_id, quantity, company_id)
-- [REMOVED BY AUDIT]     VALUES (v_row.product_id, v_row.warehouse_id, GREATEST(0, v_qty), p_company_id)
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET
-- [REMOVED BY AUDIT]       quantity   = GREATEST(0, EXCLUDED.quantity),
-- [REMOVED BY AUDIT]       updated_at = now();

    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'updated_rows', v_updated,
    'company_id',   p_company_id,
    'completed_at', now()
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.assemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component RECORD;
    v_available_qty NUMERIC;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
    END IF;

    -- Process each component
    FOR v_component IN
        SELECT component_product_id, quantity
        FROM product_kit_items
        WHERE kit_product_id = p_kit_product_id
    LOOP
        -- Check stock
        SELECT COALESCE(quantity, 0) INTO v_available_qty
        FROM product_stock
        WHERE product_id = v_component.component_product_id
          AND warehouse_id = p_warehouse_id;

        IF v_available_qty < (v_component.quantity * p_quantity) THEN
            RAISE EXCEPTION 'Insufficient stock for component %: need %, available %',
                v_component.component_product_id,
                v_component.quantity * p_quantity,
                v_available_qty;
        END IF;

        -- Reduce component stock
-- [REMOVED BY AUDIT]         UPDATE product_stock
-- [REMOVED BY AUDIT]         SET quantity = quantity - (v_component.quantity * p_quantity),
-- [REMOVED BY AUDIT]             updated_at = NOW()
-- [REMOVED BY AUDIT]         WHERE product_id = v_component.component_product_id
-- [REMOVED BY AUDIT]           AND warehouse_id = p_warehouse_id;

        -- Log inventory transaction for component
        INSERT INTO inventory_transactions (
            company_id, product_id, warehouse_id, quantity,
            transaction_type, reference_type, reference_id, created_by
        ) VALUES (
            p_company_id, v_component.component_product_id, p_warehouse_id,
            -(v_component.quantity * p_quantity),
            'adj_out', 'kit_assembly', p_kit_product_id, p_user_id
        );
    END LOOP;

    -- Increase kit stock
-- [REMOVED BY AUDIT]     INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
-- [REMOVED BY AUDIT]     VALUES (p_kit_product_id, p_warehouse_id, p_quantity, p_company_id, NOW(), NOW())
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET quantity = product_stock.quantity + p_quantity, updated_at = NOW();

    -- Log inventory transaction for kit
    INSERT INTO inventory_transactions (
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by
    ) VALUES (
        p_company_id, p_kit_product_id, p_warehouse_id, p_quantity,
        'adj_in', 'kit_assembly', p_kit_product_id, p_user_id
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.commit_sales_invoice_v2(p_party_id uuid, p_invoice_date date, p_due_date date, p_items jsonb, p_payment_type text DEFAULT 'cash'::text, p_notes text DEFAULT NULL::text, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_idempotency_key text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
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

  -- === PHASE 1: VALIDATE STOCK + PRICES WITH ROW LOCKS ===
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
    -- Cannot sell below 70% of sale_price (configurable per business rules)
    v_min_allowed_price := v_db_price * 0.7;
    IF v_item.unit_price < v_min_allowed_price THEN
      RAISE EXCEPTION 'Price (%) below minimum allowed (%) for product %',
        v_item.unit_price, v_min_allowed_price, v_item.product_id;
    END IF;

    -- Validate tax rate
    IF v_item.tax_rate < 0 OR v_item.tax_rate > 100 THEN
      RAISE EXCEPTION 'Invalid tax rate (%) for product %', v_item.tax_rate, v_item.product_id;
    END IF;

    -- === STOCK CHECK WITH ROW LOCK (C3 + C9) ===
    -- SELECT ... FOR UPDATE locks the stock row, preventing concurrent modifications
    SELECT ps.quantity, ps.warehouse_id INTO v_stock_record
    FROM public.product_stock ps
    WHERE ps.product_id = v_item.product_id
      AND ps.warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND ps.company_id = v_company_id
    FOR UPDATE;  -- Row-level exclusive lock

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

  -- === PHASE 2: GENERATE INVOICE NUMBER ===
  SELECT COALESCE('INV-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' ||
    lpad((COUNT(*) + 1)::text, 4, '0'), 'INV-0001') INTO v_invoice_number
  FROM public.invoices
  WHERE company_id = v_company_id
    AND issue_date BETWEEN date_trunc('year', CURRENT_DATE) AND CURRENT_DATE + INTERVAL '1 day';

  -- === PHASE 3: CREATE INVOICE ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, payment_method, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_total_amount, v_total_tax, p_payment_type, 'posted', p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id
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
-- [REMOVED BY AUDIT]     UPDATE public.product_stock
-- [REMOVED BY AUDIT]     SET quantity = quantity - v_item.quantity, updated_at = now()
-- [REMOVED BY AUDIT]     WHERE product_id = v_item.product_id
-- [REMOVED BY AUDIT]       AND warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
-- [REMOVED BY AUDIT]       AND company_id = v_company_id;

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

  -- === PHASE 5: UPDATE PARTY BALANCE ===
  -- Party balances are computed (see party_balances_by_currency); no stored column.

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  -- Automatic ROLLBACK of all changes (PostgreSQL transaction)
  RAISE;
END;
$function$

CREATE OR REPLACE FUNCTION public.disassemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component RECORD;
    v_kit_qty NUMERIC;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
    END IF;

    -- Check kit stock
    SELECT COALESCE(quantity, 0) INTO v_kit_qty
    FROM product_stock
    WHERE product_id = p_kit_product_id
      AND warehouse_id = p_warehouse_id;

    IF v_kit_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient kit stock: need %, available %', p_quantity, v_kit_qty;
    END IF;

    -- Reduce kit stock
-- [REMOVED BY AUDIT]     UPDATE product_stock
-- [REMOVED BY AUDIT]     SET quantity = quantity - p_quantity,
-- [REMOVED BY AUDIT]         updated_at = NOW()
-- [REMOVED BY AUDIT]     WHERE product_id = p_kit_product_id
-- [REMOVED BY AUDIT]       AND warehouse_id = p_warehouse_id;

    -- Log inventory transaction for kit removal
    INSERT INTO inventory_transactions (
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by
    ) VALUES (
        p_company_id, p_kit_product_id, p_warehouse_id, -p_quantity,
        'adj_out', 'kit_disassembly', p_kit_product_id, p_user_id
    );

    -- Increase component stock
    FOR v_component IN
        SELECT component_product_id, quantity
        FROM product_kit_items
        WHERE kit_product_id = p_kit_product_id
    LOOP
-- [REMOVED BY AUDIT]         INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
-- [REMOVED BY AUDIT]         VALUES (v_component.component_product_id, p_warehouse_id, v_component.quantity * p_quantity, p_company_id, NOW(), NOW())
-- [REMOVED BY AUDIT]         ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]         DO UPDATE SET quantity = product_stock.quantity + (v_component.quantity * p_quantity), updated_at = NOW();

        -- Log inventory transaction for component return
        INSERT INTO inventory_transactions (
            company_id, product_id, warehouse_id, quantity,
            transaction_type, reference_type, reference_id, created_by
        ) VALUES (
            p_company_id, v_component.component_product_id, p_warehouse_id,
            v_component.quantity * p_quantity,
            'adj_in', 'kit_disassembly', p_kit_product_id, p_user_id
        );
    END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION public.recalculate_product_stock(p_product_id uuid, p_warehouse_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wh         RECORD;
  v_company_id uuid;
  v_qty        numeric;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.products WHERE id = p_product_id;

  FOR v_wh IN
    SELECT DISTINCT warehouse_id FROM public.inventory_transactions
    WHERE product_id    = p_product_id
      AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
      AND deleted_at    IS NULL
  LOOP
    SELECT COALESCE(SUM(
      CASE
        WHEN transaction_type IN ('purchase','sales_return','transfer_in','adj_in','initial') THEN  ABS(quantity)
        WHEN transaction_type IN ('sales','purchase_return','transfer_out','adj_out')         THEN -ABS(quantity)
        WHEN transaction_type = 'adj'                                                         THEN  quantity
        ELSE quantity
      END
    ), 0)
    INTO v_qty
    FROM public.inventory_transactions
    WHERE product_id    = p_product_id
      AND warehouse_id  = v_wh.warehouse_id
      AND deleted_at    IS NULL;

    -- ✅ تضمين company_id
-- [REMOVED BY AUDIT]     INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id)
-- [REMOVED BY AUDIT]     VALUES (p_product_id, v_wh.warehouse_id, v_qty, v_company_id)
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET
-- [REMOVED BY AUDIT]       quantity   = EXCLUDED.quantity,
-- [REMOVED BY AUDIT]       updated_at = now();
  END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION public.recalculate_product_stock_for_warehouse(p_product_id uuid, p_warehouse_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total      numeric;
  v_company_id uuid;
BEGIN
  -- جلب company_id من جدول products (المصدر الموثوق)
  SELECT company_id INTO v_company_id
  FROM public.products WHERE id = p_product_id;

  SELECT COALESCE(SUM(
    CASE transaction_type
      WHEN 'purchase'         THEN  ABS(quantity)
      WHEN 'sales_return'     THEN  ABS(quantity)
      WHEN 'transfer_in'      THEN  ABS(quantity)
      WHEN 'adj_in'           THEN  ABS(quantity)
      WHEN 'initial'          THEN  ABS(quantity)
      WHEN 'sales'            THEN -ABS(quantity)
      WHEN 'purchase_return'  THEN -ABS(quantity)
      WHEN 'transfer_out'     THEN -ABS(quantity)
      WHEN 'adj_out'          THEN -ABS(quantity)
      WHEN 'adj'              THEN  quantity
      ELSE                         quantity
    END
  ), 0)
  INTO v_total
  FROM public.inventory_transactions
  WHERE product_id   = p_product_id
    AND warehouse_id = p_warehouse_id
    AND deleted_at   IS NULL;

  -- ✅ تضمين company_id لمنع NOT NULL violation
-- [REMOVED BY AUDIT]   INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id)
-- [REMOVED BY AUDIT]   VALUES (p_product_id, p_warehouse_id, v_total, v_company_id)
-- [REMOVED BY AUDIT]   ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]   DO UPDATE SET
-- [REMOVED BY AUDIT]     quantity   = EXCLUDED.quantity,
-- [REMOVED BY AUDIT]     updated_at = now();
END;
$function$

CREATE OR REPLACE FUNCTION public.commit_sales_invoice_v2(p_party_id uuid, p_invoice_date date, p_due_date date, p_items jsonb, p_payment_type text DEFAULT 'cash'::text, p_notes text DEFAULT NULL::text, p_currency_code text DEFAULT 'SAR'::text, p_exchange_rate numeric DEFAULT 1, p_idempotency_key text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid, p_payment_account_id uuid DEFAULT NULL::uuid)
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


  -- === PHASE 1: VALIDATE STOCK + PRICES WITH ROW LOCKS ===
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
    -- Cannot sell below 70% of sale_price (configurable per business rules)
    v_min_allowed_price := v_db_price * 0.7;
    IF v_item.unit_price < v_min_allowed_price THEN
      RAISE EXCEPTION 'Price (%) below minimum allowed (%) for product %',
        v_item.unit_price, v_min_allowed_price, v_item.product_id;
    END IF;

    -- Validate tax rate
    IF v_item.tax_rate < 0 OR v_item.tax_rate > 100 THEN
      RAISE EXCEPTION 'Invalid tax rate (%) for product %', v_item.tax_rate, v_item.product_id;
    END IF;

    -- === STOCK CHECK WITH ROW LOCK (C3 + C9) ===
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

  -- === PHASE 2: GENERATE INVOICE NUMBER ===
  SELECT COALESCE('INV-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' ||
    lpad((COUNT(*) + 1)::text, 4, '0'), 'INV-0001') INTO v_invoice_number
  FROM public.invoices
  WHERE company_id = v_company_id
    AND issue_date BETWEEN date_trunc('year', CURRENT_DATE) AND CURRENT_DATE + INTERVAL '1 day';

  -- ⚡ FIX: non-credit sales (cash/bank/transfer/check) are paid on the spot.
  v_is_cash := coalesce(p_payment_type, 'cash') <> 'credit';

  -- === PHASE 3: CREATE INVOICE ===
  -- total_amount is stored GROSS (subtotal + tax), consistent with purchases
  -- and with the chk_invoices_paid_not_exceed_total constraint.
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
-- [REMOVED BY AUDIT]     UPDATE public.product_stock
-- [REMOVED BY AUDIT]     SET quantity = quantity - v_item.quantity, updated_at = now()
-- [REMOVED BY AUDIT]     WHERE product_id = v_item.product_id
-- [REMOVED BY AUDIT]       AND warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
-- [REMOVED BY AUDIT]       AND company_id = v_company_id;

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

  -- === PHASE 5: UPDATE PARTY BALANCE ===
  -- Party balances are computed (see party_balances_by_currency); no stored column.

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  -- Automatic ROLLBACK of all changes (PostgreSQL transaction)
  RAISE;
END;
$function$;

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
-- [REMOVED BY AUDIT]     UPDATE public.product_stock
-- [REMOVED BY AUDIT]     SET quantity = quantity - v_item.quantity, updated_at = now()
-- [REMOVED BY AUDIT]     WHERE product_id = v_item.product_id
-- [REMOVED BY AUDIT]       AND warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
-- [REMOVED BY AUDIT]       AND company_id = v_company_id;

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

CREATE OR REPLACE FUNCTION public.finalize_audit_session(p_session_id uuid, p_user_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_session RECORD;
    v_item JSONB;
    v_new_qty NUMERIC;
    v_current_qty NUMERIC;
    v_diff NUMERIC;
    v_adj_count INT := 0;
    v_product RECORD;
    v_txn_type TEXT;
BEGIN
    SELECT * INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object('status', 'already_completed', 'adjusted', 0);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'counted_quantity') IS NULL OR (v_item->>'product_id') IS NULL THEN
            CONTINUE;
        END IF;

        v_new_qty := GREATEST(0, (v_item->>'counted_quantity')::NUMERIC);

        -- Update audit item row with counted quantity
        UPDATE public.audit_items
        SET counted_quantity = v_new_qty
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        -- Get current stock before update
        SELECT quantity INTO v_current_qty
        FROM public.product_stock
        WHERE product_id = (v_item->>'product_id')::UUID 
          AND warehouse_id = v_session.warehouse_id 
          AND company_id = v_session.company_id
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_qty := 0;
        END IF;

        v_diff := v_new_qty - v_current_qty;

-- [REMOVED BY AUDIT]         -- Update product_stock
-- [REMOVED BY AUDIT]         INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id)
-- [REMOVED BY AUDIT]         VALUES (
-- [REMOVED BY AUDIT]             (v_item->>'product_id')::UUID,
-- [REMOVED BY AUDIT]             v_session.warehouse_id,
-- [REMOVED BY AUDIT]             v_new_qty,
-- [REMOVED BY AUDIT]             v_session.company_id
-- [REMOVED BY AUDIT]         )
-- [REMOVED BY AUDIT]         ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]         DO UPDATE SET quantity = EXCLUDED.quantity;

        -- Record inventory transaction if there was a discrepancy
        IF v_diff <> 0 THEN
            SELECT id, purchase_price, cost_price INTO v_product
            FROM public.products
            WHERE id = (v_item->>'product_id')::UUID;

            v_txn_type := CASE WHEN v_diff > 0 THEN 'adj_in' ELSE 'adj_out' END;

            INSERT INTO public.inventory_transactions (
                company_id,
                product_id,
                warehouse_id,
                quantity,
                unit_cost,
                total_cost,
                transaction_type,
                reference_type,
                reference_id,
                created_by
            ) VALUES (
                v_session.company_id,
                (v_item->>'product_id')::UUID,
                v_session.warehouse_id,
                ABS(v_diff),
                COALESCE(v_product.cost_price, v_product.purchase_price, 0),
                ROUND(ABS(v_diff) * COALESCE(v_product.cost_price, v_product.purchase_price, 0), 4),
                v_txn_type,
                'stock_audit',
                p_session_id,
                p_user_id
            );
        END IF;

        v_adj_count := v_adj_count + 1;
    END LOOP;

    UPDATE public.audit_sessions
    SET status = 'completed',
        completed_at = NOW(),
        completed_by = p_user_id
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'status', 'completed',
        'adjusted', v_adj_count
    );
END;
$function$;

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

-- [REMOVED BY AUDIT]     UPDATE public.product_stock
-- [REMOVED BY AUDIT]     SET quantity = quantity - v_item.quantity, updated_at = now()
-- [REMOVED BY AUDIT]     WHERE product_id = v_item.product_id
-- [REMOVED BY AUDIT]       AND warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
-- [REMOVED BY AUDIT]       AND company_id = v_company_id;

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

CREATE OR REPLACE FUNCTION public.finalize_audit_session(p_session_id uuid, p_user_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_session RECORD;
    v_item JSONB;
    v_new_qty NUMERIC;
    v_current_qty NUMERIC;
    v_diff NUMERIC;
    v_adj_count INT := 0;
    v_product RECORD;
    v_txn_type TEXT;
BEGIN
    SELECT * INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object('status', 'already_completed', 'adjusted', 0);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'counted_quantity') IS NULL OR (v_item->>'product_id') IS NULL THEN
            CONTINUE;
        END IF;

        v_new_qty := GREATEST(0, (v_item->>'counted_quantity')::NUMERIC);

        -- Update audit item row with counted quantity
        UPDATE public.audit_items
        SET counted_quantity = v_new_qty
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        -- Get current stock before update
        SELECT quantity INTO v_current_qty
        FROM public.product_stock
        WHERE product_id = (v_item->>'product_id')::UUID 
          AND warehouse_id = v_session.warehouse_id 
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_qty := 0;
        END IF;

        v_diff := v_new_qty - v_current_qty;

-- [REMOVED BY AUDIT]         -- Update product_stock directly to the actual counted physical quantity
-- [REMOVED BY AUDIT]         INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id, updated_by, updated_at)
-- [REMOVED BY AUDIT]         VALUES (
-- [REMOVED BY AUDIT]             (v_item->>'product_id')::UUID,
-- [REMOVED BY AUDIT]             v_session.warehouse_id,
-- [REMOVED BY AUDIT]             v_new_qty,
-- [REMOVED BY AUDIT]             v_session.company_id,
-- [REMOVED BY AUDIT]             p_user_id,
-- [REMOVED BY AUDIT]             NOW()
-- [REMOVED BY AUDIT]         )
-- [REMOVED BY AUDIT]         ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]         DO UPDATE SET
-- [REMOVED BY AUDIT]             quantity = EXCLUDED.quantity,
-- [REMOVED BY AUDIT]             updated_by = EXCLUDED.updated_by,
-- [REMOVED BY AUDIT]             updated_at = NOW();

        -- Record inventory transaction if there was a discrepancy
        IF v_diff <> 0 THEN
            SELECT id, purchase_price, cost_price INTO v_product
            FROM public.products
            WHERE id = (v_item->>'product_id')::UUID;

            v_txn_type := CASE WHEN v_diff > 0 THEN 'adj_in' ELSE 'adj_out' END;

            INSERT INTO public.inventory_transactions (
                company_id,
                product_id,
                warehouse_id,
                quantity,
                unit_cost,
                total_cost,
                transaction_type,
                reference_type,
                reference_id,
                created_by
            ) VALUES (
                v_session.company_id,
                (v_item->>'product_id')::UUID,
                v_session.warehouse_id,
                ABS(v_diff),
                COALESCE(v_product.cost_price, v_product.purchase_price, 0),
                ROUND(ABS(v_diff) * COALESCE(v_product.cost_price, v_product.purchase_price, 0), 4),
                v_txn_type,
                'stock_audit',
                p_session_id,
                p_user_id
            );
        END IF;

        v_adj_count := v_adj_count + 1;
    END LOOP;

    UPDATE public.audit_sessions
    SET status = 'completed',
        completed_at = NOW(),
        completed_by = p_user_id
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'status', 'completed',
        'adjusted', v_adj_count
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_audit_session(
    p_session_id UUID,
    p_user_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_item JSONB;
    v_new_qty NUMERIC;
    v_current_qty NUMERIC;
    v_diff NUMERIC;
    v_adj_count INT := 0;
    v_product RECORD;
    v_txn_type TEXT;
BEGIN
    SELECT * INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object('status', 'already_completed', 'adjusted', 0);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'counted_quantity') IS NULL OR (v_item->>'product_id') IS NULL THEN
            CONTINUE;
        END IF;

        v_new_qty := GREATEST(0, (v_item->>'counted_quantity')::NUMERIC);

        -- Update audit item row with counted quantity
        UPDATE public.audit_items
        SET counted_quantity = v_new_qty
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        -- Get current stock before update
        SELECT quantity INTO v_current_qty
        FROM public.product_stock
        WHERE product_id = (v_item->>'product_id')::UUID 
          AND warehouse_id = v_session.warehouse_id 
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_qty := 0;
        END IF;

        v_diff := v_new_qty - v_current_qty;

-- [REMOVED BY AUDIT]         -- Update product_stock directly to the actual counted physical quantity
-- [REMOVED BY AUDIT]         INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id, updated_by, updated_at)
-- [REMOVED BY AUDIT]         VALUES (
-- [REMOVED BY AUDIT]             (v_item->>'product_id')::UUID,
-- [REMOVED BY AUDIT]             v_session.warehouse_id,
-- [REMOVED BY AUDIT]             v_new_qty,
-- [REMOVED BY AUDIT]             v_session.company_id,
-- [REMOVED BY AUDIT]             p_user_id,
-- [REMOVED BY AUDIT]             NOW()
-- [REMOVED BY AUDIT]         )
-- [REMOVED BY AUDIT]         ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]         DO UPDATE SET
-- [REMOVED BY AUDIT]             quantity = EXCLUDED.quantity,
-- [REMOVED BY AUDIT]             updated_by = EXCLUDED.updated_by,
-- [REMOVED BY AUDIT]             updated_at = NOW();

        -- Record inventory transaction if there was a discrepancy
        IF v_diff <> 0 THEN
            SELECT id, purchase_price, cost_price INTO v_product
            FROM public.products
            WHERE id = (v_item->>'product_id')::UUID;

            v_txn_type := CASE WHEN v_diff > 0 THEN 'adj_in' ELSE 'adj_out' END;

            INSERT INTO public.inventory_transactions (
                company_id,
                product_id,
                warehouse_id,
                quantity,
                unit_cost,
                total_cost,
                transaction_type,
                reference_type,
                reference_id,
                created_by
            ) VALUES (
                v_session.company_id,
                (v_item->>'product_id')::UUID,
                v_session.warehouse_id,
                ABS(v_diff),
                COALESCE(v_product.cost_price, v_product.purchase_price, 0),
                ROUND(ABS(v_diff) * COALESCE(v_product.cost_price, v_product.purchase_price, 0), 4),
                v_txn_type,
                'stock_audit',
                p_session_id,
                p_user_id
            );
        END IF;

        v_adj_count := v_adj_count + 1;
    END LOOP;

    UPDATE public.audit_sessions
    SET status = 'completed',
        completed_at = NOW(),
        completed_by = p_user_id
    WHERE id = p_session_id;

    -- Clean up draft upon completion so review never restores outdated draft state
    DELETE FROM public.inventory_session_drafts WHERE session_id = p_session_id;

    RETURN jsonb_build_object(
        'status', 'completed',
        'adjusted', v_adj_count
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_audit_session(
    p_session_id UUID,
    p_user_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_session RECORD;
    v_item JSONB;
    v_new_qty NUMERIC;
    v_current_qty NUMERIC;
    v_diff NUMERIC;
    v_adj_count INT := 0;
    v_product RECORD;
    v_txn_type TEXT;
    v_effective_user_id UUID;
BEGIN
    v_effective_user_id := COALESCE(auth.uid(), p_user_id);

    SELECT * INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status <> 'active' THEN
        IF v_session.status = 'completed' THEN
            RETURN jsonb_build_object('status', 'already_completed', 'adjusted', 0);
        ELSE
            RAISE EXCEPTION 'لا يمكن اعتماد جلسة جرد ملغاة أو غير نشطة' USING ERRCODE = '22023';
        END IF;
    END IF;

    -- Tenant isolation & role check
    IF NOT (v_session.company_id IN (SELECT get_auth_companies()) AND user_is_admin_or_manager(v_session.company_id)) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية اعتماد وترحيل الجرد' USING ERRCODE = '42501';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'counted_quantity') IS NULL OR (v_item->>'product_id') IS NULL THEN
            CONTINUE;
        END IF;

        v_new_qty := GREATEST(0, (v_item->>'counted_quantity')::NUMERIC);

        -- Update audit item row with counted quantity
        UPDATE public.audit_items
        SET counted_quantity = v_new_qty
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        -- Get current stock before update
        SELECT quantity INTO v_current_qty
        FROM public.product_stock
        WHERE product_id = (v_item->>'product_id')::UUID 
          AND warehouse_id = v_session.warehouse_id 
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_qty := 0;
        END IF;

        v_diff := v_new_qty - v_current_qty;

-- [REMOVED BY AUDIT]         -- Update product_stock directly to the actual counted physical quantity
-- [REMOVED BY AUDIT]         INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id, updated_by, updated_at)
-- [REMOVED BY AUDIT]         VALUES (
-- [REMOVED BY AUDIT]             (v_item->>'product_id')::UUID,
-- [REMOVED BY AUDIT]             v_session.warehouse_id,
-- [REMOVED BY AUDIT]             v_new_qty,
-- [REMOVED BY AUDIT]             v_session.company_id,
-- [REMOVED BY AUDIT]             v_effective_user_id,
-- [REMOVED BY AUDIT]             NOW()
-- [REMOVED BY AUDIT]         )
-- [REMOVED BY AUDIT]         ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]         DO UPDATE SET
-- [REMOVED BY AUDIT]             quantity = EXCLUDED.quantity,
-- [REMOVED BY AUDIT]             updated_by = EXCLUDED.updated_by,
-- [REMOVED BY AUDIT]             updated_at = NOW();

        -- Record inventory transaction if there was a discrepancy
        IF v_diff <> 0 THEN
            SELECT id, purchase_price, cost_price INTO v_product
            FROM public.products
            WHERE id = (v_item->>'product_id')::UUID;

            v_txn_type := CASE WHEN v_diff > 0 THEN 'adj_in' ELSE 'adj_out' END;

            INSERT INTO public.inventory_transactions (
                company_id,
                product_id,
                warehouse_id,
                quantity,
                unit_cost,
                total_cost,
                transaction_type,
                reference_type,
                reference_id,
                created_by
            ) VALUES (
                v_session.company_id,
                (v_item->>'product_id')::UUID,
                v_session.warehouse_id,
                ABS(v_diff),
                COALESCE(v_product.cost_price, v_product.purchase_price, 0),
                ROUND(ABS(v_diff) * COALESCE(v_product.cost_price, v_product.purchase_price, 0), 4),
                v_txn_type,
                'stock_audit',
                p_session_id,
                v_effective_user_id
            );
        END IF;

        v_adj_count := v_adj_count + 1;
    END LOOP;

    UPDATE public.audit_sessions
    SET status = 'completed',
        completed_at = NOW(),
        completed_by = v_effective_user_id
    WHERE id = p_session_id;

    -- Clean up draft
    DELETE FROM public.inventory_session_drafts WHERE session_id = p_session_id;

    RETURN jsonb_build_object(
        'status', 'completed',
        'adjusted', v_adj_count
    );
END;
$$;

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
  v_user_role text;
  v_invoice_id uuid;
  v_invoice_number text;
  v_item record;
  v_available numeric;
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

  -- دور المستخدم للتحقق من صلاحية تجاوز الأسعار
  SELECT role INTO v_user_role FROM public.user_company_roles 
  WHERE user_id = v_user_id AND company_id = v_company_id LIMIT 1;

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

  -- === PHASE 1: VALIDATE STOCK + PRICES WITH ROW LOCKS ===
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
        v_unit_base := v_item.unit_price / p_exchange_rate;
      ELSE
        v_unit_base := v_item.unit_price * p_exchange_rate;
      END IF;
    END IF;

    -- التحقق من الحد الأدنى لسعر البيع: المالك والمدير ومسؤول النظام يملكون صلاحية البيع بأي سعر
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

    -- === STOCK CHECK WITH ROW LOCK ===
    SELECT ps.quantity, ps.warehouse_id INTO v_stock_record
    FROM public.product_stock ps
    WHERE ps.product_id = v_item.product_id
      AND ps.warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
      AND ps.company_id = v_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_available := 0;
      RAISE EXCEPTION 'الكمية غير متوفرة في المستودع للصنف "%" (الرصيد المتوفر: 0، المطلوب: %)',
        COALESCE(v_product_name, v_product_sku), v_item.quantity;
    ELSE
      v_available := v_stock_record.quantity;
    END IF;

    IF v_available < v_item.quantity THEN
      RAISE EXCEPTION 'الرصيد المتوفر في المستودع غير كافٍ للصنف "%" (المتوفر: %، المطلوب: %)',
        COALESCE(v_product_name, v_product_sku), v_available, v_item.quantity;
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

  -- === PHASE 3: CREATE INVOICE AS DRAFT (To allow items insertion before posting trigger) ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, discount_amount, payment_method, payment_account_id, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id, paid_amount
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_total_amount + v_total_tax, v_total_tax, v_total_discount, p_payment_type, p_payment_account_id,
    'draft', p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id,
    CASE WHEN v_is_cash THEN v_total_amount + v_total_tax ELSE 0 END
  ) RETURNING id INTO v_invoice_id;

  -- === PHASE 4: CREATE INVOICE ITEMS + DEDUCT STOCK ===
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

-- [REMOVED BY AUDIT]     UPDATE public.product_stock
-- [REMOVED BY AUDIT]     SET quantity = quantity - v_item.quantity, updated_at = now()
-- [REMOVED BY AUDIT]     WHERE product_id = v_item.product_id
-- [REMOVED BY AUDIT]       AND warehouse_id = COALESCE(v_item.warehouse_id, v_warehouse_id)
-- [REMOVED BY AUDIT]       AND company_id = v_company_id;

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

  -- === PHASE 5: POST INVOICE (Triggers fn_auto_post_invoice_journal with full items & COGS) ===
  UPDATE public.invoices
  SET status = CASE WHEN v_is_cash THEN 'paid' ELSE 'posted' END
  WHERE id = v_invoice_id;

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;

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
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_user_role text;
  v_invoice_id uuid;
  v_invoice_number text;
  v_item record;
  v_available numeric;
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT company_id INTO v_company_id FROM public.user_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company' USING ERRCODE = '42501';
  END IF;

  -- دور المستخدم للتحقق من صلاحية تجاوز الأسعار
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

  -- === PHASE 1: VALIDATE PRICES & TAX RATES ===
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
        v_unit_base := v_item.unit_price / p_exchange_rate;
      ELSE
        v_unit_base := v_item.unit_price * p_exchange_rate;
      END IF;
    END IF;

    -- التحقق من الحد الأدنى لسعر البيع: المالك والمدير ومسؤول النظام يملكون صلاحية البيع بأي سعر
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

    -- ملاحظة: مسموح بالبيع حتى لو كانت الكمية صفراً أو غير متوفرة أثناء فترة الجرد (Negative Stock Allowed)
    v_line_total := GREATEST(0, v_item.quantity * v_item.unit_price - COALESCE(v_item.discount_amount, 0));
    v_total_amount := v_total_amount + v_line_total;
    v_total_discount := v_total_discount + COALESCE(v_item.discount_amount, 0);
    v_total_tax := v_total_tax + COALESCE(v_line_total * v_item.tax_rate / 100, 0);
  END LOOP;

  -- === PHASE 2: GENERATE INVOICE NUMBER ===
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || v_company_id::text || ':sale'));
  v_invoice_number := public.generate_invoice_number(v_company_id, 'sale');

  v_is_cash := coalesce(p_payment_type, 'cash') <> 'credit';

  -- === PHASE 3: CREATE INVOICE AS DRAFT (Initial paid_amount is 0 to avoid check constraint conflict with update_invoice_totals_from_items trigger) ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    total_amount, tax_amount, discount_amount, payment_method, payment_account_id, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id, paid_amount
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_total_amount + v_total_tax, v_total_tax, v_total_discount, p_payment_type, p_payment_account_id,
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

    -- تحديث المخزون بالخصم أو إنشاؤه بالسالب إذا لم يكن الصنف مسجلاً في المستودع
-- [REMOVED BY AUDIT]     INSERT INTO public.product_stock (
-- [REMOVED BY AUDIT]       product_id, warehouse_id, quantity, company_id, updated_by, updated_at
-- [REMOVED BY AUDIT]     ) VALUES (
-- [REMOVED BY AUDIT]       v_item.product_id,
-- [REMOVED BY AUDIT]       COALESCE(v_item.warehouse_id, v_warehouse_id),
-- [REMOVED BY AUDIT]       -v_item.quantity,
-- [REMOVED BY AUDIT]       v_company_id,
-- [REMOVED BY AUDIT]       v_user_id,
-- [REMOVED BY AUDIT]       now()
-- [REMOVED BY AUDIT]     )
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET
-- [REMOVED BY AUDIT]       quantity = product_stock.quantity - v_item.quantity,
-- [REMOVED BY AUDIT]       updated_at = now(),
-- [REMOVED BY AUDIT]       updated_by = v_user_id;

    -- تسجيل حركة المخزون
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

  -- === PHASE 5: POST INVOICE (Triggers fn_auto_post_invoice_journal with full items & COGS) ===
  UPDATE public.invoices
  SET status = CASE WHEN v_is_cash THEN 'paid' ELSE 'posted' END,
      paid_amount = CASE WHEN v_is_cash THEN total_amount ELSE 0 END
  WHERE id = v_invoice_id;

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

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

-- [REMOVED BY AUDIT]     INSERT INTO public.product_stock (
-- [REMOVED BY AUDIT]       product_id, warehouse_id, quantity, company_id, updated_by, updated_at
-- [REMOVED BY AUDIT]     ) VALUES (
-- [REMOVED BY AUDIT]       v_item.product_id,
-- [REMOVED BY AUDIT]       COALESCE(v_item.warehouse_id, v_warehouse_id),
-- [REMOVED BY AUDIT]       -v_item.quantity,
-- [REMOVED BY AUDIT]       v_company_id,
-- [REMOVED BY AUDIT]       v_user_id,
-- [REMOVED BY AUDIT]       now()
-- [REMOVED BY AUDIT]     )
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET
-- [REMOVED BY AUDIT]       quantity = product_stock.quantity - v_item.quantity,
-- [REMOVED BY AUDIT]       updated_at = now(),
-- [REMOVED BY AUDIT]       updated_by = v_user_id;

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

CREATE OR REPLACE FUNCTION public.finalize_audit_session(
    p_session_id UUID,
    p_user_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_session RECORD;
    v_item JSONB;
    v_new_qty NUMERIC;
    v_raw_qty NUMERIC;
    v_current_qty NUMERIC;
    v_diff NUMERIC;
    v_adj_count INT := 0;
    v_product RECORD;
    v_txn_type TEXT;
    v_effective_user_id UUID;
BEGIN
    v_effective_user_id := COALESCE(auth.uid(), p_user_id);

    IF v_effective_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'جلسة الجرد غير موجودة' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status <> 'active' THEN
        IF v_session.status = 'completed' THEN
            RETURN jsonb_build_object('status', 'already_completed', 'adjusted', 0);
        ELSE
            RAISE EXCEPTION 'لا يمكن اعتماد جلسة جرد ملغاة أو غير نشطة' USING ERRCODE = '22023';
        END IF;
    END IF;

    -- Tenant isolation & role check
    IF NOT (v_session.company_id IN (SELECT get_auth_companies()) AND user_is_admin_or_manager(v_session.company_id)) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية اعتماد وترحيل الجرد' USING ERRCODE = '42501';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'counted_quantity') IS NULL OR (v_item->>'product_id') IS NULL THEN
            CONTINUE;
        END IF;

        v_raw_qty := (v_item->>'counted_quantity')::NUMERIC;

        -- [SEC-FIX] رفض الكميات غير المنطقية بدلاً من كتمها بصمت
        IF v_raw_qty IS NULL
           OR v_raw_qty = 'NaN'::NUMERIC
           OR v_raw_qty = 'Infinity'::NUMERIC
           OR v_raw_qty = '-Infinity'::NUMERIC THEN
            RAISE EXCEPTION 'كمية الجرد غير صالحة للمنتج %', (v_item->>'product_id') USING ERRCODE = '22023';
        END IF;

        IF v_raw_qty < 0 THEN
            RAISE EXCEPTION 'لا يمكن أن تكون الكمية المجردة سالبة' USING ERRCODE = '22023';
        END IF;

        -- [SEC-FIX] المنتج يجب أن يكون مرصوداً فعلياً في بنود الجلسة.
        -- بدون هذا الفحص كان العميل يستطيع تعديل مخزون أي منتج (حتى من منشأة أخرى)
        -- بتمريره داخل p_items دون وجوده في audit_items.
        SELECT id INTO v_product
        FROM public.audit_items
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'المنتج % غير مرصود في بنود جلسة الجرد', (v_item->>'product_id') USING ERRCODE = '22023';
        END IF;

        SELECT id INTO v_product
        FROM public.products
        WHERE id = (v_item->>'product_id')::UUID
          AND company_id = v_session.company_id
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'المنتج غير موجود أو لا ينتمي لمنشأة جلسة الجرد' USING ERRCODE = '22023';
        END IF;

        v_new_qty := v_raw_qty;

        -- Update audit item row with counted quantity
        UPDATE public.audit_items
        SET counted_quantity = v_new_qty
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        -- Get current stock before update
        SELECT quantity INTO v_current_qty
        FROM public.product_stock
        WHERE product_id = (v_item->>'product_id')::UUID
          AND warehouse_id = v_session.warehouse_id
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_qty := 0;
        END IF;

        v_diff := v_new_qty - v_current_qty;

-- [REMOVED BY AUDIT]         -- Update product_stock directly to the actual counted physical quantity
-- [REMOVED BY AUDIT]         INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id, updated_by, updated_at)
-- [REMOVED BY AUDIT]         VALUES (
-- [REMOVED BY AUDIT]             (v_item->>'product_id')::UUID,
-- [REMOVED BY AUDIT]             v_session.warehouse_id,
-- [REMOVED BY AUDIT]             v_new_qty,
-- [REMOVED BY AUDIT]             v_session.company_id,
-- [REMOVED BY AUDIT]             v_effective_user_id,
-- [REMOVED BY AUDIT]             NOW()
-- [REMOVED BY AUDIT]         )
-- [REMOVED BY AUDIT]         ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]         DO UPDATE SET
-- [REMOVED BY AUDIT]             quantity = EXCLUDED.quantity,
-- [REMOVED BY AUDIT]             updated_by = EXCLUDED.updated_by,
-- [REMOVED BY AUDIT]             updated_at = NOW();

        -- Record inventory transaction if there was a discrepancy
        IF v_diff <> 0 THEN
            SELECT id, purchase_price, cost_price INTO v_product
            FROM public.products
            WHERE id = (v_item->>'product_id')::UUID;

            v_txn_type := CASE WHEN v_diff > 0 THEN 'adj_in' ELSE 'adj_out' END;

            INSERT INTO public.inventory_transactions (
                company_id,
                product_id,
                warehouse_id,
                quantity,
                unit_cost,
                total_cost,
                transaction_type,
                reference_type,
                reference_id,
                created_by
            ) VALUES (
                v_session.company_id,
                (v_item->>'product_id')::UUID,
                v_session.warehouse_id,
                ABS(v_diff),
                COALESCE(v_product.cost_price, v_product.purchase_price, 0),
                ROUND(ABS(v_diff) * COALESCE(v_product.cost_price, v_product.purchase_price, 0), 4),
                v_txn_type,
                'stock_audit',
                p_session_id,
                v_effective_user_id
            );
        END IF;

        v_adj_count := v_adj_count + 1;
    END LOOP;

    UPDATE public.audit_sessions
    SET status = 'completed',
        completed_at = NOW(),
        completed_by = v_effective_user_id
    WHERE id = p_session_id;

    -- Clean up draft
    DELETE FROM public.inventory_session_drafts WHERE session_id = p_session_id;

    RETURN jsonb_build_object(
        'status', 'completed',
        'adjusted', v_adj_count
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_audit_session(
    p_session_id UUID,
    p_user_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_session RECORD;
    v_item JSONB;
    v_new_qty NUMERIC;
    v_raw_qty NUMERIC;
    v_current_qty NUMERIC;
    v_diff NUMERIC;
    v_adj_count INT := 0;
    v_product RECORD;
    v_txn_type TEXT;
    v_effective_user_id UUID;
BEGIN
    -- [SEC-FIX] الهوية من الخادم فقط: p_user_id من العميل يُتجاهل (التوقيع محفوظ للتوافق)
    v_effective_user_id := auth.uid();

    IF v_effective_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'جلسة الجرد غير موجودة' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status <> 'active' THEN
        IF v_session.status = 'completed' THEN
            RETURN jsonb_build_object('status', 'already_completed', 'adjusted', 0);
        ELSE
            RAISE EXCEPTION 'لا يمكن اعتماد جلسة جرد ملغاة أو غير نشطة' USING ERRCODE = '22023';
        END IF;
    END IF;

    -- Tenant isolation & role check
    IF NOT (v_session.company_id IN (SELECT get_auth_companies()) AND user_is_admin_or_manager(v_session.company_id)) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية اعتماد وترحيل الجرد' USING ERRCODE = '42501';
    END IF;

    -- [SEC-FIX] سقف عدد العناصر: منع استنزاف أقفال الصفوف بحمولة ضخمة
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'بنود الاعتماد غير صالحة' USING ERRCODE = '22023';
    END IF;

    IF jsonb_array_length(p_items) > 10000 THEN
        RAISE EXCEPTION 'عدد بنود الاعتماد يتجاوز الحد المسموح (10000)' USING ERRCODE = '22023';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'counted_quantity') IS NULL OR (v_item->>'product_id') IS NULL THEN
            CONTINUE;
        END IF;

        v_raw_qty := (v_item->>'counted_quantity')::NUMERIC;

        -- [SEC-FIX] رفض الكميات غير المنطقية بدلاً من كتمها بصمت
        IF v_raw_qty IS NULL
           OR v_raw_qty = 'NaN'::NUMERIC
           OR v_raw_qty = 'Infinity'::NUMERIC
           OR v_raw_qty = '-Infinity'::NUMERIC
           OR v_raw_qty < 0
           OR v_raw_qty > 1000000 THEN
            RAISE EXCEPTION 'كمية الجرد غير صالحة للمنتج %', (v_item->>'product_id') USING ERRCODE = '22023';
        END IF;

        SELECT id INTO v_product
        FROM public.audit_items
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'المنتج % غير مرصود في بنود جلسة الجرد', (v_item->>'product_id') USING ERRCODE = '22023';
        END IF;

        SELECT id INTO v_product
        FROM public.products
        WHERE id = (v_item->>'product_id')::UUID
          AND company_id = v_session.company_id
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'المنتج غير موجود أو لا ينتمي لمنشأة جلسة الجرد' USING ERRCODE = '22023';
        END IF;

        v_new_qty := v_raw_qty;

        -- Update audit item row with counted quantity
        UPDATE public.audit_items
        SET counted_quantity = v_new_qty
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        -- Get current stock before update
        SELECT quantity INTO v_current_qty
        FROM public.product_stock
        WHERE product_id = (v_item->>'product_id')::UUID
          AND warehouse_id = v_session.warehouse_id
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_qty := 0;
        END IF;

        v_diff := v_new_qty - v_current_qty;

-- [REMOVED BY AUDIT]         -- Update product_stock directly to the actual counted physical quantity
-- [REMOVED BY AUDIT]         INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id, updated_by, updated_at)
-- [REMOVED BY AUDIT]         VALUES (
-- [REMOVED BY AUDIT]             (v_item->>'product_id')::UUID,
-- [REMOVED BY AUDIT]             v_session.warehouse_id,
-- [REMOVED BY AUDIT]             v_new_qty,
-- [REMOVED BY AUDIT]             v_session.company_id,
-- [REMOVED BY AUDIT]             v_effective_user_id,
-- [REMOVED BY AUDIT]             NOW()
-- [REMOVED BY AUDIT]         )
-- [REMOVED BY AUDIT]         ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]         DO UPDATE SET
-- [REMOVED BY AUDIT]             quantity = EXCLUDED.quantity,
-- [REMOVED BY AUDIT]             updated_by = EXCLUDED.updated_by,
-- [REMOVED BY AUDIT]             updated_at = NOW();

        -- Record inventory transaction if there was a discrepancy
        IF v_diff <> 0 THEN
            SELECT id, purchase_price, cost_price INTO v_product
            FROM public.products
            WHERE id = (v_item->>'product_id')::UUID;

            v_txn_type := CASE WHEN v_diff > 0 THEN 'adj_in' ELSE 'adj_out' END;

            INSERT INTO public.inventory_transactions (
                company_id,
                product_id,
                warehouse_id,
                quantity,
                unit_cost,
                total_cost,
                transaction_type,
                reference_type,
                reference_id,
                created_by
            ) VALUES (
                v_session.company_id,
                (v_item->>'product_id')::UUID,
                v_session.warehouse_id,
                ABS(v_diff),
                COALESCE(v_product.cost_price, v_product.purchase_price, 0),
                ROUND(ABS(v_diff) * COALESCE(v_product.cost_price, v_product.purchase_price, 0), 4),
                v_txn_type,
                'stock_audit',
                p_session_id,
                v_effective_user_id
            );
        END IF;

        v_adj_count := v_adj_count + 1;
    END LOOP;

    UPDATE public.audit_sessions
    SET status = 'completed',
        completed_at = NOW(),
        completed_by = v_effective_user_id
    WHERE id = p_session_id;

    -- Clean up draft
    DELETE FROM public.inventory_session_drafts WHERE session_id = p_session_id;

    RETURN jsonb_build_object(
        'status', 'completed',
        'adjusted', v_adj_count
    );
END;
$$;

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

-- [REMOVED BY AUDIT]     INSERT INTO public.product_stock (
-- [REMOVED BY AUDIT]       product_id, warehouse_id, quantity, company_id, updated_by, updated_at
-- [REMOVED BY AUDIT]     ) VALUES (
-- [REMOVED BY AUDIT]       v_item.product_id,
-- [REMOVED BY AUDIT]       COALESCE(v_item.warehouse_id, v_warehouse_id),
-- [REMOVED BY AUDIT]       -v_item.quantity,
-- [REMOVED BY AUDIT]       v_company_id,
-- [REMOVED BY AUDIT]       v_user_id,
-- [REMOVED BY AUDIT]       now()
-- [REMOVED BY AUDIT]     )
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET
-- [REMOVED BY AUDIT]       quantity = product_stock.quantity - v_item.quantity,
-- [REMOVED BY AUDIT]       updated_at = now(),
-- [REMOVED BY AUDIT]       updated_by = v_user_id;

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

  -- === PHASE 2: GENERATE INVOICE NUMBER ===
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

  -- === PHASE 3: CREATE INVOICE AS DRAFT (INCLUDING SUBTOTAL AND ADVANCE PAYMENT) ===
  INSERT INTO public.invoices (
    company_id, invoice_number, party_id, issue_date, due_date,
    subtotal, total_amount, tax_amount, discount_amount, payment_method, payment_account_id, status, notes, type,
    created_by, currency_code, exchange_rate, idempotency_key, branch_id, advance_payment, paid_amount
  ) VALUES (
    v_company_id, v_invoice_number, p_party_id, p_invoice_date, p_due_date,
    v_total_amount, v_final_total, v_total_tax, v_total_discount, p_payment_type, p_payment_account_id,
    'draft', p_notes, 'sale',
    v_user_id, p_currency_code, p_exchange_rate, p_idempotency_key, p_branch_id,
    v_actual_paid, 0
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

-- [REMOVED BY AUDIT]     INSERT INTO public.product_stock (
-- [REMOVED BY AUDIT]       product_id, warehouse_id, quantity, company_id, updated_by, updated_at
-- [REMOVED BY AUDIT]     ) VALUES (
-- [REMOVED BY AUDIT]       v_item.product_id,
-- [REMOVED BY AUDIT]       COALESCE(v_item.warehouse_id, v_warehouse_id),
-- [REMOVED BY AUDIT]       -v_item.quantity,
-- [REMOVED BY AUDIT]       v_company_id,
-- [REMOVED BY AUDIT]       v_user_id,
-- [REMOVED BY AUDIT]       now()
-- [REMOVED BY AUDIT]     )
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET
-- [REMOVED BY AUDIT]       quantity = product_stock.quantity - v_item.quantity,
-- [REMOVED BY AUDIT]       updated_at = now(),
-- [REMOVED BY AUDIT]       updated_by = v_user_id;

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
      paid_amount = v_actual_paid,
      advance_payment = v_actual_paid
  WHERE id = v_invoice_id;

  RETURN v_invoice_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

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
SET search_path TO 'public', 'pg_temp'
AS $function$
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
  v_line_net numeric;
  v_line_tax numeric;
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

    v_line_net := GREATEST(0, v_item.quantity * v_item.unit_price - COALESCE(v_item.discount_amount, 0));
    v_line_tax := COALESCE(round(v_line_net * COALESCE(v_item.tax_rate, 0) / 100, 4), 0);
    
    v_total_amount := v_total_amount + v_line_net;
    v_total_discount := v_total_discount + COALESCE(v_item.discount_amount, 0);
    v_total_tax := v_total_tax + v_line_tax;
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

    v_line_net := GREATEST(0, v_item.quantity * v_item.unit_price - COALESCE(v_item.discount_amount, 0));
    v_line_tax := COALESCE(round(v_line_net * COALESCE(v_item.tax_rate, 0) / 100, 4), 0);
    -- Total includes tax to satisfy chk_item_total: CHECK (total = round((quantity * unit_price - discount) + tax, 2))
    v_line_total := round(v_line_net + v_line_tax, 2);

    INSERT INTO public.invoice_items (
      invoice_id, product_id, quantity, unit_price, cost_price,
      discount_amount, tax_amount, total, company_id
    ) VALUES (
      v_invoice_id, v_item.product_id, v_item.quantity, v_item.unit_price,
      COALESCE(v_item.cost_price, v_sale_cost, 0),
      COALESCE(v_item.discount_amount, 0),
      v_line_tax,
      v_line_total, v_company_id
    );

-- [REMOVED BY AUDIT]     INSERT INTO public.product_stock (
-- [REMOVED BY AUDIT]       product_id, warehouse_id, quantity, company_id, updated_by, updated_at
-- [REMOVED BY AUDIT]     ) VALUES (
-- [REMOVED BY AUDIT]       v_item.product_id,
-- [REMOVED BY AUDIT]       COALESCE(v_item.warehouse_id, v_warehouse_id),
-- [REMOVED BY AUDIT]       -v_item.quantity,
-- [REMOVED BY AUDIT]       v_company_id,
-- [REMOVED BY AUDIT]       v_user_id,
-- [REMOVED BY AUDIT]       now()
-- [REMOVED BY AUDIT]     )
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET
-- [REMOVED BY AUDIT]       quantity = product_stock.quantity - v_item.quantity,
-- [REMOVED BY AUDIT]       updated_at = now(),
-- [REMOVED BY AUDIT]       updated_by = v_user_id;

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
$function$;

CREATE OR REPLACE FUNCTION public.admin_recalculate_all_stock(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated int := 0;
  v_row     RECORD;
  v_qty     numeric;
BEGIN
      PERFORM public.verify_company_access(p_company_id);
-- فقط للمالك
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.company_id = p_company_id
      AND ucr.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'access_denied: يتطلب صلاحية مالك';
  END IF;

  FOR v_row IN
    SELECT DISTINCT product_id, warehouse_id
    FROM inventory_transactions
    WHERE company_id = p_company_id AND deleted_at IS NULL
  LOOP
    SELECT COALESCE(SUM(
      CASE transaction_type
        WHEN 'purchase'        THEN  ABS(quantity)
        WHEN 'sales_return'    THEN  ABS(quantity)
        WHEN 'transfer_in'     THEN  ABS(quantity)
        WHEN 'adj_in'          THEN  ABS(quantity)
        WHEN 'initial'         THEN  ABS(quantity)
        WHEN 'sales'           THEN -ABS(quantity)
        WHEN 'purchase_return' THEN -ABS(quantity)
        WHEN 'transfer_out'    THEN -ABS(quantity)
        WHEN 'adj_out'         THEN -ABS(quantity)
        WHEN 'adj'             THEN  quantity
        ELSE 0
      END
    ), 0) INTO v_qty
    FROM inventory_transactions
    WHERE product_id   = v_row.product_id
      AND warehouse_id = v_row.warehouse_id
      AND company_id   = p_company_id
      AND deleted_at   IS NULL;

-- [REMOVED BY AUDIT]     INSERT INTO product_stock(product_id, warehouse_id, quantity, company_id)
-- [REMOVED BY AUDIT]     VALUES (v_row.product_id, v_row.warehouse_id, GREATEST(0, v_qty), p_company_id)
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET
-- [REMOVED BY AUDIT]       quantity   = GREATEST(0, EXCLUDED.quantity),
-- [REMOVED BY AUDIT]       updated_at = now();

    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'updated_rows', v_updated,
    'company_id',   p_company_id,
    'completed_at', now()
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.assemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component RECORD;
    v_available_qty NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
    END IF;

    -- Process each component
    FOR v_component IN
        SELECT component_product_id, quantity
        FROM product_kit_items
        WHERE kit_product_id = p_kit_product_id
    LOOP
        -- Check stock
        SELECT COALESCE(quantity, 0) INTO v_available_qty
        FROM product_stock
        WHERE product_id = v_component.component_product_id
          AND warehouse_id = p_warehouse_id;

        IF v_available_qty < (v_component.quantity * p_quantity) THEN
            RAISE EXCEPTION 'Insufficient stock for component %: need %, available %',
                v_component.component_product_id,
                v_component.quantity * p_quantity,
                v_available_qty;
        END IF;

        -- Reduce component stock
-- [REMOVED BY AUDIT]         UPDATE product_stock
-- [REMOVED BY AUDIT]         SET quantity = quantity - (v_component.quantity * p_quantity),
-- [REMOVED BY AUDIT]             updated_at = NOW()
-- [REMOVED BY AUDIT]         WHERE product_id = v_component.component_product_id
-- [REMOVED BY AUDIT]           AND warehouse_id = p_warehouse_id;

        -- Log inventory transaction for component
        INSERT INTO inventory_transactions (
            company_id, product_id, warehouse_id, quantity,
            transaction_type, reference_type, reference_id, created_by
        ) VALUES (
            p_company_id, v_component.component_product_id, p_warehouse_id,
            -(v_component.quantity * p_quantity),
            'adj_out', 'kit_assembly', p_kit_product_id, p_user_id
        );
    END LOOP;

    -- Increase kit stock
-- [REMOVED BY AUDIT]     INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
-- [REMOVED BY AUDIT]     VALUES (p_kit_product_id, p_warehouse_id, p_quantity, p_company_id, NOW(), NOW())
-- [REMOVED BY AUDIT]     ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]     DO UPDATE SET quantity = product_stock.quantity + p_quantity, updated_at = NOW();

    -- Log inventory transaction for kit
    INSERT INTO inventory_transactions (
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by
    ) VALUES (
        p_company_id, p_kit_product_id, p_warehouse_id, p_quantity,
        'adj_in', 'kit_assembly', p_kit_product_id, p_user_id
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.disassemble_kit(p_company_id uuid, p_kit_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component RECORD;
    v_kit_qty NUMERIC;
BEGIN
        PERFORM public.verify_company_access(p_company_id);
-- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
    END IF;

    -- Check kit stock
    SELECT COALESCE(quantity, 0) INTO v_kit_qty
    FROM product_stock
    WHERE product_id = p_kit_product_id
      AND warehouse_id = p_warehouse_id;

    IF v_kit_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient kit stock: need %, available %', p_quantity, v_kit_qty;
    END IF;

    -- Reduce kit stock
-- [REMOVED BY AUDIT]     UPDATE product_stock
-- [REMOVED BY AUDIT]     SET quantity = quantity - p_quantity,
-- [REMOVED BY AUDIT]         updated_at = NOW()
-- [REMOVED BY AUDIT]     WHERE product_id = p_kit_product_id
-- [REMOVED BY AUDIT]       AND warehouse_id = p_warehouse_id;

    -- Log inventory transaction for kit removal
    INSERT INTO inventory_transactions (
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by
    ) VALUES (
        p_company_id, p_kit_product_id, p_warehouse_id, -p_quantity,
        'adj_out', 'kit_disassembly', p_kit_product_id, p_user_id
    );

    -- Increase component stock
    FOR v_component IN
        SELECT component_product_id, quantity
        FROM product_kit_items
        WHERE kit_product_id = p_kit_product_id
    LOOP
-- [REMOVED BY AUDIT]         INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
-- [REMOVED BY AUDIT]         VALUES (v_component.component_product_id, p_warehouse_id, v_component.quantity * p_quantity, p_company_id, NOW(), NOW())
-- [REMOVED BY AUDIT]         ON CONFLICT (product_id, warehouse_id)
-- [REMOVED BY AUDIT]         DO UPDATE SET quantity = product_stock.quantity + (v_component.quantity * p_quantity), updated_at = NOW();

        -- Log inventory transaction for component return
        INSERT INTO inventory_transactions (
            company_id, product_id, warehouse_id, quantity,
            transaction_type, reference_type, reference_id, created_by
        ) VALUES (
            p_company_id, v_component.component_product_id, p_warehouse_id,
            v_component.quantity * p_quantity,
            'adj_in', 'kit_disassembly', p_kit_product_id, p_user_id
        );
    END LOOP;
END;
$function$

