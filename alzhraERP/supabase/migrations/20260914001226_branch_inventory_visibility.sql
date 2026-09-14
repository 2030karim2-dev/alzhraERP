-- ============================================================
-- Migration: Branch Inventory Visibility Groups + Transfer Requests
-- ============================================================
-- الهدف: فرع محمد مستقل مالياً لكن يشارك رؤية المخزون
--        مع فروع أخرى ويستطيع طلب تحويل مخزون.
-- ============================================================

-- 1. إضافة عمود نوع التكامل على جدول الفروع
--    independent       = فرع مستقل بالكامل (الوضع الافتراضي)
--    full_integration  = تكامل كامل (مثل وائل وغمدان: مبيعات متقاطعة + ديون مشتركة)
--    inventory_only    = مستقل مالياً لكن يشارك رؤية المخزون فقط (مثل محمد)
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS integration_mode text NOT NULL DEFAULT 'independent'
  CHECK (integration_mode IN ('independent', 'full_integration', 'inventory_only'));

-- 2. مجموعات رؤية المخزون
CREATE TABLE IF NOT EXISTS public.branch_visibility_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- 3. أعضاء المجموعة (كل فرع ينضم لمجموعة)
CREATE TABLE IF NOT EXISTS public.branch_visibility_members (
  group_id   uuid NOT NULL REFERENCES public.branch_visibility_groups(id) ON DELETE CASCADE,
  branch_id  uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, branch_id)
);

-- 4. طلبات نقل المخزون
CREATE TABLE IF NOT EXISTS public.stock_transfer_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requester_branch_id uuid NOT NULL REFERENCES public.branches(id),
  source_branch_id    uuid NOT NULL REFERENCES public.branches(id),
  product_id          uuid NOT NULL REFERENCES public.products(id),
  requested_quantity  numeric(14,4) NOT NULL CHECK (requested_quantity > 0),
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  notes               text,
  created_by          uuid REFERENCES auth.users(id),
  reviewed_by         uuid REFERENCES auth.users(id),
  review_notes        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 5. Index للأداء
