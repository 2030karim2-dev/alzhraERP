-- Migration: 20260906000001_normalize_arabic_digits_and_smart_search.sql
-- Description: Support Arabic/Persian digits (٠-٩, ۰-۹) in public.normalize_arabic
-- and include barcode searching in public.search_inventory_paginated.

-- 1. Upgrade public.normalize_arabic to convert Eastern Arabic and Persian digits to ASCII (0-9)
CREATE OR REPLACE FUNCTION public.normalize_arabic(p_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_text IS NULL THEN
        RETURN '';
    END IF;

    RETURN regexp_replace(
        replace(
            translate(
                lower(p_text),
                'أإآٱةىئؤ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
                'ااااهييو01234567890123456789'
            ),
            'ـ',
            ''
        ),
        '[\u064B-\u065F\u0670]',
        '',
        'g'
    );
END;
$function$;

-- 2. Upgrade public.search_inventory_paginated to include barcode matching with full Arabic normalization
CREATE OR REPLACE FUNCTION public.search_inventory_paginated(
  p_company_id uuid,
  p_term text,
  p_limit integer,
  p_offset integer,
  p_sort_key text,
  p_sort_dir text,
  p_branch_id uuid DEFAULT NULL::uuid
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
    p.purchase_price::numeric,
    p.sale_price::numeric,
    p.min_stock_level::numeric,
    p.unit,
    p.image_url,
    p.alternative_numbers,
    p.barcode,
    p.updated_at,
    p.created_at,
    p.status,
    p.category_id,
    CASE WHEN p.category_id IS NOT NULL THEN jsonb_build_object('id', p.category_id, 'name', pc.name) ELSE NULL END,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'quantity', ps.quantity,
          'warehouse_id', ps.warehouse_id,
          'warehouses', jsonb_build_object('name_ar', w.name_ar)
        )
      ) FILTER (
        WHERE ps.id IS NOT NULL 
          AND (p_branch_id IS NULL OR w.branch_id = p_branch_id OR w.branch_id IS NULL)
      ),
      '[]'::jsonb
    ),
    v_total
  FROM public.products p
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN public.product_stock ps ON ps.product_id = p.id
  LEFT JOIN public.warehouses w ON w.id = ps.warehouse_id
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL
    AND p.status = 'active'
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
  GROUP BY p.id, pc.name
  ORDER BY
    CASE WHEN p_sort_key = 'name_ar' AND p_sort_dir = 'asc' THEN p.name_ar END ASC,
    CASE WHEN p_sort_key = 'name_ar' AND p_sort_dir = 'desc' THEN p.name_ar END DESC,
    CASE WHEN p_sort_key = 'sku' AND p_sort_dir = 'asc' THEN p.sku END ASC,
    CASE WHEN p_sort_key = 'sku' AND p_sort_dir = 'desc' THEN p.sku END DESC,
    CASE WHEN p_sort_key = 'updated_at' AND p_sort_dir = 'asc' THEN p.updated_at END ASC,
    CASE WHEN p_sort_key = 'updated_at' AND p_sort_dir = 'desc' THEN p.updated_at END DESC,
    p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.normalize_arabic(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_inventory_paginated(uuid, text, integer, integer, text, text, uuid) TO authenticated;
