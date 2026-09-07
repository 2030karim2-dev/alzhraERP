-- Migration: 20260907000004_audit_security_and_integrity_sweep.sql
-- Harden multi-tenant isolation, role checks, and active session validation across all audit RPCs

-- 1. add_audit_session_item: add tenant check, role check, and active status guard
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
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT id, warehouse_id, company_id, status INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status <> 'active' THEN
        IF v_session.status = 'completed' THEN
            RAISE EXCEPTION 'لا يمكن إضافة أصناف لجلسة جرد مكتملة' USING ERRCODE = '22023';
        ELSE
            RAISE EXCEPTION 'لا يمكن إضافة أصناف لجلسة جرد ملغاة أو غير نشطة' USING ERRCODE = '22023';
        END IF;
    END IF;

    -- Tenant isolation & role check
    IF NOT (v_session.company_id IN (SELECT get_auth_companies()) AND user_is_admin_or_manager(v_session.company_id)) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية إدارة الجرد' USING ERRCODE = '42501';
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

-- 2. delete_audit_session_item: add tenant check & active status guard
CREATE OR REPLACE FUNCTION public.delete_audit_session_item(
    p_session_id UUID,
    p_item_id UUID DEFAULT NULL,
    p_product_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_deleted_count INT := 0;
    v_target_product_id UUID := p_product_id;
BEGIN
    SELECT id, company_id, status INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status <> 'active' THEN
        IF v_session.status = 'completed' THEN
            RAISE EXCEPTION 'Cannot delete items from a completed audit session' USING ERRCODE = '22023';
        ELSE
            RAISE EXCEPTION 'Cannot delete items from an inactive audit session' USING ERRCODE = '22023';
        END IF;
    END IF;

    -- Tenant isolation & role check
    IF NOT (v_session.company_id IN (SELECT get_auth_companies()) AND user_is_admin_or_manager(v_session.company_id)) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية تعديل أو حذف عناصر الجرد' USING ERRCODE = '42501';
    END IF;

    IF p_item_id IS NOT NULL THEN
        IF v_target_product_id IS NULL THEN
            SELECT product_id INTO v_target_product_id
            FROM public.audit_items
            WHERE id = p_item_id AND session_id = p_session_id;
        END IF;

        DELETE FROM public.audit_items
        WHERE id = p_item_id AND session_id = p_session_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    ELSIF p_product_id IS NOT NULL THEN
        DELETE FROM public.audit_items
        WHERE product_id = p_product_id AND session_id = p_session_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    ELSE
        RAISE EXCEPTION 'Either p_item_id or p_product_id must be provided' USING ERRCODE = '22023';
    END IF;

    -- Clean up matching item from session draft if present
    IF v_target_product_id IS NOT NULL THEN
        UPDATE public.inventory_session_drafts
        SET items = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements(items) elem
            WHERE elem->>'productId' <> v_target_product_id::text
        ),
        updated_at = NOW()
        WHERE session_id = p_session_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', v_deleted_count
    );
END;
$$;

-- 3. finalize_audit_session: add tenant check & active status guard
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

        -- Update product_stock directly to the actual counted physical quantity
        INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id, updated_by, updated_at)
        VALUES (
            (v_item->>'product_id')::UUID,
            v_session.warehouse_id,
            v_new_qty,
            v_session.company_id,
            v_effective_user_id,
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

-- Ensure execute grants
GRANT EXECUTE ON FUNCTION public.add_audit_session_item(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_audit_session_item(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_audit_session(uuid, uuid, jsonb) TO authenticated;
