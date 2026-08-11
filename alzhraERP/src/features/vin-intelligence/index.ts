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
} from './types';

export type { VinAIInsight } from './services/vinAIService';
export type { TabState, TabStep, TabStatus, VinAccumulatedData } from './hooks/useVinTabs';

export { useVinHistory } from './hooks/useVinHistory';
export { useVinAI } from './hooks/useVinAI';
export { useVinCounts } from './hooks/useVinCounts';
export { useVinTabs } from './hooks/useVinTabs';
export { analyzeVinWithAI, getPartAIInsight } from './services/vinAIService';
export { validateVin, VALID_VIN_LENGTHS } from './utils/vinValidator';
