-- ============================================================
-- Migration: 20260912000015_harden_inventory_audit_bulk_and_constraints.sql
-- الغرض: تحصين قسم الجرد والتسوية المخزنية (الجولة الثالثة):
--   1) دالة التعبئة المجمعة الذرية: populate_audit_session_warehouse
--      لإدراج كافة أصناف المستودع بضربة واحدة بدلاً من طلبات الشبكة المتتالية
--   2) قيد فريد جزئي لمنع فتح أكثر من جلسة جرد نشطة لنفس المستودع
--   3) تريجر تلقائي لتنظيف مسودات الجلسات عند الإلغاء أو الإكمال
--   4) تسجيل الترحيل في جدول سجلات الترحيلات
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) populate_audit_session_warehouse: Fast atomic bulk population
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.populate_audit_session_warehouse(
    p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_session record;
    v_user_id uuid;
    v_inserted_count integer := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT id, warehouse_id, company_id, status INTO v_session
    FROM public.audit_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'جلسة الجرد غير موجودة' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status <> 'active' THEN
        IF v_session.status = 'completed' THEN
            RAISE EXCEPTION 'لا يمكن تعديل بنود جلسة جرد مكتملة' USING ERRCODE = '22023';
        ELSE
            RAISE EXCEPTION 'لا يمكن تعديل بنود جلسة جرد ملغاة أو غير نشطة' USING ERRCODE = '22023';
        END IF;
    END IF;

    -- Multi-tenant check
    IF NOT (v_session.company_id IN (SELECT get_auth_companies())) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية الوصول لهذه المنشأة' USING ERRCODE = '42501';
    END IF;

    -- Role check
    IF NOT user_is_admin_or_manager(v_session.company_id) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية إدارة وتعبئة جلسات الجرد' USING ERRCODE = '42501';
    END IF;

    -- Atomic bulk insert / update from active products of the company for this warehouse
    INSERT INTO public.audit_items (
        session_id,
        product_id,
        expected_quantity,
        company_id,
        created_by
    )
    SELECT
        v_session.id,
        p.id,
        COALESCE(ps.quantity, 0),
        v_session.company_id,
        v_user_id
    FROM public.products p
    LEFT JOIN public.product_stock ps
        ON ps.product_id = p.id AND ps.warehouse_id = v_session.warehouse_id
    WHERE p.company_id = v_session.company_id
      AND p.deleted_at IS NULL
    ON CONFLICT (session_id, product_id)
    DO UPDATE SET expected_quantity = EXCLUDED.expected_quantity;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'warehouse_id', v_session.warehouse_id,
        'populated_count', v_inserted_count
    );
END;
$$;

-- Grants
REVOKE EXECUTE ON FUNCTION public.populate_audit_session_warehouse(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.populate_audit_session_warehouse(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 2) Partial Unique Index: Only one active session per warehouse
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_sessions_company_warehouse_active
  ON public.audit_sessions (company_id, warehouse_id)
  WHERE status = 'active';

-- ------------------------------------------------------------
-- 3) Auto-cleanup draft when session completes or is cancelled
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_audit_session_cleanup_draft()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IN ('completed', 'cancelled') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        DELETE FROM public.inventory_session_drafts WHERE session_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_session_cleanup_draft ON public.audit_sessions;
CREATE TRIGGER trg_audit_session_cleanup_draft
AFTER UPDATE OF status ON public.audit_sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_session_cleanup_draft();

-- ------------------------------------------------------------
-- 4) Register migration in schema_migrations
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'supabase_migrations')
     AND EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
     ) THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
    VALUES (20260912000015, 'harden_inventory_audit_bulk_and_constraints', NULL)
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
