import type { VinAnalysisService, VinAnalysisResult, VinHistoryEntry, AnalysisStep } from '../types';
import { vinVehicleService } from './vinVehicleService';
import { vinPartsService } from './vinPartsService';
import { vinHistoryService } from './vinHistoryService';
import { findInventoryForOem } from './vinInventoryBridge';

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: 'validate', label: 'vin_validating', status: 'PENDING' },
  { id: 'identify', label: 'vin_identifying', status: 'PENDING' },
  { id: 'config', label: 'vin_config', status: 'PENDING' },
  { id: 'parts', label: 'vin_finding_parts', status: 'PENDING' },
  { id: 'oem', label: 'vin_matching_oem', status: 'PENDING' },
  { id: 'inventory', label: 'vin_matching_inv', status: 'PENDING' },
  { id: 'knowledge', label: 'vin_building_knowledge', status: 'PENDING' },
];

/** Build demand insights from core parts */
function buildDemandInsights(parts: VinAnalysisResult['coreParts']): VinAnalysisResult['demandInsights'] {
  return parts
    .filter(p => p.demandLevel === 'HIGH' || p.demandLevel === 'MEDIUM')
    .map(p => ({
      partId: p.id,
      partName: p.canonicalPartName,
      demandLevel: (p.demandLevel === 'UNKNOWN' ? 'LOW' : p.demandLevel) as 'HIGH' | 'MEDIUM' | 'LOW',
      salesCount: p.salesCount ?? 0,
      vehicleMatches: p.vehicleMatches ?? 0,
      isCorePart: true,
      isFastMoving: (p.salesCount ?? 0) > 300,
      recommendedStock: undefined,
    }));
}

/** Build a complete analysis result from vehicle + parts. Enriches with real inventory. */
async function buildResult(
  vin: string,
  vehicle: VinAnalysisResult['vehicle'],
  parts: VinAnalysisResult['coreParts'],
): Promise<VinAnalysisResult> {
  // Try to find real inventory matches for all OEM numbers
  const allOemNumbers = parts.flatMap(p => p.oemNumbers);
  const realMatches = await findInventoryForOem(allOemNumbers);

  if (realMatches.length > 0) {
    const realMatchMap = new Map<string, typeof realMatches>();
    for (const m of realMatches) {
      const key = m.sku;
      if (!realMatchMap.has(key)) realMatchMap.set(key, []);
      realMatchMap.get(key)!.push(m);
    }

    for (const part of parts) {
      const realForPart = part.oemNumbers.flatMap(oem => realMatchMap.get(oem) ?? []);
      if (realForPart.length > 0) {
        part.inventoryMatches = realForPart;
      }
    }
  }

  const inventoryMatches = parts.filter(p => p.inventoryMatches.length > 0).flatMap(p => p.inventoryMatches);
  const missingParts = parts.filter(p => p.inventoryMatches.length === 0 && p.fitmentStatus !== 'NOT_COMPATIBLE');

  return {
    vin,
    vehicle,
    coreParts: parts,
    inventoryMatches,
    missingParts,
    demandInsights: buildDemandInsights(parts),
    analysisTimestamp: new Date().toISOString(),
    analysisStatus: 'COMPLETE',
  };
}

export class RealVinAnalysisService implements VinAnalysisService {
  async analyzeVin(vin: string): Promise<VinAnalysisResult> {
    const normalized = vin.toUpperCase().replace(/\s+/g, '');

    if (normalized.length < 5) {
      throw new Error('Invalid VIN — too short');
    }

    // Lookup vehicle in Supabase knowledge base
    const vehicle = await vinVehicleService.lookupVehicle(normalized);

    if (!vehicle || !vehicle.make) {
      return {
        vin: normalized,
        vehicle: { vin: normalized, make: '', model: '' },
        coreParts: [],
        inventoryMatches: [],
        missingParts: [],
        demandInsights: [],
        analysisTimestamp: new Date().toISOString(),
        analysisStatus: 'FAILED',
        warnings: ['VIN not found in knowledge base. Only basic validation was performed.'],
      };
    }

    // Fetch core parts from knowledge base
    const parts = await vinPartsService.getCoreParts(normalized);

    return buildResult(normalized, vehicle, parts);
  }

  async getVinHistory(): Promise<VinHistoryEntry[]> {
    // History is managed client-side via useVinHistory/vinHistoryService.
    // This returns empty — the hook handles persistence.
    return [];
  }

  validateVin(vin: string): { valid: boolean; message?: string } {
    const clean = vin.toUpperCase().replace(/\s+/g, '');
    if (!clean) return { valid: false, message: 'VIN is empty' };
    if (clean.length < 5) return { valid: false, message: 'VIN too short (min 5 characters)' };
    if (clean.length > 17) return { valid: false, message: 'VIN exceeds 17 characters' };
    if (/[IOQ]/.test(clean)) return { valid: false, message: 'VIN contains invalid characters (I, O, Q)' };
    if (clean.length !== 17) return { valid: true, message: 'Non-standard VIN length — analysis may be limited' };
    return { valid: true };
  }
}

export const vinAnalysisService: VinAnalysisService = new RealVinAnalysisService();

