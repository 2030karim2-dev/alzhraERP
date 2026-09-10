-- ============================================================
-- Migration: 20260912000001_core_backbone_products_and_alerts.sql
-- ============================================================
-- الغرض:
--   1) إضافة عمود is_core لتمييز الأصناف الاستراتيجية (العمود الفقري).
--   2) تعديل القيمة الافتراضية لـ min_stock_level لتكون 0 بدلاً من 5.
--   3) إنشاء فهرس أداء للأصناف الاستراتيجية.
--   4) تحديث دالة search_inventory_paginated لدعم حقل is_core وفلترته.
-- ============================================================

BEGIN;

-- 1. إضافة عمود is_core في جدول المنتجات
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_core boolean NOT NULL DEFAULT false;

-- 2. تعديل القيمة الافتراضية للحد الأدنى من 5 إلى 0
ALTER TABLE public.products 
ALTER COLUMN min_stock_level SET DEFAULT 0;

-- 3. إنشاء فهرس مركب سريع للأصناف الاستراتيجية
CREATE INDEX IF NOT EXISTS idx_products_company_core 
ON public.products (company_id, is_core) 
WHERE deleted_at IS NULL;

-- 4. ترقية دالة search_inventory_paginated لإرجاع is_core ودعم الفلترة الاختيارية p_is_core
CREATE OR REPLACE FUNCTION public.search_inventory_paginated(
  p_company_id uuid,
  p_term text,
  p_limit integer,
  p_offset integer,
  p_sort_key text,
  p_sort_dir text,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_is_core boolean DEFAULT NULL::boolean
)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  name_ar text,
  sku text,
  part_number text,
  brand text,
  size text,
  description text,
  purchase_price numeric,
  sale_price numeric,
  min_stock_level numeric,
  unit text,
  image_url text,
  alternative_numbers text,
  barcode text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone,
  status text,
  category_id uuid,
  category jsonb,
  stock jsonb,
  is_core boolean,
  total_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_tokens text[];
  v_total integer;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  IF p_term IS NULL OR trim(p_term) = '' THEN
    v_tokens := ARRAY[]::text[];
  ELSE
    v_tokens := regexp_split_to_array(public.normalize_arabic(trim(p_term)), E'\\s+');
  END IF;

  SELECT count(*)::integer INTO v_total FROM public.products p
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL
    AND p.status = 'active'
    AND (p_is_core IS NULL OR p.is_core = p_is_core)
    AND (
      v_tokens = ARRAY[]::text[] OR NOT EXISTS (
        SELECT 1 FROM unnest(v_tokens) AS token WHERE NOT (
          public.normalize_arabic(p.name_ar) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.sku) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.part_number) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.barcode) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.brand) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.description) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.size) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.alternative_numbers) LIKE concat('%', token, '%')
        )
      )
    );

  RETURN QUERY
  SELECT
    p.id,
    p.company_id,
    p.name_ar,
    p.sku,
    p.part_number,
    p.brand,
    p.size,
    p.description,
    p.purchase_price,
    p.sale_price,
    p.min_stock_level::numeric,
    p.unit,
    p.image_url,
    p.alternative_numbers,
    p.barcode,
    p.updated_at,
    p.created_at,
    p.status,
    p.category_id,
    CASE
      WHEN cat.id IS NOT NULL THEN jsonb_build_object('id', cat.id, 'name', cat.name)
      ELSE NULL::jsonb
    END AS category,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'warehouse_id', ps.warehouse_id,
            'quantity', ps.quantity,
            'warehouse_name', w.name_ar
          )
        )
        FROM public.product_stock ps
        JOIN public.warehouses w ON w.id = ps.warehouse_id
        WHERE ps.product_id = p.id
          AND (
            p_branch_id IS NULL 
            OR w.branch_id = p_branch_id 
            OR w.branch_id IS NULL
          )
      ),
      '[]'::jsonb
    ) AS stock,
    p.is_core,
    v_total AS total_count
  FROM public.products p
  LEFT JOIN public.product_categories cat ON cat.id = p.category_id
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL
    AND p.status = 'active'
    AND (p_is_core IS NULL OR p.is_core = p_is_core)
    AND (
      v_tokens = ARRAY[]::text[] OR NOT EXISTS (
        SELECT 1 FROM unnest(v_tokens) AS token WHERE NOT (
          public.normalize_arabic(p.name_ar) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.sku) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.part_number) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.barcode) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.brand) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.description) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.size) LIKE concat('%', token, '%') OR
          public.normalize_arabic(p.alternative_numbers) LIKE concat('%', token, '%')
        )
      )
    )
  ORDER BY
    CASE WHEN p_sort_dir = 'asc'  AND p_sort_key = 'name_ar'        THEN p.name_ar        END ASC,
    CASE WHEN p_sort_dir = 'desc' AND p_sort_key = 'name_ar'        THEN p.name_ar        END DESC,
    CASE WHEN p_sort_dir = 'asc'  AND p_sort_key = 'part_number'    THEN p.part_number    END ASC,
    CASE WHEN p_sort_dir = 'desc' AND p_sort_key = 'part_number'    THEN p.part_number    END DESC,
    CASE WHEN p_sort_dir = 'asc'  AND p_sort_key = 'brand'          THEN p.brand          END ASC,
    CASE WHEN p_sort_dir = 'desc' AND p_sort_key = 'brand'          THEN p.brand          END DESC,
    CASE WHEN p_sort_dir = 'asc'  AND p_sort_key = 'sale_price'     THEN p.sale_price     END ASC,
    CASE WHEN p_sort_dir = 'desc' AND p_sort_key = 'sale_price'     THEN p.sale_price     END DESC,
    CASE WHEN p_sort_dir = 'asc'  AND p_sort_key = 'purchase_price' THEN p.purchase_price END ASC,
    CASE WHEN p_sort_dir = 'desc' AND p_sort_key = 'purchase_price' THEN p.purchase_price END DESC,
    CASE WHEN p_sort_dir = 'asc'  AND p_sort_key = 'created_at'     THEN p.created_at     END ASC,
    CASE WHEN p_sort_dir = 'desc' AND p_sort_key = 'created_at'     THEN p.created_at     END DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- منح الصلاحية
REVOKE EXECUTE ON FUNCTION public.search_inventory_paginated(uuid, text, integer, integer, text, text, uuid, boolean) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_inventory_paginated(uuid, text, integer, integer, text, text, uuid, boolean) TO authenticated;

COMMIT;
