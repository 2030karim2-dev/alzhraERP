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
  VinValidationResult,
  VINTab,
} from './types';

export { VIN_TABS } from './types';

export type { VinAIInsight } from './services/vinAIService';

export { useVinAnalysis } from './hooks/useVinAnalysis';
export { useVinHistory } from './hooks/useVinHistory';
export { useVinAI } from './hooks/useVinAI';
export { useVinCounts } from './hooks/useVinCounts';
export { analyzeVinWithAI, getPartAIInsight } from './services/vinAIService';
export { validateVin, VALID_VIN_LENGTHS } from './utils/vinValidator';
