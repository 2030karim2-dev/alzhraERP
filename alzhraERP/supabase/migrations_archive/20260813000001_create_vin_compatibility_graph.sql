-- ============================================================
-- Migration: VIN Intelligence — Internal Compatibility Graph
-- Date: 2026-08-13
-- Phase 1 — Core Engine: "Graph of Truth" for VIN ↔ Vehicle ↔ Parts
--
-- Architecture: Internal Graph is the single source of truth.
-- FAPI/AI are only enrichment layers (never authoritative).
--
-- Creates:
--   Tables:  part_compatibility, vehicle_products, vin_analyses
--   RPCs:    resolve_vehicle_from_vin(TEXT)
--            get_matching_inventory_products(UUID, TEXT, TEXT, INTEGER)
--
-- NOTE: public.vehicles (with vin_prefix) is a GLOBAL catalog
--       table and is the anchor node of the graph.
-- ============================================================

-- ------------------------------------------------------------
-- Table 1: part_compatibility  (part ↔ vehicle knowledge edge)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.part_compatibility (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    part_number          TEXT NOT NULL,
    manufacturer         TEXT,
    vehicle_make         TEXT NOT NULL,
    vehicle_model        TEXT,
    vehicle_year_from    INTEGER,
    vehicle_year_to      INTEGER,
    engine_code          TEXT,
    compatibility_status TEXT NOT NULL DEFAULT 'UNKNOWN'
                         CHECK (compatibility_status IN ('CONFIRMED','POSSIBLE','UNKNOWN','NOT_COMPATIBLE')),
    source               TEXT NOT NULL DEFAULT 'MANUAL'
                         CHECK (source IN ('INTERNAL_OEM','FAPI','TECDOC','MANUAL','AI')),
    confidence           NUMERIC(5,2),
    evidence             JSONB,
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_part_compat UNIQUE (company_id, part_number, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to)
);

-- ------------------------------------------------------------
-- Table 2: vehicle_products  (vehicle ↔ inventory product link)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    vehicle_id      UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    fitment_status  TEXT NOT NULL DEFAULT 'UNKNOWN'
                    CHECK (fitment_status IN ('CONFIRMED','POSSIBLE','UNKNOWN','NOT_COMPATIBLE')),
    source          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual','vin_extract')),
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_vehicle_product UNIQUE (vehicle_id, product_id)
);

-- ------------------------------------------------------------
-- Table 3: vin_analyses  (VIN decode history)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vin_analyses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    vin         TEXT NOT NULL,
    vehicle_id  UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    decoded     JSONB,
    source      TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual','ai','hybrid')),
    created_by  UUID,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_part_compat_company   ON public.part_compatibility(company_id);
CREATE INDEX IF NOT EXISTS idx_part_compat_part      ON public.part_compatibility(part_number);
CREATE INDEX IF NOT EXISTS idx_part_compat_vehicle   ON public.part_compatibility(vehicle_make, vehicle_model);
CREATE INDEX IF NOT EXISTS idx_vehicle_products_company ON public.vehicle_products(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_products_vehicle ON public.vehicle_products(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_products_product ON public.vehicle_products(product_id);
CREATE INDEX IF NOT EXISTS idx_vin_analyses_company  ON public.vin_analyses(company_id);
CREATE INDEX IF NOT EXISTS idx_vin_analyses_vin      ON public.vin_analyses(vin);


-- ------------------------------------------------------------
-- RLS: tenant isolation via company_id (matches project pattern)
-- ------------------------------------------------------------
ALTER TABLE public.part_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vin_analyses ENABLE ROW LEVEL SECURITY;

-- ── part_compatibility ─────────────────────────────────────
DROP POLICY IF EXISTS "part_compatibility_select" ON public.part_compatibility;
CREATE POLICY "part_compatibility_select" ON public.part_compatibility
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "part_compatibility_insert" ON public.part_compatibility;
CREATE POLICY "part_compatibility_insert" ON public.part_compatibility
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "part_compatibility_update" ON public.part_compatibility;
CREATE POLICY "part_compatibility_update" ON public.part_compatibility
    FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id()
           AND public.user_is_admin_or_manager())
    WITH CHECK (company_id = public.get_user_company_id()
                AND public.user_is_admin_or_manager());

DROP POLICY IF EXISTS "part_compatibility_delete" ON public.part_compatibility;
CREATE POLICY "part_compatibility_delete" ON public.part_compatibility
    FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id()
           AND public.get_user_role() = 'admin');

