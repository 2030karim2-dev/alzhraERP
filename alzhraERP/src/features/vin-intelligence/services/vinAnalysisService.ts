import type { VinAnalysisService, VinAnalysisResult, VinHistoryEntry, AnalysisStep } from '../types';
import { mockVehicles } from '../mock/mockVehicles';
import { MOCK_PARTS } from '../mock/mockParts';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: 'validate', label: 'vin_validating', status: 'PENDING' },
  { id: 'identify', label: 'vin_identifying', status: 'PENDING' },
  { id: 'config', label: 'vin_config', status: 'PENDING' },
  { id: 'parts', label: 'vin_finding_parts', status: 'PENDING' },
  { id: 'oem', label: 'vin_matching_oem', status: 'PENDING' },
  { id: 'inventory', label: 'vin_matching_inv', status: 'PENDING' },
  { id: 'knowledge', label: 'vin_building_knowledge', status: 'PENDING' },
];

/** Build a VIN result from a matched vehicle + parts */
function buildResult(vin: string, vehicle: VinAnalysisResult['vehicle']): VinAnalysisResult {
  const parts = [...MOCK_PARTS];
  const inventoryMatches = parts.filter(p => p.inventoryMatches.length > 0).flatMap(p => p.inventoryMatches);
  const missingParts = parts.filter(p => p.inventoryMatches.length === 0 && p.fitmentStatus !== 'NOT_COMPATIBLE');
  const demandInsights = parts
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

  return {
    vin,
    vehicle,
    coreParts: parts,
    inventoryMatches,
    missingParts,
    demandInsights,
    analysisTimestamp: new Date().toISOString(),
    analysisStatus: 'COMPLETE',
  };
}

export class MockVinAnalysisService implements VinAnalysisService {
  async analyzeVin(vin: string): Promise<VinAnalysisResult> {
    const normalized = vin.toUpperCase().replace(/\s+/g, '');

    // Validation
    if (normalized.length < 5) {
      throw new Error('Invalid VIN — too short');
    }

    // Simulate network delay
    await delay(300);

    // Lookup in mock vehicle database
    const vehicle = mockVehicles[normalized];

    if (!vehicle) {
      // Unknown VIN — return partial result
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

    return buildResult(normalized, vehicle);
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

export const vinAnalysisService: VinAnalysisService = new MockVinAnalysisService();
