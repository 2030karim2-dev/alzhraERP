-- ============================================================
-- Migration: VIN Intelligence — Fixes (post-audit)
-- Date: 2026-08-13
-- 1) Expand vin_analyses.source to include vpic/db (BUG-1)
-- 2) Expand part_compatibility.source to include MEGAZIP (BUG-3)
-- 3) Add ensure_vehicle RPC — find-or-create a vehicle row so
--    vPIC-decoded vehicles get a stable id for linking (BUG-2)
-- ============================================================

-- 1) vin_analyses.source — allow the real decode sources
ALTER TABLE public.vin_analyses
    DROP CONSTRAINT IF EXISTS vin_analyses_source_check;
ALTER TABLE public.vin_analyses
    ADD CONSTRAINT vin_analyses_source_check
    CHECK (source IN ('manual','ai','hybrid','vpic','db'));

-- 2) part_compatibility.source — allow megazip catalog source
ALTER TABLE public.part_compatibility
    DROP CONSTRAINT IF EXISTS part_compatibility_source_check;
ALTER TABLE public.part_compatibility
    ADD CONSTRAINT part_compatibility_source_check
    CHECK (source IN ('INTERNAL_OEM','FAPI','TECDOC','MANUAL','AI','MEGAZIP'));

-- 3) ensure_vehicle — find-or-create a vehicle row (global catalog)
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
    v_id   UUID;
    v_year INTEGER := COALESCE(p_year, 0);
BEGIN
    -- Find an existing vehicle (case-insensitive make + model, year in range)
    SELECT id INTO v_id
    FROM public.vehicles
    WHERE lower(make) = lower(p_make)
      AND (p_model IS NULL OR lower(COALESCE(model, '')) = lower(p_model))
      AND (p_year IS NULL OR (year_start <= p_year AND year_end >= p_year))
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    INSERT INTO public.vehicles (
        make, model, year_start, year_end,
        engine, body_type, drive_type, fuel_type, transmission, region
    ) VALUES (
        p_make, p_model, v_year, v_year,
        p_engine, p_body_type, p_drive_type, p_fuel_type, p_transmission, p_region
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;
