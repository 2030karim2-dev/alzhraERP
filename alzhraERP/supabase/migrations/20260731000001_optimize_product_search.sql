-- ============================================================
-- Migration: Optimize Product Search (Fuzzy & Multi-Attribute)
-- Date: 2026-07-31
-- ============================================================

-- 1. Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add global_search_text column to products table
-- We use a regular text column and a trigger because GENERATED ALWAYS AS 
-- cannot easily be modified if the table definition changes, but since this is 
-- Postgres 12+, we CAN use GENERATED ALWAYS AS. Let's use it for simplicity.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS global_search_text text GENERATED ALWAYS AS (
    COALESCE(name_ar, '') || ' ' || 
    COALESCE(sku, '') || ' ' || 
    COALESCE(part_number, '') || ' ' || 
    COALESCE(alternative_numbers, '') || ' ' || 
    COALESCE(size, '') || ' ' || 
    COALESCE(brand, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(specifications, '') || ' ' ||
    COALESCE(location, '') || ' ' ||
    COALESCE(barcode, '')
) STORED;

-- 3. Create a GIN index on global_search_text using gin_trgm_ops
CREATE INDEX IF NOT EXISTS idx_products_global_search 
ON public.products USING gin (global_search_text gin_trgm_ops);

-- 4. Rewrite search_inventory RPC
-- This new function splits the term by spaces for fragmented matching
-- and uses similarity() for ranking.
DROP FUNCTION IF EXISTS public.search_inventory(text, uuid);
CREATE OR REPLACE FUNCTION public.search_inventory(p_term text, p_company_id uuid)
RETURNS TABLE (
    id uuid,
    name_ar text,
    sku text,
    part_number text,
    brand text,
    sale_price numeric,
    cost_price numeric,
    stock_quantity numeric,
    alternative_numbers text,
    size text,
    category_name text,
    image_url text,
    location text,
    barcode text,
    status text,
    search_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_words text[];
    v_word text;
    v_fragment_condition text := '';
BEGIN
    -- Handle exact barcode match quickly
    IF EXISTS (SELECT 1 FROM products WHERE company_id = p_company_id AND barcode = p_term LIMIT 1) THEN
        RETURN QUERY
        SELECT
            p.id, p.name_ar::text, p.sku::text, p.part_number::text, p.brand::text,
            p.sale_price, p.cost_price, COALESCE(SUM(ps.quantity), 0) AS stock_quantity,
            p.alternative_numbers::text, p.size::text, pc.name::text AS category_name,
            p.image_url::text, p.location::text, p.barcode::text, p.status::text,
            100.0::real AS search_score
        FROM products p
        LEFT JOIN product_stock ps ON ps.product_id = p.id
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        WHERE p.company_id = p_company_id AND p.barcode = p_term AND p.deleted_at IS NULL
        GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.brand, p.sale_price, p.cost_price, p.alternative_numbers, p.size, pc.name, p.image_url, p.location, p.barcode, p.status;
        RETURN;
    END IF;

    -- Standard Fuzzy & Fragmented Search
    RETURN QUERY
    SELECT
        p.id, p.name_ar::text, p.sku::text, p.part_number::text, p.brand::text,
        p.sale_price, p.cost_price, COALESCE(SUM(ps.quantity), 0) AS stock_quantity,
        p.alternative_numbers::text, p.size::text, pc.name::text AS category_name,
        p.image_url::text, p.location::text, p.barcode::text, p.status::text,
        (
            -- Boost exact/prefix matches
            CASE 
                WHEN p.sku ILIKE p_term THEN 5.0
                WHEN p.part_number ILIKE p_term THEN 5.0
                WHEN p.name_ar ILIKE p_term || '%' THEN 3.0
                ELSE 0.0
            END
            +
            -- Add similarity score (0.0 to 1.0)
            similarity(p.global_search_text, p_term)
        )::real AS search_score
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.company_id = p_company_id
      AND p.deleted_at IS NULL
      AND p.status = 'active'
      -- Word similarity allows fragmented searches
      -- (Each word in the term should be found somewhere in the global_search_text)
      AND (
          -- If the term is very short, use ILIKE instead of similarity to avoid discarding it
          (length(p_term) < 3 AND p.global_search_text ILIKE '%' || p_term || '%')
          OR
          (p_term <% p.global_search_text) -- word similarity
          OR
          (p.global_search_text % p_term)  -- standard trigram similarity
          OR
          -- Simple fallback for fragmented words
          (p.global_search_text ILIKE '%' || replace(p_term, ' ', '%') || '%')
      )
    GROUP BY p.id, p.name_ar, p.sku, p.part_number, p.brand, p.sale_price, p.cost_price, p.alternative_numbers, p.size, pc.name, p.image_url, p.location, p.barcode, p.status, p.global_search_text
    ORDER BY search_score DESC
    LIMIT 200;
END;
$$;
