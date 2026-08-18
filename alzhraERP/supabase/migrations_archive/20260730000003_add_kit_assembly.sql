-- ============================================================
-- Migration: Add Kit Assembly/Disassembly RPCs
-- Date: 2026-07-30
-- ============================================================
-- These RPCs handle atomic kit assembly and disassembly
-- with proper inventory transaction logging.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- assemble_kit
-- Purpose: Atomically reduce component stock and increase kit stock
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assemble_kit(
    p_company_id UUID,
    p_kit_product_id UUID,
    p_warehouse_id UUID,
    p_quantity INTEGER,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        UPDATE product_stock
        SET quantity = quantity - (v_component.quantity * p_quantity),
            updated_at = NOW()
        WHERE product_id = v_component.component_product_id
          AND warehouse_id = p_warehouse_id;

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
    INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
    VALUES (p_kit_product_id, p_warehouse_id, p_quantity, p_company_id, NOW(), NOW())
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = product_stock.quantity + p_quantity, updated_at = NOW();

    -- Log inventory transaction for kit
    INSERT INTO inventory_transactions (
        company_id, product_id, warehouse_id, quantity,
        transaction_type, reference_type, reference_id, created_by
    ) VALUES (
        p_company_id, p_kit_product_id, p_warehouse_id, p_quantity,
        'adj_in', 'kit_assembly', p_kit_product_id, p_user_id
    );
END;
$$;

COMMENT ON FUNCTION public.assemble_kit IS 
'Atomically assembles kits by reducing component stock and increasing kit stock. Logs all inventory transactions for audit trail.';

GRANT EXECUTE ON FUNCTION public.assemble_kit(UUID, UUID, UUID, INTEGER, UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- disassemble_kit
-- Purpose: Atomically reduce kit stock and increase component stock
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.disassemble_kit(
    p_company_id UUID,
    p_kit_product_id UUID,
    p_warehouse_id UUID,
    p_quantity INTEGER,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    UPDATE product_stock
    SET quantity = quantity - p_quantity,
        updated_at = NOW()
    WHERE product_id = p_kit_product_id
      AND warehouse_id = p_warehouse_id;

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
        INSERT INTO product_stock (product_id, warehouse_id, quantity, company_id, created_at, updated_at)
        VALUES (v_component.component_product_id, p_warehouse_id, v_component.quantity * p_quantity, p_company_id, NOW(), NOW())
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = product_stock.quantity + (v_component.quantity * p_quantity), updated_at = NOW();

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
$$;

COMMENT ON FUNCTION public.disassemble_kit IS 
'Atomically disassembles kits by reducing kit stock and returning components to stock. Logs all inventory transactions for audit trail.';

GRANT EXECUTE ON FUNCTION public.disassemble_kit(UUID, UUID, UUID, INTEGER, UUID) TO authenticated;