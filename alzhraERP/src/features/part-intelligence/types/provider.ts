/**
 * IPartCatalogProvider — ABSTRACTION INTERFACE
 *
 * Every external/internal provider must implement this interface.
 * The PartSearchEngine orchestrates across providers.
 * Frontend code never sees provider-specific types.
 */

import type {
  ProviderSource,
  PartIdentity,
  PartReference,
  VehicleApplication,
  FitmentEvidence,
  PartSearchRequest,
  ProviderInfo,
  ProviderHealth,
} from './models';

// ── Provider Metadata ─────────────────────────────────────

/** Re-export so consumers get from one place */
export type { ProviderInfo, ProviderHealth };

// ── Provider Interface ────────────────────────────────────

export interface IPartCatalogProvider {
  readonly providerName: ProviderSource;

  checkAvailability(): Promise<boolean>;
  getInfo(): Promise<ProviderInfo>;

  searchPart(request: PartSearchRequest): Promise<{
    part: PartIdentity | null;
    crossReferences: PartReference[];
    vehicleApplications: VehicleApplication[];
  }>;

  getPartDetails(normalizedNumber: string, manufacturerId?: number): Promise<PartIdentity | null>;

  getCrossReferences(normalizedNumber: string): Promise<PartReference[]>;

  getVehicleApplications(normalizedNumber: string): Promise<VehicleApplication[]>;

  getFitment(normalizedNumber: string, vin: string): Promise<FitmentEvidence | null>;
}
