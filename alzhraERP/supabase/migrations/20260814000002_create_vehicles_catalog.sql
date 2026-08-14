-- ============================================================
-- Migration: Global Vehicles Catalog Table (was missing from repo)
-- Date: 2026-08-14
--
-- The `vehicles` table (global, tenant-agnostic) is the anchor node
-- of the VIN Compatibility Graph and is referenced by:
--   - vehicle_products.vehicle_id (FK)
--   - vin_analyses.vehicle_id (FK)
--   - resolve_vehicle_from_vin / ensure_vehicle RPCs
-- It existed only in production (created manually) — this adds the
-- version-controlled definition so fresh deployments work.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vehicles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make          TEXT NOT NULL,
    model         TEXT NOT NULL,
    submodel      TEXT,
    year_start    INTEGER NOT NULL DEFAULT 0,
    year_end      INTEGER NOT NULL DEFAULT 0,
    engine        TEXT,
    body_type     TEXT,
    drive_type    TEXT,
    fuel_type     TEXT,
    transmission  TEXT,
    region        TEXT,
    vin_prefix    TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

-- Fastest structural VIN resolution (longest vin_prefix match in resolve_vehicle_from_vin)
CREATE INDEX IF NOT EXISTS idx_vehicles_vin_prefix ON public.vehicles (vin_prefix);
-- Case-insensitive find-or-create lookups in ensure_vehicle
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON public.vehicles (lower(make), lower(model));

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Global catalog: readable by any authenticated user.
-- (resolve_vehicle_from_vin / ensure_vehicle are SECURITY DEFINER and bypass RLS.)
DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
CREATE POLICY "vehicles_select" ON public.vehicles
    FOR SELECT TO authenticated
    USING (true);
