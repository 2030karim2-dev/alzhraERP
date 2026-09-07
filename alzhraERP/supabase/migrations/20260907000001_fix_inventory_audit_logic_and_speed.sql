-- ============================================================
-- Migration: 20260907000001_fix_inventory_audit_logic_and_speed.sql
-- 1) Fix trg_update_product_stock to bypass stock_audit transactions (prevents double adjustment & insufficient stock errors)
-- 2) Update finalize_audit_session for accurate atomic reconciliation
-- 3) Provide fast atomic RPC add_audit_session_item
-- 4) Add unique indexes for audit_items and inventory_session_drafts
-- 5) Repair doubled stock records from earlier audit session
-- ============================================================

-- 1. Fix trg_update_product_stock: bypass stock_audit reference
CREATE OR REPLACE FUNCTION public.trg_update_product_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_qty_change   numeric;
  v_company_id   uuid;
  v_current_qty  numeric;
BEGIN
  -- Stock audit directly sets the exact physical count on product_stock in finalize_audit_session.
  -- Its inventory_transaction is an audit log of the difference, so we must not double-adjust
  -- or throw an 'insufficient stock' error.
  IF NEW.reference_type = 'stock_audit' THEN
    RETURN NEW;
  END IF;

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

  SELECT COALESCE(quantity, 0) INTO v_current_qty
  FROM product_stock
  WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;

  IF v_qty_change < 0 AND COALESCE(v_current_qty, 0) + v_qty_change < 0 THEN
    RAISE EXCEPTION 'مخزون غير كافٍ للمنتج: المتاح=%, المطلوب=%',
      COALESCE(v_current_qty, 0), ABS(v_qty_change);
  END IF;

  INSERT INTO product_stock(product_id, warehouse_id, quantity, company_id, updated_by)
  VALUES (NEW.product_id, NEW.warehouse_id,
          CASE WHEN v_qty_change >= 0 THEN v_qty_change ELSE 0 END,
          v_company_id, NEW.created_by)
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET
    quantity   = product_stock.quantity + v_qty_change,
    updated_at = now(),
    updated_by = NEW.created_by;

  RETURN NEW;
END;
$function$;

-- 2. Hardened finalize_audit_session
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

        -- Update product_stock directly to the actual counted physical quantity
        INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id, updated_by, updated_at)
        VALUES (
            (v_item->>'product_id')::UUID,
            v_session.warehouse_id,
            v_new_qty,
            v_session.company_id,
            p_user_id,
            NOW()
        )
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET
            quantity = EXCLUDED.quantity,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW();

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

-- 3. Fast atomic RPC: add_audit_session_item
CREATE OR REPLACE FUNCTION public.add_audit_session_item(
    p_session_id uuid,
    p_product_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_session record;
    v_stock_qty numeric := 0;
    v_item record;
    v_product record;
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();

    SELECT id, warehouse_id, company_id, status INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status = 'completed' THEN
        RAISE EXCEPTION 'Audit session already completed' USING ERRCODE = '22023';
    END IF;

    -- Fetch current stock in session warehouse
    SELECT COALESCE(quantity, 0) INTO v_stock_qty
    FROM public.product_stock
    WHERE product_id = p_product_id AND warehouse_id = v_session.warehouse_id;

    -- Insert or fetch existing audit item
    INSERT INTO public.audit_items (
        session_id,
        product_id,
        expected_quantity,
        company_id,
        created_by
    ) VALUES (
        p_session_id,
        p_product_id,
        COALESCE(v_stock_qty, 0),
        v_session.company_id,
        v_user_id
    )
    ON CONFLICT (session_id, product_id)
    DO UPDATE SET expected_quantity = EXCLUDED.expected_quantity
    RETURNING * INTO v_item;

    -- Fetch product details for immediate UI rendering
    SELECT p.id, p.name_ar, p.sku, p.part_number, p.brand, p.size, pc.name as category_name
    INTO v_product
    FROM public.products p
    LEFT JOIN public.product_categories pc ON pc.id = p.category_id
    WHERE p.id = p_product_id;

    RETURN jsonb_build_object(
        'id', v_item.id,
        'session_id', v_item.session_id,
        'product_id', v_item.product_id,
        'expected_quantity', v_item.expected_quantity,
        'counted_quantity', v_item.counted_quantity,
        'created_at', v_item.created_at,
        'products', jsonb_build_object(
            'id', v_product.id,
            'name', COALESCE(v_product.name_ar, 'بدون اسم'),
            'name_ar', COALESCE(v_product.name_ar, 'بدون اسم'),
            'sku', COALESCE(v_product.sku, '---'),
            'part_number', v_product.part_number,
            'brand', v_product.brand,
            'size', v_product.size,
            'category', COALESCE(v_product.category_name, 'عام')
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_audit_session_item(uuid, uuid) TO authenticated;

-- 4. Unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_items_session_product
  ON public.audit_items (session_id, product_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_session_drafts_session
  ON public.inventory_session_drafts (session_id);

-- 5. Data repair for doubled stock from audit session ba9e388c-9d44-40f5-bf31-8a8755a33999
UPDATE public.product_stock ps
SET quantity = ai.counted_quantity,
    updated_at = NOW()
FROM public.audit_items ai
WHERE ai.session_id = 'ba9e388c-9d44-40f5-bf31-8a8755a33999'
  AND ai.product_id = ps.product_id
  AND ps.warehouse_id = 'e162c7c9-e49b-4a76-b871-02f9437d6cfc'
  AND ai.counted_quantity IS NOT NULL
  AND ps.quantity != ai.counted_quantity;
