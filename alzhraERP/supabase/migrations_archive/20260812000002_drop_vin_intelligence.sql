-- ============================================================
-- Migration: Drop VIN Intelligence Feature
-- Date: 2026-08-12
-- Removes all database objects of the discontinued
-- "AI VIN Intelligence" feature.
--
-- Dropped objects:
--   Tables:    vin_analysis_history, vehicle_core_parts, vehicle_knowledge_base
--   Functions: get_vehicle_by_vin(TEXT), get_core_parts_for_vehicle(TEXT), set_updated_at()
--
-- CASCADE automatically removes dependent RLS policies, indexes,
-- and the trg_vehicle_kb_updated_at trigger.
--
-- NOTE: search_by_oem (updated by 20260812000001) is INTENTIONALLY
-- KEPT — it is also used by the part-intelligence feature.
-- NOTE: public.vehicles table (with vin_prefix column) is a
-- separate feature and is NOT affected.
-- ============================================================

-- Order matters: child tables first (vehicle_core_parts references vehicle_knowledge_base)
DROP TABLE IF EXISTS public.vin_analysis_history CASCADE;
DROP TABLE IF EXISTS public.vehicle_core_parts CASCADE;
DROP TABLE IF EXISTS public.vehicle_knowledge_base CASCADE;

-- VIN-specific RPCs
DROP FUNCTION IF EXISTS public.get_vehicle_by_vin(TEXT);
DROP FUNCTION IF EXISTS public.get_core_parts_for_vehicle(TEXT);

-- Helper trigger function used ONLY by the dropped vehicle_knowledge_base table
-- (verified: no other table or trigger references it)
DROP FUNCTION IF EXISTS public.set_updated_at();
