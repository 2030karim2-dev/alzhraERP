-- ============================================================
-- Migration: VIN Knowledge Base Tables
-- Date: 2026-08-08
-- Phase 2 — Production tables for AI VIN Intelligence Engine
-- ============================================================

-- vehicle_knowledge_base — decoded VIN → vehicle info
CREATE TABLE IF NOT EXISTS public.vehicle_knowledge_base (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin             TEXT NOT NULL UNIQUE,
    make            TEXT NOT NULL,
    model           TEXT NOT NULL,
    year            INTEGER,
    generation      TEXT,
    engine_code     TEXT,
    engine_size     TEXT,
    cylinder_count  INTEGER,
    fuel_type       TEXT,
    transmission    TEXT,
    drive_type      TEXT,
    market          TEXT,
    body_type       TEXT,
    cab_type        TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- vehicle_core_parts — pre-mapped parts per vehicle
CREATE TABLE IF NOT EXISTS public.vehicle_core_parts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id          UUID NOT NULL REFERENCES public.vehicle_knowledge_base(id) ON DELETE CASCADE,
    canonical_part_name TEXT NOT NULL,
    category            TEXT NOT NULL,
    position            TEXT,
    side                TEXT,
    oem_numbers         TEXT[] DEFAULT '{}',
    cross_references    TEXT[] DEFAULT '{}',
    fitment_status      TEXT DEFAULT 'UNKNOWN',
    evidence            TEXT,
    evidence_source     TEXT,
    demand_level        TEXT DEFAULT 'UNKNOWN',
    sales_count         INTEGER DEFAULT 0,
    vehicle_matches     INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- vin_analysis_history — user VIN search history
CREATE TABLE IF NOT EXISTS public.vin_analysis_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id      UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    vin             TEXT NOT NULL,
    make            TEXT,
    model           TEXT,
    year            INTEGER,
    analyzed_at     TIMESTAMPTZ DEFAULT now(),
    result_summary  TEXT,
    -- UNIQUE constraint required for upsert in vinHistoryService.ts
    CONSTRAINT uq_vin_history_user_vin UNIQUE (user_id, vin)
);


-- ============================================================
-- updated_at trigger for vehicle_knowledge_base
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vehicle_kb_updated_at'
  ) THEN
    CREATE TRIGGER trg_vehicle_kb_updated_at
    BEFORE UPDATE ON public.vehicle_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================================
-- RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_vehicle_by_vin(p_vin TEXT)
RETURNS TABLE (
    make TEXT, model TEXT, year INTEGER, generation TEXT,
    engine_code TEXT, engine_size TEXT, cylinder_count INTEGER,
    fuel_type TEXT, transmission TEXT, drive_type TEXT,
    market TEXT, body_type TEXT, cab_type TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT v.make, v.model, v.year, v.generation,
           v.engine_code, v.engine_size, v.cylinder_count,
           v.fuel_type, v.transmission, v.drive_type,
           v.market, v.body_type, v.cab_type
    FROM public.vehicle_knowledge_base v
    WHERE v.vin = upper(replace(p_vin, ' ', ''));
$$;

CREATE OR REPLACE FUNCTION public.get_core_parts_for_vehicle(p_vin TEXT)
RETURNS TABLE (
    -- NOTE: 'id', 'position', 'side' are SQL reserved words in some contexts.
    -- Using prefixed names to avoid syntax errors in RETURNS TABLE declaration.
    part_id UUID,
    canonical_part_name TEXT,
    category TEXT,
    part_position TEXT,
    part_side TEXT,
    oem_numbers TEXT[],
    cross_references TEXT[],
    fitment_status TEXT,
    evidence TEXT,
    evidence_source TEXT,
    demand_level TEXT,
    sales_count INTEGER,
    vehicle_matches INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT p.id, p.canonical_part_name, p.category,
           p.position, p.side, p.oem_numbers, p.cross_references,
           p.fitment_status, p.evidence, p.evidence_source,
           p.demand_level, p.sales_count, p.vehicle_matches
    FROM public.vehicle_core_parts p
    JOIN public.vehicle_knowledge_base v ON v.id = p.vehicle_id
    WHERE v.vin = upper(replace(p_vin, ' ', ''));
$$;

-- ============================================================
-- RLS Policies
-- ============================================================
-- NOTE: vehicle_knowledge_base and vehicle_core_parts are SHARED
-- knowledge tables (NHTSA-sourced decoded VIN data is public).
-- Any authenticated user in any company can read cached VIN data
-- to avoid redundant NHTSA API calls.
-- ============================================================

ALTER TABLE public.vehicle_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_core_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vin_analysis_history ENABLE ROW LEVEL SECURITY;

-- Shared knowledge base: all authenticated users can read (NHTSA data is public)
CREATE POLICY "vehicle_kb_select_auth" ON public.vehicle_knowledge_base
    FOR SELECT TO authenticated USING (true);

-- Core parts reference the shared knowledge base; read-only for all authenticated users
CREATE POLICY "core_parts_select_auth" ON public.vehicle_core_parts
    FOR SELECT TO authenticated USING (true);

-- VIN analysis history: strictly user-scoped (each user sees only their own history)
CREATE POLICY "vin_history_select_own" ON public.vin_analysis_history
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "vin_history_insert_own" ON public.vin_analysis_history
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Upsert: allow updating existing records for the same user+vin combo
CREATE POLICY "vin_history_update_own" ON public.vin_analysis_history
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "vin_history_delete_own" ON public.vin_analysis_history
    FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_vin_history_user ON public.vin_analysis_history(user_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_vin_history_vin ON public.vin_analysis_history(vin);