-- Migration: 20260902000004_fix_audit_finalize_and_unique_constraints.sql
-- Description: Records inventory_transactions on audit finalization & reinforces product unique barcode

-- 1. Hardened finalize_audit_session with inventory transaction tracking
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

        -- Update product_stock
        INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id)
        VALUES (
            (v_item->>'product_id')::UUID,
            v_session.warehouse_id,
            v_new_qty,
            v_session.company_id
        )
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = EXCLUDED.quantity;

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

-- 2. Anti-Duplication: Unique barcode per company
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_company_barcode
  ON public.products (company_id, TRIM(barcode))
  WHERE barcode IS NOT NULL AND TRIM(barcode) <> '' AND deleted_at IS NULL;

-- 3. Composite Index for (part_number + brand) fast lookup
CREATE INDEX IF NOT EXISTS idx_products_company_part_brand
  ON public.products (company_id, LOWER(TRIM(part_number)), LOWER(TRIM(COALESCE(brand, ''))))
  WHERE part_number IS NOT NULL AND TRIM(part_number) <> '' AND deleted_at IS NULL;
