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

export { vinAnalysisService, RealVinAnalysisService, ANALYSIS_STEPS } from './services/vinAnalysisService';
export { findInventoryForOem } from './services/vinInventoryBridge';
export { vinVehicleService } from './services/vinVehicleService';
export { vinPartsService } from './services/vinPartsService';
export { vinHistoryService } from './services/vinHistoryService';
export { useVinAnalysis } from './hooks/useVinAnalysis';
export { useVinHistory } from './hooks/useVinHistory';
