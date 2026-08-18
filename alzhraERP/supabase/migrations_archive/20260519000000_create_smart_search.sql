-- 1. دالة توحيد الحروف العربية إملائياً وإزالة التشكيل
CREATE OR REPLACE FUNCTION public.normalize_arabic(p_text text)
RETURNS text AS $$
BEGIN
    IF p_text IS NULL THEN
        RETURN '';
    END IF;
    RETURN regexp_replace(
        translate(
            lower(p_text),
            'أإآةى',
            'اااهي'
        ),
        '[\u064B-\u065F]', -- إزالة الحركات
        '',
        'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 2. دالة البحث المرقّم الذكي المتوافق مع الفلاتر المتعددة والترتيب والكميات
CREATE OR REPLACE FUNCTION public.search_inventory_paginated(
    p_company_id uuid,
    p_term text,
    p_limit integer,
    p_offset integer,
    p_sort_key text,
    p_sort_dir text
)
RETURNS TABLE (
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
    updated_at timestamptz,
    created_at timestamptz,
    status text,
    category_id uuid,
    category jsonb,
    stock jsonb,
    total_count integer
) AS $$
DECLARE
    v_tokens text[];
BEGIN
    -- تجزئة وتوحيد كلمات البحث
    IF p_term IS NULL OR trim(p_term) = '' THEN
        v_tokens := ARRAY[]::text[];
    ELSE
        v_tokens := regexp_split_to_array(public.normalize_arabic(p_term), '\s+');
    END IF;

    RETURN QUERY
    WITH filtered_products AS (
        SELECT 
            p.id,
            p.company_id,
            p.name_ar,
            p.sku,
            p.part_number,
            p.brand,
            p.size,
            p.description,
            p.purchase_price::numeric as purchase_price,
            p.sale_price::numeric as sale_price,
            p.min_stock_level::numeric as min_stock_level,
            p.unit,
            p.image_url,
            p.alternative_numbers,
            p.barcode,
            p.updated_at,
            p.created_at,
            p.status,
            p.category_id,
            CASE 
                WHEN p.category_id IS NOT NULL THEN jsonb_build_object('id', p.category_id, 'name', pc.name)
                ELSE NULL
            END as category,
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'quantity', ps.quantity,
                        'warehouse_id', ps.warehouse_id,
                        'warehouses', jsonb_build_object('name_ar', w.name_ar)
                    )
                ) FILTER (WHERE ps.id IS NOT NULL), 
                '[]'::jsonb
            ) as stock
        FROM public.products p
        LEFT JOIN public.product_categories pc ON pc.id = p.category_id
        LEFT JOIN public.product_stock ps ON ps.product_id = p.id
        LEFT JOIN public.warehouses w ON w.id = ps.warehouse_id
        WHERE p.company_id = p_company_id 
          AND p.status = 'active'
          AND (
              v_tokens = ARRAY[]::text[] OR
              NOT EXISTS (
                  SELECT 1 
                  FROM unnest(v_tokens) AS token 
                  WHERE NOT (
                      public.normalize_arabic(p.name_ar) LIKE '%' || token || '%' OR
                      public.normalize_arabic(p.sku) LIKE '%' || token || '%' OR
                      public.normalize_arabic(p.part_number) LIKE '%' || token || '%' OR
                      public.normalize_arabic(p.brand) LIKE '%' || token || '%' OR
                      public.normalize_arabic(p.description) LIKE '%' || token || '%' OR
                      public.normalize_arabic(p.size) LIKE '%' || token || '%' OR
                      public.normalize_arabic(p.alternative_numbers) LIKE '%' || token || '%'
                  )
              )
          )
        GROUP BY p.id, pc.name
    ),
    counted_products AS (
        SELECT *, count(*)::integer OVER() as full_count FROM filtered_products
    )
    SELECT 
        c.id, c.company_id, c.name_ar, c.sku, c.part_number, c.brand, c.size, c.description,
        c.purchase_price, c.sale_price, c.min_stock_level, c.unit, c.image_url,
        c.alternative_numbers, c.barcode, c.updated_at, c.created_at, c.status,
        c.category_id, c.category, c.stock, c.full_count
    FROM counted_products c
    ORDER BY 
        CASE WHEN p_sort_key = 'name_ar' AND p_sort_dir = 'asc' THEN c.name_ar END ASC,
        CASE WHEN p_sort_key = 'name_ar' AND p_sort_dir = 'desc' THEN c.name_ar END DESC,
        CASE WHEN p_sort_key = 'sku' AND p_sort_dir = 'asc' THEN c.sku END ASC,
        CASE WHEN p_sort_key = 'sku' AND p_sort_dir = 'desc' THEN c.sku END DESC,
        CASE WHEN p_sort_key = 'updated_at' AND p_sort_dir = 'asc' THEN c.updated_at END ASC,
        CASE WHEN p_sort_key = 'updated_at' AND p_sort_dir = 'desc' THEN c.updated_at END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
