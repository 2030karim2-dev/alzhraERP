-- ============================================================
-- Migration: VIN — vin_analyses.updated_at (re-save ordering)
-- Date: 2026-08-14
--
-- Re-saving (upsert) a VIN kept the original created_at, so it never
-- moved to the top of "آخر الشواصي". Adds updated_at + a trigger so
-- re-saved analyses bubble to the top when ordered by updated_at.
-- ============================================================

ALTER TABLE public.vin_analyses
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_vin_analyses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vin_analyses_updated_at ON public.vin_analyses;
CREATE TRIGGER trg_vin_analyses_updated_at
    BEFORE UPDATE ON public.vin_analyses
    FOR EACH ROW EXECUTE FUNCTION public.set_vin_analyses_updated_at();
