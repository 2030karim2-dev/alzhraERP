-- Migration: 20260912000003_fix_save_audit_progress_and_drafts.sql
-- Description: Atomic RPC save_audit_progress to permanently fix inventory session counted quantities persistence
-- and widen inventory_session_drafts RLS for all tenant roles.

-- 1. Create save_audit_progress RPC
CREATE OR REPLACE FUNCTION public.save_audit_progress(
    p_session_id uuid,
    p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_session record;
    v_user_id uuid;
    v_updated_count integer := 0;
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
            RAISE EXCEPTION 'لا يمكن تعديل كميات جلسة جرد مكتملة' USING ERRCODE = '22023';
        ELSE
            RAISE EXCEPTION 'لا يمكن تعديل كميات جلسة جرد ملغاة أو غير نشطة' USING ERRCODE = '22023';
        END IF;
    END IF;

    -- Multi-tenant isolation check
    IF NOT (v_session.company_id IN (SELECT get_auth_companies())) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية الوصول لهذه المنشأة' USING ERRCODE = '42501';
    END IF;

    -- Batch update audit_items from the provided JSON array
    IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' AND jsonb_array_length(p_items) > 0 THEN
        WITH parsed_items AS (
            SELECT
                NULLIF(elem->>'id', '')::uuid AS item_id,
                NULLIF(elem->>'product_id', '')::uuid AS product_id,
                CASE
                    WHEN elem->>'counted_quantity' IS NULL OR elem->>'counted_quantity' = '' THEN NULL
                    ELSE (elem->>'counted_quantity')::numeric
                END AS counted_qty
            FROM jsonb_array_elements(p_items) elem
        ),
        updated AS (
            UPDATE public.audit_items ai
            SET
                counted_quantity = pi.counted_qty,
                updated_at = timezone('utc'::text, now())
            FROM parsed_items pi
            WHERE ai.session_id = p_session_id
              AND (
                  (pi.item_id IS NOT NULL AND ai.id = pi.item_id)
                  OR
                  (pi.item_id IS NULL AND pi.product_id IS NOT NULL AND ai.product_id = pi.product_id)
              )
            RETURNING ai.id
        )
        SELECT COUNT(*) INTO v_updated_count FROM updated;

        -- Keep inventory_session_drafts in sync atomically
        INSERT INTO public.inventory_session_drafts (
            session_id,
            warehouse_id,
            items,
            updated_at
        ) VALUES (
            p_session_id,
            v_session.warehouse_id,
            p_items,
            timezone('utc'::text, now())
        )
        ON CONFLICT (session_id) DO UPDATE
        SET items = EXCLUDED.items,
            updated_at = EXCLUDED.updated_at;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'updated_count', v_updated_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_audit_progress(uuid, jsonb) TO authenticated;

-- 2. Relax inventory_session_drafts RLS policies to allow any tenant user to save draft
DROP POLICY IF EXISTS "inventory_session_drafts_insert" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_insert" ON public.inventory_session_drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
    )
  );

DROP POLICY IF EXISTS "inventory_session_drafts_update" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_update" ON public.inventory_session_drafts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
    )
  );
