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
  PartDefinition,
  PartCategory,
  OEMEntry,
} from './types';

export { vinAnalysisService, MockVinAnalysisService, ANALYSIS_STEPS } from './services/vinAnalysisService';
export { useVinAnalysis } from './hooks/useVinAnalysis';
export { useVinHistory } from './hooks/useVinHistory';
export { mockVinResult, mockHistory, mockMetrics, mockVehicles, getMockVehicle } from './mock';
