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

export type { VinAIInsight } from './services/vinAIService';

export { useVinAnalysis } from './hooks/useVinAnalysis';
export { useVinHistory } from './hooks/useVinHistory';
export { useVinAI } from './hooks/useVinAI';
export { analyzeVinWithAI, getPartAIInsight } from './services/vinAIService';
