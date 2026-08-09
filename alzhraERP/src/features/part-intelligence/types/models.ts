/**
 * Phase 5 — Normalized Domain Models
 * Provider-independent types consumed by the application.
 */

// ── Enums ──────────────────────────────────────────────────

export type MatchQuality = 'EXACT' | 'EQUIVALENT' | 'CROSS_REFERENCE' | 'POSSIBLE' | 'UNKNOWN';

export type FitmentStatus = 'CONFIRMED' | 'UNKNOWN' | 'POSSIBLE' | 'NOT_COMPATIBLE';

export type ProviderSource = 'FAPI' | 'TECDOC' | 'INTERNAL_OEM' | 'MANUAL';

// ── Core Domain Models ────────────────────────────────────

export interface PartIdentity {
  normalizedNumber: string;
  displayNumber: string;
  manufacturer: string;
  manufacturerId?: number;
  description: string;
  attributes?: Record<string, string>;
  imageUrl?: string;
}

export interface PartReference {
  normalizedNumber: string;
  displayNumber: string;
  manufacturer: string;
  manufacturerId?: number;
  matchQuality: MatchQuality;
  confidence?: number;
  evidence?: string;
}

export interface VehicleApplication {
  make: string;
  model: string;
  modification?: string;
  yearFrom?: number;
  yearTo?: number;
  engineCode?: string;
  engineType?: string;
  engineCapacity?: string;
  enginePower?: string;
  driveType?: string;
  bodyType?: string;
}

export interface FitmentEvidence {
  status: FitmentStatus;
  evidence: string | null;
  evidenceSource: ProviderSource | null;
  part: PartIdentity;
  vehicle?: {
    make: string;
    model: string;
    year?: number;
    engineCode?: string;
    vin?: string;
  };
  provider: ProviderSource;
  resolvedAt: string;
}

// ── Request / Response ────────────────────────────────────

export interface PartSearchRequest {
  partNumber: string;
  includeCrossReferences?: boolean;
  includeVehicleApplications?: boolean;
  vin?: string;
  limit?: number;
}

export interface PartSearchResponse {
  part: PartIdentity | null;
  crossReferences: PartReference[];
  vehicleApplications: VehicleApplication[];
  fitmentEvidence: FitmentEvidence | null;
  provider: ProviderSource;
  error?: { code: string; message: string; provider?: ProviderSource };
  meta: {
    totalCrossReferences: number;
    totalVehicleApplications: number;
    searchTimeMs: number;
    providersAttempted: ProviderSource[];
    providerUsed: ProviderSource | null;
  };
}

export interface PartSearchResultWithInventory extends PartSearchResponse {
  inventoryProducts: Array<{
    productId: string;
    sku: string;
    productName: string;
    productNameAr?: string;
    quantity: number;
    price: number;
    warehouse?: string;
    location?: string;
  }>;
}
