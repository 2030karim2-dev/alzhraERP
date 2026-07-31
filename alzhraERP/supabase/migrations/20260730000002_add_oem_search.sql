-- ============================================================
-- Migration: Add OEM Part Number Search RPC
-- Date: 2026-07-30
-- ============================================================
-- This migration adds a search function that enables looking up
-- products by OEM part numbers, cross-references, and alternative
-- numbers — a critical workflow for automotive parts retail.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- search_by_oem
-- Purpose: Search products by OEM number, cross-reference,
--          alternative numbers, and supplier part numbers
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_by_oem(
    p_company_id UUID,
    p_search_term TEXT
)
RETURNS TABLE (
    product_id      UUID,
    product_name    TEXT,
    product_name_ar TEXT,
    product_sku     TEXT,
    match_quality   TEXT,
    source_number   TEXT,
    target_number   TEXT,
    brand           TEXT,
    stock_quantity  NUMERIC,
    sale_price      NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_term TEXT;
BEGIN
    v_term := TRIM(p_search_term);
    
    IF v_term = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    -- 1. Direct match on part_number
    SELECT 
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        'exact'::TEXT,
        v_term,
        p.part_number,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND (p.part_number ILIKE '%' || v_term || '%'
        OR p.sku ILIKE '%' || v_term || '%'
        OR p.barcode = v_term)
    GROUP BY p.id

    UNION ALL

    -- 2. Cross-reference matches
    SELECT 
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        pcr.match_quality::TEXT,
        v_term,
        p.part_number,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM product_cross_references pcr
    JOIN products p ON p.id = pcr.base_product_id
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE pcr.company_id = p_company_id
      AND p.status = 'active'
      AND EXISTS (
          SELECT 1 FROM products alt
          WHERE alt.id = pcr.alternative_product_id
            AND (alt.part_number ILIKE '%' || v_term || '%'
              OR alt.sku ILIKE '%' || v_term || '%'
              OR alt.barcode = v_term)
      )
    GROUP BY p.id, pcr.match_quality

    UNION ALL

    -- 3. Alternative numbers match
    SELECT 
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        'partial'::TEXT,
        v_term,
        p.alternative_numbers,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND p.alternative_numbers ILIKE '%' || v_term || '%'
    GROUP BY p.id

    -- 4. Supplier part number match
    UNION ALL
    SELECT 
        p.id,
        p.name,
        p.name_ar,
        p.sku,
        'partial'::TEXT,
        v_term,
        sp.supplier_part_number,
        p.brand,
        COALESCE(SUM(ps.quantity), 0),
        p.sale_price
    FROM supplier_prices sp
    JOIN products p ON p.id = sp.product_id
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE sp.company_id = p_company_id
      AND p.status = 'active'
      AND sp.supplier_part_number ILIKE '%' || v_term || '%'
    GROUP BY p.id, sp.supplier_part_number

    ORDER BY match_quality ASC, stock_quantity DESC
    LIMIT 50;
END;
$$;

COMMENT ON FUNCTION public.search_by_oem IS 
'Searches for products by OEM part number, cross-references, alternative numbers, and supplier part numbers. Returns results ordered by match quality (exact first) and stock availability.';

GRANT EXECUTE ON FUNCTION public.search_by_oem(UUID, TEXT) TO authenticated;