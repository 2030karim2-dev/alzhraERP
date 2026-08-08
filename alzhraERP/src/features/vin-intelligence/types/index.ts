/**
 * AI VIN & Automotive Parts Intelligence Engine
 * TypeScript Data Contracts — Phase 1 (Frontend Only)
 * 
 * These contracts will become the bridge to the future backend (Phase 2).
 */

// ============================================================
// Fitment Status
// ============================================================

export type FitmentStatus = 'VERIFIED' | 'INFERRED' | 'UNKNOWN' | 'NOT_COMPATIBLE';

// ============================================================
// Vehicle Configuration
// ============================================================

export interface VehicleConfiguration {
  vin: string;
  make: string;
  model: string;
  year?: number;
  generation?: string;
  engineCode?: string;
  engineSize?: string;
  cylinderCount?: number;
  fuelType?: 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric';
  transmission?: 'Automatic' | 'Manual' | 'CVT' | 'DCT';
  driveType?: 'FWD' | 'RWD' | '4WD' | 'AWD';
  market?: 'GCC' | 'USA' | 'Japan' | 'JDM' | 'Europe' | 'Australia';
  bodyType?: string;
  cabType?: 'Single Cab' | 'Double Cab' | 'Extended Cab';
}

// ============================================================
// Inventory Match
// ============================================================

export type PartCategory =
  | 'Braking' | 'Cooling' | 'Electrical' | 'Air Conditioning'
  | 'Steering' | 'Front Suspension' | 'Rear Suspension'
  | 'Engine' | 'Fuel / Intake' | 'Drivetrain'
  | 'Mirrors' | 'Body' | 'Exhaust' | 'Filters';

export interface InventoryMatch {
  productId: string;
  sku: string;
  productName: string;
  productNameAr?: string;
  warehouse?: string;
  location?: string;
  quantity: number;
  price?: number;
}

// ============================================================
// Vehicle Core Part
// ============================================================

export interface VehicleCorePart {
  id: string;
  canonicalPartName: string;
  category: PartCategory;
  position?: string;
  side?: 'RH' | 'LH' | 'NONE' | 'UNKNOWN';
  oemNumbers: string[];
  crossReferences?: string[];
  fitmentStatus: FitmentStatus;
  evidence?: string;
  evidenceSource?: string;
  inventoryMatches: InventoryMatch[];
  demandLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  salesCount?: number;
  vehicleMatches?: number;
}

// ============================================================
// VIN Analysis Result
// ============================================================

export interface VinAnalysisResult {
  vin: string;
  vehicle: VehicleConfiguration;
  coreParts: VehicleCorePart[];
  inventoryMatches: InventoryMatch[];
  missingParts: VehicleCorePart[];
  demandInsights: DemandInsight[];
  analysisTimestamp: string;
  analysisStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  warnings?: string[];
}

// ============================================================
// Demand Insight
// ============================================================

export interface DemandInsight {
  partId: string;
  partName: string;
  demandLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  salesCount: number;
  vehicleMatches: number;
  isCorePart: boolean;
  isFastMoving: boolean;
  recommendedStock?: number;
}

// ============================================================
// VIN History Entry
// ============================================================

export interface VinHistoryEntry {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  analyzedAt: string;
  resultSummary?: string;
}

// ============================================================
// Analysis Step (Progress UI)
// ============================================================

export interface AnalysisStep {
  id: string;
  label: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'ERROR';
}

// ============================================================
// VIN Analysis Service Interface (Bridge to Backend)
// ============================================================

export interface VinAnalysisService {
  analyzeVin(vin: string): Promise<VinAnalysisResult>;
  getVinHistory(): Promise<VinHistoryEntry[]>;
  validateVin(vin: string): { valid: boolean; message?: string };
}

// ============================================================
// Dashboard Summary Metrics
// ============================================================

export interface VinDashboardMetrics {
  vinsAnalyzed: number;
  vehiclesInKnowledgeBase: number;
  verifiedFitments: number;
  inventoryMatches: number;
  unknownFitments: number;
}
