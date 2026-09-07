-- Migration: 20260907000002_fix_audit_item_deletion_and_rls.sql
-- Fix DELETE RLS policies on audit_items and audit_sessions to allow 'owner', 'admin', and 'manager'
-- Create atomic RPC delete_audit_session_item for reliable, instant item deletion and draft cleanup

-- 1. Fix RLS policy on audit_items for DELETE
DROP POLICY IF EXISTS "audit_items_delete" ON public.audit_items;
CREATE POLICY "audit_items_delete" ON public.audit_items
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

-- 2. Fix RLS policy on audit_sessions for DELETE
DROP POLICY IF EXISTS "audit_sessions_delete" ON public.audit_sessions;
CREATE POLICY "audit_sessions_delete" ON public.audit_sessions
  FOR DELETE TO authenticated
  USING (
    company_id IN (SELECT get_auth_companies())
    AND user_is_admin_or_manager(company_id)
  );

-- 3. Atomic RPC to delete audit session item and clean up drafts
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

    IF v_session.status = 'completed' THEN
        RAISE EXCEPTION 'Cannot delete items from a completed audit session' USING ERRCODE = '22023';
    END IF;

    IF NOT user_is_admin_or_manager(v_session.company_id) THEN
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

GRANT EXECUTE ON FUNCTION public.delete_audit_session_item(UUID, UUID, UUID) TO authenticated;
