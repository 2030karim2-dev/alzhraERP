-- ============================================================
-- Fix VIN Intelligence: inventory matching false positives
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) Fix get_matching_inventory_products
--    PROBLEM: brand_match fallback treats every product whose
--    brand = vehicle make as "compatible", e.g. ALL products
--    with brand='TOYOTA' show up for every Toyota vehicle.
--    FIX: Remove the loose brand fallback entirely.  Matching
--    is now driven ONLY by the part_compatibility graph, which
--    holds real compatibility evidence.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_matching_inventory_products(
    p_company_id uuid,
    p_vehicle_make text,
    p_vehicle_model text DEFAULT NULL::text,
    p_year integer DEFAULT NULL::integer
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_company uuid;
    v_result  jsonb;
BEGIN
    -- Enforce tenant isolation
    v_company := public.verify_company_access(p_company_id);

    SELECT jsonb_agg(row_to_json(r) ORDER BY r.compat_rank, r.name_ar)
    INTO v_result
    FROM (
        SELECT DISTINCT ON (p.id)
            p.id                                  AS product_id,
            p.sku,
            p.part_number,
            p.name_ar,
            p.brand,
            p.sale_price,
            p.status,
            pc.compatibility_status,
            pc.source                             AS match_source,
            CASE pc.compatibility_status
                WHEN 'CONFIRMED'      THEN 1
                WHEN 'POSSIBLE'       THEN 2
                WHEN 'UNKNOWN'        THEN 3
                WHEN 'NOT_COMPATIBLE' THEN 4
                ELSE 5
            END                                   AS compat_rank
        FROM public.part_compatibility pc
        JOIN public.products p
            ON p.company_id = v_company
            AND p.deleted_at IS NULL
            AND (
                lower(p.part_number) = lower(pc.part_number)
                OR lower(p.sku) = lower(pc.part_number)
            )
        WHERE pc.company_id = v_company
          AND lower(pc.vehicle_make) = lower(p_vehicle_make)
          AND (
              p_vehicle_model IS NULL
              OR pc.vehicle_model IS NULL
              OR lower(pc.vehicle_model) = lower(p_vehicle_model)
          )
          AND (
              p_year IS NULL
              OR pc.vehicle_year_from IS NULL
              OR (pc.vehicle_year_from <= p_year
                  AND (pc.vehicle_year_to IS NULL OR pc.vehicle_year_to >= p_year))
          )
        ORDER BY
            p.id,
            CASE pc.compatibility_status
                WHEN 'CONFIRMED'      THEN 1
                WHEN 'POSSIBLE'       THEN 2
                WHEN 'UNKNOWN'        THEN 3
                WHEN 'NOT_COMPATIBLE' THEN 4
                ELSE 5
            END
    ) r;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

-- Grant (mirrors existing baseline privileges)
GRANT EXECUTE ON FUNCTION public.get_matching_inventory_products(uuid, text, text, integer)
    TO authenticated;
