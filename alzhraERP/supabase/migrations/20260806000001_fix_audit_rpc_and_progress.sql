-- ============================================================
-- Migration: Fix finalize_audit_session RPC + Add progress/accuracy
-- Date: 2026-08-06
-- ============================================================
-- Problems fixed:
--   1. The frontend now passes p_company_id to finalize_audit_session,
--      but the RPC only accepts 3 params (p_session_id, p_user_id, p_items).
--      This causes "function does not exist" errors.
--   2. The audit_sessions table has no progress or accuracy columns,
--      causing the progress bar and accuracy badge to never display.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add progress and accuracy columns to audit_sessions (if missing)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.audit_sessions
    ADD COLUMN IF NOT EXISTS progress       INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS accuracy       NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.audit_sessions.progress IS
    'Completion percentage (0-100). Maintained by an AFTER trigger on audit_items.';
COMMENT ON COLUMN public.audit_sessions.accuracy IS
    'Match accuracy percentage between counted and expected quantities.';

-- ────────────────────────────────────────────────────────────
-- 2. Create function to recalculate progress & accuracy
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalc_audit_progress(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total     INTEGER;
    v_counted   INTEGER;
    v_matched   INTEGER;
    v_progress  INTEGER := 0;
    v_accuracy  NUMERIC := 0;
BEGIN
    -- Total items in session
    SELECT COUNT(*) INTO v_total
    FROM public.audit_items
    WHERE session_id = p_session_id;

    -- Counted items (counted_quantity is not null)
    SELECT COUNT(*) INTO v_counted
    FROM public.audit_items
    WHERE session_id = p_session_id
      AND counted_quantity IS NOT NULL;

    -- Matched items (counted == expected)
    SELECT COUNT(*) INTO v_matched
    FROM public.audit_items
    WHERE session_id = p_session_id
      AND counted_quantity IS NOT NULL
      AND expected_quantity IS NOT NULL
      AND counted_quantity = expected_quantity;

    IF v_total > 0 THEN
        v_progress := (v_counted * 100) / v_total;
        v_accuracy := ROUND((v_matched * 100.0) / v_total, 1);
    END IF;

    UPDATE public.audit_sessions
    SET progress = v_progress,
        accuracy = v_accuracy
    WHERE id = p_session_id;
END;
$$;

COMMENT ON FUNCTION public.recalc_audit_progress(UUID) IS
'Recalculates progress (counted/total) and accuracy (matched/total) for an audit session.';

GRANT EXECUTE ON FUNCTION public.recalc_audit_progress(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. Trigger on audit_items to keep progress/accuracy updated
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_items_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_session_id := OLD.session_id;
    ELSE
        v_session_id := NEW.session_id;
    END IF;

    PERFORM public.recalc_audit_progress(v_session_id);
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_items_recalc ON public.audit_items;
CREATE TRIGGER trg_audit_items_recalc
    AFTER INSERT OR UPDATE OR DELETE ON public.audit_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_audit_items_recalc();

-- ────────────────────────────────────────────────────────────
-- 4. Rebuild finalize_audit_session (3 parameters for PostgREST RPC)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.finalize_audit_session(UUID, UUID, JSONB, UUID);
DROP FUNCTION IF EXISTS public.finalize_audit_session(UUID, UUID, JSONB);

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
    v_old_qty       NUMERIC;
    v_new_qty       NUMERIC;
    v_adj_count     INT := 0;
BEGIN
    SELECT * INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found';
    END IF;

    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object('status', 'already_completed', 'adjusted', 0);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'counted_quantity') IS NULL THEN
            CONTINUE;
        END IF;

        v_new_qty := GREATEST(0, (v_item->>'counted_quantity')::NUMERIC);

        UPDATE public.audit_items
        SET counted_quantity = v_new_qty
        WHERE session_id = p_session_id
          AND product_id = (v_item->>'product_id')::UUID;

        INSERT INTO public.product_stock (product_id, warehouse_id, quantity, company_id)
        VALUES (
            (v_item->>'product_id')::UUID,
            v_session.warehouse_id,
            v_new_qty,
            v_session.company_id
        )
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = EXCLUDED.quantity;

        v_adj_count := v_adj_count + 1;
    END LOOP;

    UPDATE public.audit_sessions
    SET status       = 'completed',
        completed_at = NOW(),
        completed_by = p_user_id
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'status',   'completed',
        'adjusted', v_adj_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_audit_session(UUID, UUID, JSONB) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. Backfill progress/accuracy for existing sessions
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.audit_sessions
    LOOP
        PERFORM public.recalc_audit_progress(r.id);
    END LOOP;
END;
$$;