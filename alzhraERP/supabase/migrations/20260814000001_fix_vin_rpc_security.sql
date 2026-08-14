-- ============================================================
-- Migration: VIN Intelligence — RPC Security + Data Integrity Fixes
-- Date: 2026-08-14
--
-- Fixes (post security-audit):
--  1) get_matching_inventory_products was SECURITY DEFINER without a
--     tenant check → any caller (even `anon`) could pass an arbitrary
--     company_id and read that company's products. Adds
--     verify_company_access() and dedupe-per-product (DISTINCT ON).
--  2) ensure_vehicle failed when p_model was NULL (vehicles.model is
--     NOT NULL) and wrote year=0 for unknown years, breaking matching.
--  3) part_compatibility unique constraint treated NULLs as distinct,
--     so the upsert never conflicted → duplicate graph edges.
--  4) Least-privilege grants: revoke public execute; grant only to
--     authenticated (read RPCs) and service_role (edge-function RPCs).
-- ============================================================

-- ------------------------------------------------------------
-- 1) get_matching_inventory_products — tenant check + dedupe
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_matching_inventory_products(
    p_company_id    UUID,
    p_vehicle_make  TEXT,
    p_vehicle_model TEXT DEFAULT NULL,
    p_year          INTEGER DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_company uuid;
    v_result  jsonb;
BEGIN
    -- Enforce tenant isolation: raises 42501 unless p_company_id matches
    -- the caller's own company (mirrors other hardened RPCs).
    v_company := public.verify_company_access(p_company_id);

    SELECT jsonb_agg(row_to_json(r) ORDER BY (r.match_source <> 'brand_match') DESC, r.name_ar)
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
            COALESCE(pc.compatibility_status, 'UNKNOWN') AS compatibility_status,
            COALESCE(pc.source, 'brand_match')           AS match_source
        FROM public.products p
        LEFT JOIN public.part_compatibility pc
            ON pc.company_id = v_company
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
            AND (
                lower(p.part_number) = lower(pc.part_number)
                OR lower(p.sku) = lower(pc.part_number)
            )
        WHERE p.company_id = v_company
          AND p.deleted_at IS NULL
          AND (
              pc.id IS NOT NULL
              OR (p.brand IS NOT NULL AND lower(p.brand) = lower(p_vehicle_make))
          )
        ORDER BY
            p.id,
            CASE COALESCE(pc.compatibility_status, 'UNKNOWN')
                WHEN 'CONFIRMED' THEN 1
                WHEN 'POSSIBLE' THEN 2
                WHEN 'UNKNOWN' THEN 3
                WHEN 'NOT_COMPATIBLE' THEN 4
                ELSE 5
            END,
            (pc.id IS NOT NULL) DESC
    ) r;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ------------------------------------------------------------
-- 2) ensure_vehicle — handle NULL model/year safely
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_vehicle(
    p_make         TEXT,
    p_model        TEXT DEFAULT NULL,
    p_year         INTEGER DEFAULT NULL,
    p_engine       TEXT DEFAULT NULL,
    p_body_type    TEXT DEFAULT NULL,
    p_drive_type   TEXT DEFAULT NULL,
    p_fuel_type    TEXT DEFAULT NULL,
    p_transmission TEXT DEFAULT NULL,
    p_region       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id    UUID;
    v_model TEXT  := COALESCE(NULLIF(TRIM(p_model), ''), '');
    v_year  INTEGER := COALESCE(p_year, 0);
BEGIN
    -- Find an existing vehicle (case-insensitive make + model, year in range).
    -- year_start = 0 means "unknown" and matches any requested year.
    SELECT id INTO v_id
    FROM public.vehicles
    WHERE lower(make) = lower(p_make)
      AND (p_model IS NULL OR lower(COALESCE(model, '')) = lower(p_model))
      AND (
            p_year IS NULL
            OR year_start = 0
            OR (year_start <= p_year AND year_end >= p_year)
          )
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    INSERT INTO public.vehicles (
        make, model, year_start, year_end,
        engine, body_type, drive_type, fuel_type, transmission, region
    ) VALUES (
        p_make, v_model, v_year, v_year,
        p_engine, p_body_type, p_drive_type, p_fuel_type, p_transmission, p_region
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ------------------------------------------------------------
-- 3) part_compatibility — dedupe + tighten unique (NULLs equal)
-- ------------------------------------------------------------
DELETE FROM public.part_compatibility a
USING public.part_compatibility b
WHERE a.company_id = b.company_id
  AND a.part_number = b.part_number
  AND a.vehicle_make = b.vehicle_make
  AND a.vehicle_model IS NOT DISTINCT FROM b.vehicle_model
  AND a.vehicle_year_from IS NOT DISTINCT FROM b.vehicle_year_from
  AND a.vehicle_year_to IS NOT DISTINCT FROM b.vehicle_year_to
  AND a.ctid < b.ctid;

ALTER TABLE public.part_compatibility
    DROP CONSTRAINT IF EXISTS uq_part_compat;

ALTER TABLE public.part_compatibility
    ADD CONSTRAINT uq_part_compat
    UNIQUE NULLS NOT DISTINCT (company_id, part_number, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to);

-- ------------------------------------------------------------
-- 4) Least privilege — revoke public execute, grant explicitly
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_matching_inventory_products(uuid, text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_vehicle_from_vin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_vehicle(text, text, integer, text, text, text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_matching_inventory_products(uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_vehicle_from_vin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_vehicle_from_vin(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_vehicle(text, text, integer, text, text, text, text, text, text) TO service_role;

