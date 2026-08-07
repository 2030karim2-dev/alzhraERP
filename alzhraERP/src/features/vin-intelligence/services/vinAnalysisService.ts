import type { VinAnalysisService, VinAnalysisResult, VinHistoryEntry, AnalysisStep } from '../types';
import { mockVinResult, mockHistory } from '../mock';

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

export class MockVinAnalysisService implements VinAnalysisService {
  async analyzeVin(vin: string): Promise<VinAnalysisResult> {
    const normalized = vin.toUpperCase().replace(/\s+/g, '');
    if (normalized.length < 5) {
      throw new Error('Invalid VIN — too short');
    }
    // Simulate minimal network delay (hook handles visual progress)
    await delay(300);
    return { ...mockVinResult, vin: normalized, analysisTimestamp: new Date().toISOString() };
  }

  async getVinHistory(): Promise<VinHistoryEntry[]> {
    await delay(300);
    return mockHistory;
  }

  validateVin(vin: string): { valid: boolean; message?: string } {
    const clean = vin.toUpperCase().replace(/\s+/g, '');
    if (!clean) return { valid: false, message: 'VIN is empty' };
    if (clean.length < 5) return { valid: false, message: 'VIN too short (min 5 characters)' };
    if (clean.length > 17) return { valid: false, message: 'VIN exceeds 17 characters' };
    if (/[IOQ]/.test(clean)) return { valid: false, message: 'VIN contains invalid characters (I, O, Q)' };
    return { valid: true };
  }
}

export const vinAnalysisService: VinAnalysisService = new MockVinAnalysisService();