CREATE INDEX IF NOT EXISTS idx_branch_visibility_members_branch
  ON public.branch_visibility_members(branch_id, company_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_requests_company
  ON public.stock_transfer_requests(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_requests_requester
  ON public.stock_transfer_requests(requester_branch_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_requests_source
  ON public.stock_transfer_requests(source_branch_id, status);

-- 6. تحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION public.update_stock_transfer_request_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_transfer_requests_updated_at ON public.stock_transfer_requests;
CREATE TRIGGER trg_stock_transfer_requests_updated_at
  BEFORE UPDATE ON public.stock_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_transfer_request_timestamp();

-- 7. RLS Policies
ALTER TABLE public.branch_visibility_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_visibility_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_requests   ENABLE ROW LEVEL SECURITY;

-- قراءة المجموعات (لكل أعضاء الشركة)
DROP POLICY IF EXISTS "branch_visibility_groups_select" ON public.branch_visibility_groups;
CREATE POLICY "branch_visibility_groups_select"
  ON public.branch_visibility_groups FOR SELECT
  USING (company_id IN (SELECT get_auth_companies()));

DROP POLICY IF EXISTS "branch_visibility_members_select" ON public.branch_visibility_members;
CREATE POLICY "branch_visibility_members_select"
  ON public.branch_visibility_members FOR SELECT
  USING (company_id IN (SELECT get_auth_companies()));

-- قراءة طلبات النقل (جميع أعضاء الشركة)
DROP POLICY IF EXISTS "str_select" ON public.stock_transfer_requests;
CREATE POLICY "str_select"
  ON public.stock_transfer_requests FOR SELECT
  USING (company_id IN (SELECT get_auth_companies()));

-- إنشاء طلب نقل
DROP POLICY IF EXISTS "str_insert" ON public.stock_transfer_requests;
CREATE POLICY "str_insert"
  ON public.stock_transfer_requests FOR INSERT
  WITH CHECK (company_id IN (SELECT get_auth_companies()));

-- تحديث الطلب (الموافقة / الرفض / الإلغاء)
DROP POLICY IF EXISTS "str_update" ON public.stock_transfer_requests;
CREATE POLICY "str_update"
  ON public.stock_transfer_requests FOR UPDATE
  USING (company_id IN (SELECT get_auth_companies()));

-- 8. دالة RPC: إنشاء طلب نقل مخزون بشكل آمن
CREATE OR REPLACE FUNCTION public.create_stock_transfer_request(
  p_company_id          uuid,
  p_requester_branch_id uuid,
  p_source_branch_id    uuid,
  p_product_id          uuid,
  p_quantity            numeric,
  p_notes               text DEFAULT NULL,
  p_user_id             uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_request_id  uuid;
  v_real_uid    uuid := COALESCE(p_user_id, auth.uid());
  v_group_count integer;
BEGIN
  -- التحقق من أن الفرعين في نفس مجموعة رؤية المخزون
  SELECT COUNT(*) INTO v_group_count
  FROM branch_visibility_members bm1
  JOIN branch_visibility_members bm2 USING (group_id)
  WHERE bm1.branch_id = p_requester_branch_id
    AND bm2.branch_id = p_source_branch_id
    AND bm1.company_id = p_company_id;

  IF v_group_count = 0 THEN
    RAISE EXCEPTION 'الفرعان ليسا في نفس مجموعة رؤية المخزون';
  END IF;

  -- منع طلب نقل من نفس الفرع
  IF p_requester_branch_id = p_source_branch_id THEN
    RAISE EXCEPTION 'لا يمكن طلب نقل من الفرع نفسه';
  END IF;

  -- منع الكميات السالبة أو الصفرية
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'يجب أن تكون الكمية أكبر من الصفر';
  END IF;

  INSERT INTO stock_transfer_requests (
    company_id, requester_branch_id, source_branch_id,
    product_id, requested_quantity, notes, created_by
  ) VALUES (
    p_company_id, p_requester_branch_id, p_source_branch_id,
    p_product_id, p_quantity, p_notes, v_real_uid
  ) RETURNING id INTO v_request_id;

  -- إشعار فوري لمسؤولي الفرع المصدر عبر pg_notify
  PERFORM pg_notify(
    'stock_transfer_request',
    json_build_object(
      'request_id',          v_request_id,
      'requester_branch_id', p_requester_branch_id,
      'source_branch_id',    p_source_branch_id,
      'product_id',          p_product_id,
      'quantity',            p_quantity
    )::text
  );

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_stock_transfer_request TO authenticated;

-- 9. دالة RPC: الاستجابة لطلب نقل (موافقة / رفض / إلغاء وتلقائية التحويل الفعلي)
CREATE OR REPLACE FUNCTION public.respond_stock_transfer_request(
  p_request_id  uuid,
  p_action      text,   -- 'approve' | 'reject' | 'cancel'
  p_review_notes text DEFAULT NULL,
  p_user_id     uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_real_uid uuid := COALESCE(p_user_id, auth.uid());
  v_status   text;
  v_req      record;
  v_from_wh  uuid;
  v_to_wh    uuid;
  v_transfer_id uuid;
BEGIN
  -- التحقق من صلاحية الإجراء
  IF p_action NOT IN ('approve', 'reject', 'cancel') THEN
    RAISE EXCEPTION 'إجراء غير صالح: %', p_action;
  END IF;

  SELECT * INTO v_req
  FROM public.stock_transfer_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على الطلب أو تم معالجته مسبقاً';
  END IF;

  IF p_action = 'approve' THEN
    -- جلب مستودع الفرع المصدر
    SELECT id INTO v_from_wh 
    FROM public.warehouses 
    WHERE branch_id = v_req.source_branch_id AND company_id = v_req.company_id
    ORDER BY is_primary DESC, created_at ASC LIMIT 1;

    -- جلب مستودع الفرع الطالب
    SELECT id INTO v_to_wh 
    FROM public.warehouses 
    WHERE branch_id = v_req.requester_branch_id AND company_id = v_req.company_id
    ORDER BY is_primary DESC, created_at ASC LIMIT 1;

    IF v_from_wh IS NULL OR v_to_wh IS NULL THEN
      RAISE EXCEPTION 'تعذر العثور على مستودع لأحد الفرعين لإتمام النقل';
    END IF;

    -- إنشاء عملية النقل الفعلي للمخزون
    INSERT INTO public.stock_transfers (
      company_id, from_warehouse_id, to_warehouse_id, notes, status, created_by
    ) VALUES (
      v_req.company_id, v_from_wh, v_to_wh, 
      COALESCE(p_review_notes, 'تحويل مخزني بناء على طلب معتمد'),
      'pending', v_real_uid
    ) RETURNING id INTO v_transfer_id;

    INSERT INTO public.stock_transfer_items (
      transfer_id, company_id, product_id, quantity
    ) VALUES (
      v_transfer_id, v_req.company_id, v_req.product_id, v_req.requested_quantity
    );

    -- تنفيذ حركة المخزون (خصم من المصدر وإضافة للطالب)
    PERFORM public.process_stock_transfer(v_transfer_id);

    v_status := 'completed';
  ELSIF p_action = 'reject' THEN
    v_status := 'rejected';
  ELSE
    v_status := 'cancelled';
  END IF;

  UPDATE stock_transfer_requests
  SET status       = v_status,
      reviewed_by  = v_real_uid,
      review_notes = p_review_notes,
      updated_at   = now()
  WHERE id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_stock_transfer_request(uuid, text, text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.respond_stock_transfer_request TO authenticated;

-- 10. عمود CASE يجعل قراءة product_stock مرنة لأعضاء مجموعة الرؤية
-- ملاحظة: RLS لجدول product_stock تسمح فعلاً بقراءة الكميات
-- لأعضاء نفس الشركة. نظام المجموعات هو طبقة معلوماتية منطقية
-- وليس قيداً صارماً من قاعدة البيانات (يتم فرضه في طبقة التطبيق).

COMMENT ON TABLE public.branch_visibility_groups IS
  'مجموعات الفروع التي تشارك رؤية المخزون فيما بينها (دون مشاركة مالية)';
COMMENT ON TABLE public.branch_visibility_members IS
  'أعضاء كل مجموعة رؤية مخزون';
COMMENT ON TABLE public.stock_transfer_requests IS
  'طلبات نقل المخزون بين الفروع التي تشارك رؤية المخزون فقط';
