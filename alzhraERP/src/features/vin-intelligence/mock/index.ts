import { MOCK_PARTS } from './mockParts';
import type { VinAnalysisResult, VinHistoryEntry, VinDashboardMetrics } from '../types';

export { mockVehicles, getMockVehicle } from './mockVehicles';

export const MOCK_VEHICLE = {
  vin: 'JTB53AEB1W0025920',
  make: 'Toyota',
  model: 'Hilux',
  year: 2015,
  generation: '7th Gen',
  engineCode: '2TR-FE',
  engineSize: '2.7L',
  cylinderCount: 4,
  fuelType: 'Gasoline' as const,
  transmission: 'Automatic' as const,
  driveType: '4WD' as const,
  market: 'GCC' as const,
  bodyType: 'Pickup' as const,
  cabType: 'Double Cab' as const,
};

export const mockVinResult: VinAnalysisResult = {
  vin: MOCK_VEHICLE.vin,
  vehicle: MOCK_VEHICLE,
  coreParts: MOCK_PARTS,
  inventoryMatches: MOCK_PARTS.filter(p => p.inventoryMatches.length > 0).flatMap(p => p.inventoryMatches),
  missingParts: MOCK_PARTS.filter(p => p.inventoryMatches.length === 0 && p.fitmentStatus !== 'NOT_COMPATIBLE'),
  demandInsights: MOCK_PARTS.filter(p => p.demandLevel === 'HIGH').map(p => ({
    partId: p.id, partName: p.canonicalPartName, demandLevel: p.demandLevel ?? 'HIGH',
    salesCount: p.salesCount ?? 0, vehicleMatches: p.vehicleMatches ?? 0,
    isCorePart: true, isFastMoving: (p.salesCount ?? 0) > 300, recommendedStock: undefined,
  })),
  analysisTimestamp: new Date().toISOString(),
  analysisStatus: 'COMPLETE',
};

export const mockHistory: VinHistoryEntry[] = [
  { vin: 'JTB53AEB1W0025920', make: 'Toyota', model: 'Hilux', year: 2015, analyzedAt: new Date().toISOString(), resultSummary: 'Toyota Hilux 2015 — 20 قطع' },
  { vin: 'DA62T-349212', make: 'Suzuki', model: 'Carry', year: 2002, analyzedAt: new Date(Date.now() - 86400000).toISOString(), resultSummary: 'Suzuki Carry 2002' },
  { vin: 'JTMHV05J804123456', make: 'Toyota', model: 'Land Cruiser', year: 2020, analyzedAt: new Date(Date.now() - 172800000).toISOString(), resultSummary: 'Toyota Land Cruiser 2020' },
];

export const mockMetrics: VinDashboardMetrics = {
  vinsAnalyzed: 1248, vehiclesInKnowledgeBase: 986,
  verifiedFitments: 18420, inventoryMatches: 7845, unknownFitments: 326,
};
