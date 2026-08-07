import type { VinAnalysisService, VinAnalysisResult, VinHistoryEntry, AnalysisStep } from '../types';
import { mockVinResult, mockHistory } from '../mock';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: 'validate', label: 'Validating VIN', status: 'PENDING' },
  { id: 'identify', label: 'Identifying vehicle', status: 'PENDING' },
  { id: 'config', label: 'Analyzing vehicle configuration', status: 'PENDING' },
  { id: 'parts', label: 'Finding core parts', status: 'PENDING' },
  { id: 'oem', label: 'Matching OEM numbers', status: 'PENDING' },
  { id: 'inventory', label: 'Matching inventory', status: 'PENDING' },
  { id: 'knowledge', label: 'Building vehicle knowledge', status: 'PENDING' },
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