-- ── vehicle_products ───────────────────────────────────────
DROP POLICY IF EXISTS "vehicle_products_select" ON public.vehicle_products;
CREATE POLICY "vehicle_products_select" ON public.vehicle_products
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "vehicle_products_insert" ON public.vehicle_products;
CREATE POLICY "vehicle_products_insert" ON public.vehicle_products
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "vehicle_products_update" ON public.vehicle_products;
CREATE POLICY "vehicle_products_update" ON public.vehicle_products
    FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "vehicle_products_delete" ON public.vehicle_products;
CREATE POLICY "vehicle_products_delete" ON public.vehicle_products
    FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id()
           AND public.get_user_role() = 'admin');

-- ── vin_analyses ───────────────────────────────────────────
DROP POLICY IF EXISTS "vin_analyses_select" ON public.vin_analyses;
CREATE POLICY "vin_analyses_select" ON public.vin_analyses
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "vin_analyses_insert" ON public.vin_analyses;
CREATE POLICY "vin_analyses_insert" ON public.vin_analyses
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "vin_analyses_update" ON public.vin_analyses;
CREATE POLICY "vin_analyses_update" ON public.vin_analyses
    FOR UPDATE TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "vin_analyses_delete" ON public.vin_analyses;
CREATE POLICY "vin_analyses_delete" ON public.vin_analyses
    FOR DELETE TO authenticated
    USING (company_id = public.get_user_company_id()
           AND public.get_user_role() = 'admin');

-- ============================================================
-- RPC 1: resolve_vehicle_from_vin
-- Resolves a VIN to a vehicle via longest vin_prefix match
-- (down to the 3-char WMI). Returns {found, vin, vehicle}.
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_vehicle_from_vin(
    p_vin TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_normalized TEXT;
    v_vehicle    jsonb;
    v_len        INTEGER;
BEGIN
    v_normalized := upper(regexp_replace(COALESCE(p_vin, ''), '[^A-HJ-NPR-Z0-9]', '', 'g'));

    IF length(v_normalized) < 3 THEN
        RETURN jsonb_build_object('found', false, 'vin', v_normalized, 'vehicle', NULL::jsonb);
    END IF;

    -- Longest-prefix match from full VIN length down to WMI (3 chars)
    FOR v_len IN REVERSE length(v_normalized) .. 3 LOOP
        SELECT row_to_json(v)::jsonb INTO v_vehicle
        FROM public.vehicles v
        WHERE v.vin_prefix = left(v_normalized, v_len)
          AND v.deleted_at IS NULL
        LIMIT 1;

        EXIT WHEN v_vehicle IS NOT NULL;
    END LOOP;

    RETURN jsonb_build_object(
        'found', v_vehicle IS NOT NULL,
        'vin', v_normalized,
        'vehicle', v_vehicle
    );
END;
$$;

-- ============================================================
-- RPC 2: get_matching_inventory_products
-- Returns inventory products that match a vehicle, joining the
-- part_compatibility graph with the products table. Falls back
-- to a brand/make name overlap when no graph edge exists.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_matching_inventory_products(
    p_company_id   UUID,
    p_vehicle_make TEXT,
    p_vehicle_model TEXT DEFAULT NULL,
    p_year          INTEGER DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_agg(row_to_json(r) ORDER BY (r.match_source <> 'brand_match') DESC, r.name_ar) INTO v_result
    FROM (
        SELECT DISTINCT
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
            ON pc.company_id = p_company_id
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
        WHERE p.company_id = p_company_id
          AND p.deleted_at IS NULL
          AND (
              pc.id IS NOT NULL
              OR (p.brand IS NOT NULL AND lower(p.brand) = lower(p_vehicle_make))
          )
    ) r;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
