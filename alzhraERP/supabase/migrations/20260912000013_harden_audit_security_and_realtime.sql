-- ============================================================
-- Migration: 20260912000013_harden_audit_security_and_realtime.sql
-- الغرض: إصلاح الثغرات الحرجة المكتشفة في تدقيق قسم الجرد:
--   1) add_audit_session_item: التحقق من انتماء المنتج لمنشأة الجلسة
--   2) finalize_audit_session: رفض أي منتج غير مرصود في audit_items،
--      ورفض الكميات السالبة/غير الرقمية بدلاً من كتمها
--   3) save_audit_progress: إضافة فحص الدور (admin/manager)
--   4) استعادة شرط الدور في سياسات inventory_session_drafts
--   5) قيد فريد جزئي يمنع جلستين نشطتين لنفس المستودع
--   6) قيد CHECK على حالات الجلسة
--   7) إضافة audit_items و audit_sessions لمنشور supabase_realtime
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) add_audit_session_item: tenant-owned product validation
-- ------------------------------------------------------------
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
        RAISE EXCEPTION 'جلسة الجرد غير موجودة' USING ERRCODE = 'P0002';
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

    -- [SEC-FIX] المنتج يجب أن ينتمي لمنشأة الجلسة وغير محذوف — الدالة SECURITY DEFINER
    -- تتجاوز RLS لذا الفحص هنا إلزامي لمنع تلوث/إتلاف مخزون منشأة أخرى.
    SELECT id, name_ar, sku, part_number, brand, size, pc.name AS category_name
    INTO v_product
    FROM public.products p
    LEFT JOIN public.product_categories pc ON pc.id = p.category_id
    WHERE p.id = p_product_id
      AND p.company_id = v_session.company_id
      AND p.deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المنتج غير موجود أو لا ينتمي لمنشأة جلسة الجرد' USING ERRCODE = '22023';
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

-- ------------------------------------------------------------
-- 2) finalize_audit_session: strict session membership + sane quantities
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 3) save_audit_progress: enforce admin/manager role (مطابقة بقية الوحدة)
-- ------------------------------------------------------------
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
        RAISE EXCEPTION 'جلسة الجرد غير موجودة' USING ERRCODE = 'P0002';
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

    -- [SEC-FIX] فحص الدور: حفظ كميات الجرد يتطلب admin أو manager (سد ثغرة viewer)
    IF NOT user_is_admin_or_manager(v_session.company_id) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية تعديل كميات الجرد' USING ERRCODE = '42501';
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
        )
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
          );

        GET DIAGNOSTICS v_updated_count = ROW_COUNT;

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

-- ------------------------------------------------------------
-- 4) RLS: استعادة شرط الدور في سياسات المسودات
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "inventory_session_drafts_insert" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_insert" ON public.inventory_session_drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
        AND user_is_admin_or_manager(s.company_id)
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
        AND user_is_admin_or_manager(s.company_id)
    )
  );

-- توسيع DELETE (كان admin فقط) لتشمل manager — يتوافق مع مسار RPC delete_audit_session_item
DROP POLICY IF EXISTS "inventory_session_drafts_delete" ON public.inventory_session_drafts;
CREATE POLICY "inventory_session_drafts_delete" ON public.inventory_session_drafts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audit_sessions s
      WHERE s.id = inventory_session_drafts.session_id
        AND s.company_id IN (SELECT get_auth_companies())
        AND user_is_admin_or_manager(s.company_id)
    )
  );

-- ------------------------------------------------------------
-- 5) قيد فريد جزئي: جلستا نشطة لنفس المستودع غير مسموحتين
-- إغلاق أي تكرارات تاريخية أولاً (يُبقى أحدث جلسة نشطة فقط لكل مستودع)
-- ------------------------------------------------------------
UPDATE public.audit_sessions s
SET status = 'cancelled',
    completed_at = NOW()
WHERE s.status = 'active'
  AND s.id NOT IN (
    SELECT DISTINCT ON (company_id, warehouse_id) id
    FROM public.audit_sessions
    WHERE status = 'active'
    ORDER BY company_id, warehouse_id, created_at DESC
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_sessions_company_warehouse_active
  ON public.audit_sessions (company_id, warehouse_id)
  WHERE status = 'active';

-- ------------------------------------------------------------
-- 6) قيد CHECK على حالات الجلسة
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_sessions_status_check'
      AND conrelid = 'public.audit_sessions'::regclass
  ) THEN
    ALTER TABLE public.audit_sessions
      ADD CONSTRAINT audit_sessions_status_check
      CHECK (status IN ('active', 'completed', 'cancelled'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 7) Realtime: إضافة جداول الجرد لمنشور supabase_realtime (idempotent)
--    كان useStockAudit يشترك في postgres_changes على audit_items
--    دون وجود الجدول في المنشور → قناة صامتة لا أحداث.
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- الجدول مضاف مسبقاً
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_sessions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ------------------------------------------------------------
-- Grants (حفظ التواقيع الحالية)
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.add_audit_session_item(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_audit_session_item(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_audit_session(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_audit_progress(uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.add_audit_session_item(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_audit_session_item(uuid, uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_audit_session(uuid, uuid, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_audit_progress(uuid, jsonb) FROM anon, PUBLIC;

COMMIT;
