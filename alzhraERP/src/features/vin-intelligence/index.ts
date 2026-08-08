export type {
  VehicleConfiguration,
  VehicleCorePart,
  InventoryMatch,
  VinAnalysisResult,
  VinHistoryEntry,
  VinDashboardMetrics,
  FitmentStatus,
  VinAnalysisService,
  AnalysisStep,
  DemandInsight,
  PartCategory,
} from './types';

export { vinAnalysisService, MockVinAnalysisService, ANALYSIS_STEPS, buildResultCore } from './services/vinAnalysisService';
export { useVinAnalysis } from './hooks/useVinAnalysis';
export { useVinHistory } from './hooks/useVinHistory';
export { mockVinResult, mockHistory, mockMetrics, mockVehicles, getMockVehicle } from './mock';
