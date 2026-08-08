/**
 * vinAnalysisService — DEPRECATED (Phase 4)
 * ==========================================
 * This file has been superseded by the Supabase Edge Function:
 *   supabase/functions/vin-analyze/index.ts
 *
 * Production workflow:
 *   useVinAnalysis → vin-analyze Edge Function → NHTSA → DB → Inventory
 *
 * DO NOT add new logic here. This file will be deleted after full migration.
 */
import type { AnalysisStep } from '../types';

/** @deprecated — kept only to prevent import errors during migration */
export const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: 'validate',  label: 'vin_validating',        status: 'PENDING' },
  { id: 'identify',  label: 'vin_identifying',        status: 'PENDING' },
  { id: 'config',    label: 'vin_config',             status: 'PENDING' },
  { id: 'parts',     label: 'vin_finding_parts',      status: 'PENDING' },
  { id: 'oem',       label: 'vin_matching_oem',       status: 'PENDING' },
  { id: 'inventory', label: 'vin_matching_inv',       status: 'PENDING' },
  { id: 'knowledge', label: 'vin_building_knowledge', status: 'PENDING' },
];

/** @deprecated — not called by production workflow anymore */
export const vinAnalysisService = {
  analyzeVin: async (_vin: string): Promise<never> => {
    throw new Error(
      '[DEPRECATED] vinAnalysisService.analyzeVin — use the vin-analyze Edge Function instead.'
    );
  },
};
