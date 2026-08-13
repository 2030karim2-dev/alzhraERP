-- ============================================================
-- Migration: VIN Intelligence — Saved VINs (dedupe + constraint)
-- Date: 2026-08-13
-- 1) Dedupe existing vin_analyses rows (keep latest per company+vin)
-- 2) Add unique constraint (company_id, vin) so each VIN is saved once
-- ============================================================

-- 1) Remove older duplicates (keep the newest per company + vin)
DELETE FROM public.vin_analyses a
USING public.vin_analyses b
WHERE a.company_id = b.company_id
  AND a.vin = b.vin
  AND a.created_at < b.created_at;

-- 2) Enforce one saved row per VIN per company
ALTER TABLE public.vin_analyses
  DROP CONSTRAINT IF EXISTS uq_vin_analyses_company_vin;
ALTER TABLE public.vin_analyses
  ADD CONSTRAINT uq_vin_analyses_company_vin UNIQUE (company_id, vin);
