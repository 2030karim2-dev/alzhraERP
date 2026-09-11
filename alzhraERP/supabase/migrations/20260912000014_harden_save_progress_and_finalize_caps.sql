-- ============================================================
-- Migration: 20260912000014_harden_save_progress_and_finalize_caps.sql
-- الغرض: استكمال تحصين قسم الجرد (الجولة الثانية):
--   1) save_audit_progress: رفض الكميات السالبة وغير الرقمية (NaN/Infinity)
--      بدلاً من تخزينها ثم فشل الاعتماد لاحقاً
--   2) finalize_audit_session: سقف كمي (1,000,000) وسقف عدد عناصر (10,000)
--   3) finalize_audit_session: الهوية من الخادم فقط — تجاهل p_user_id القادم
--      من العميل (إلغاء COALESCE مع بقاء التوقيع للتوافق)
--   4) تسجيل الترحيلين 20260912000013/14 في supabase_migrations.schema_migrations
--      (طُبقا حياً عبر Management API قبل إنشاء هذا السجل)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) save_audit_progress: quantity sanity validation
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

    -- Role check: saving audit quantities requires admin or manager
    IF NOT user_is_admin_or_manager(v_session.company_id) THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية تعديل كميات الجرد' USING ERRCODE = '42501';
    END IF;

    IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' AND jsonb_array_length(p_items) > 0 THEN
        -- [SEC-FIX] quantity sanity: رفض السالب/NaN/Infinity قبل أي تخزين
        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_items) elem
            WHERE elem->>'counted_quantity' IS NOT NULL
              AND elem->>'counted_quantity' <> ''
              AND (
                    (elem->>'counted_quantity')::numeric < 0
                 OR (elem->>'counted_quantity')::numeric = 'NaN'::numeric
                 OR (elem->>'counted_quantity')::numeric = 'Infinity'::numeric
                 OR (elem->>'counted_quantity')::numeric > 1000000
              )
        ) THEN
            RAISE EXCEPTION 'كمية الجرد غير صالحة (يجب أن تكون بين 0 و 1000000)' USING ERRCODE = '22023';
        END IF;

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
-- 2) finalize_audit_session: caps + server-authoritative identity
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
    -- [SEC-FIX] الهوية من الخادم فقط: p_user_id من العميل يُتجاهل (التوقيع محفوظ للتوافق)
    v_effective_user_id := auth.uid();

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

    -- [SEC-FIX] سقف عدد العناصر: منع استنزاف أقفال الصفوف بحمولة ضخمة
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'بنود الاعتماد غير صالحة' USING ERRCODE = '22023';
    END IF;

    IF jsonb_array_length(p_items) > 10000 THEN
        RAISE EXCEPTION 'عدد بنود الاعتماد يتجاوز الحد المسموح (10000)' USING ERRCODE = '22023';
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
           OR v_raw_qty = '-Infinity'::NUMERIC
           OR v_raw_qty < 0
           OR v_raw_qty > 1000000 THEN
            RAISE EXCEPTION 'كمية الجرد غير صالحة للمنتج %', (v_item->>'product_id') USING ERRCODE = '22023';
        END IF;

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
-- 4) Register applied migrations in supabase_migrations.schema_migrations
--    (applied live via Management API before this record existed)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'supabase_migrations')
     AND EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
     ) THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
    VALUES
      (20260912000013, 'harden_audit_security_and_realtime', NULL),
      (20260912000014, 'harden_save_progress_and_finalize_caps', NULL)
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

-- Grants (حفظ التواقيع الحالية)
GRANT EXECUTE ON FUNCTION public.finalize_audit_session(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_audit_progress(uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.finalize_audit_session(uuid, uuid, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_audit_progress(uuid, jsonb) FROM anon, PUBLIC;

COMMIT;
