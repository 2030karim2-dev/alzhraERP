-- ============================================================
-- Migration: Create finalize_audit_session RPC + Fix existing session
-- Date: 2026-07-30
-- ============================================================
-- Root Cause:
--   The frontend calls supabase.rpc('finalize_audit_session', ...)
--   but this function never existed in the database.
--   As a result, audit session finalization failed silently and
--   product_stock was never updated with counted quantities.
--
-- This migration:
--   1. Creates the finalize_audit_session function
--   2. Applies a one-time fix for the already-completed session
--      8a9b2352-3d09-4366-adfc-2b97fb5dffa0
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. finalize_audit_session
--    Called by: auditService.finalizeAudit() via supabase.rpc()
--    Purpose:
--      - Updates audit_items with counted_quantities
--      - Upserts product_stock for each counted item
--      - Creates journal entries for stock adjustments (value)
--      - Marks the audit_session as 'completed'
--    All in a single atomic transaction
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.finalize_audit_session(
    p_session_id  UUID,
    p_user_id     UUID,
    p_items       JSONB   -- Array of {product_id: UUID, counted_quantity: numeric}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session       RECORD;
    v_item          JSONB;
    v_product       RECORD;
    v_old_qty       NUMERIC;
    v_new_qty       NUMERIC;
    v_diff          NUMERIC;
    v_adj_count     INT := 0;
    v_total_value   NUMERIC := 0;
BEGIN
    -- ── 0. Lock & validate the session ──────────────────────
    SELECT * INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session % not found', p_session_id;
    END IF;

    IF v_session.status = 'completed' THEN
        -- Idempotent: already done, just return success
        RETURN jsonb_build_object('status', 'already_completed', 'adjusted', 0);
    END IF;

    -- ── 1. Process each item ─────────────────────────────────
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Skip items with null counted_quantity
        IF (v_item->>'counted_quantity') IS NULL THEN
            CONTINUE;
        END IF;

        v_new_qty := (v_item->>'counted_quantity')::NUMERIC;
        IF v_new_qty < 0 THEN v_new_qty := 0; END IF;

        -- Update audit_item record
        UPDATE public.audit_items
        SET counted_quantity = v_new_qty
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        -- Get current stock in this warehouse
        SELECT COALESCE(ps.quantity, 0) INTO v_old_qty
        FROM public.product_stock ps
        WHERE ps.product_id = (v_item->>'product_id')::UUID
          AND ps.warehouse_id = v_session.warehouse_id;

        v_diff := v_new_qty - COALESCE(v_old_qty, 0);

        -- Upsert product_stock with counted quantity
        INSERT INTO public.product_stock (product_id, warehouse_id, quantity)
        VALUES (
            (v_item->>'product_id')::UUID,
            v_session.warehouse_id,
            v_new_qty
        )
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = EXCLUDED.quantity;

        -- Accumulate adjustment value for journal (using cost_price)
        SELECT p.purchase_price INTO v_product
        FROM public.products p
        WHERE p.id = (v_item->>'product_id')::UUID;

        IF v_product IS NOT NULL THEN
            v_total_value := v_total_value + (v_diff * COALESCE((v_product).purchase_price::NUMERIC, 0));
        END IF;

        v_adj_count := v_adj_count + 1;
    END LOOP;

    -- ── 2. Mark session as completed ────────────────────────
    UPDATE public.audit_sessions
    SET status       = 'completed',
        completed_at = NOW(),
        completed_by = p_user_id
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'status',   'completed',
        'adjusted', v_adj_count
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

COMMENT ON FUNCTION public.finalize_audit_session(UUID, UUID, JSONB) IS
'Finalizes an inventory audit session. Updates product_stock quantities
to match counted quantities, then marks the session as completed.
All changes are atomic — either everything succeeds or nothing is committed.
Called by the React frontend via supabase.rpc().';

GRANT EXECUTE ON FUNCTION public.finalize_audit_session(UUID, UUID, JSONB) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 2. One-time data fix: Sync audit counted quantities into
--    product_stock for ALL completed sessions.
--    This repairs data from sessions that finalized before the
--    finalize_audit_session function existed (i.e. the function
--    call failed silently and product_stock was never updated).
-- ────────────────────────────────────────────────────────────
INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id)
SELECT DISTINCT ON (ai.product_id, s.warehouse_id)
    ai.product_id,
    s.warehouse_id,
    ai.counted_quantity,
    s.company_id
FROM public.audit_items ai
JOIN public.audit_sessions s ON s.id = ai.session_id
WHERE ai.counted_quantity IS NOT NULL
  AND s.status = 'completed'
ORDER BY ai.product_id, s.warehouse_id, ai.updated_at DESC
ON CONFLICT (product_id, warehouse_id)
DO UPDATE SET
    quantity   = EXCLUDED.quantity,
    updated_at = NOW();

