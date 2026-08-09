/**
 * PartSearchEngine — orchestrates across multiple providers.
 *
 * Priority:
 *   1. FAPI (external OEM catalog)
 *   2. INTERNAL_OEM (graceful degradation)
 *
 * External provider failure never blocks internal search.
 */

import { normalizeOem } from '@/core/utils/oemNormalization';
import type { IPartCatalogProvider } from '../types/provider';
import type {
  PartSearchRequest,
  PartSearchResponse,
  ProviderSource,
} from '../types/models';
import { fapiProvider } from '../providers/FapiProvider';
import { internalOemProvider } from '../providers/InternalOemProvider';

const PROVIDERS: IPartCatalogProvider[] = [fapiProvider, internalOemProvider];

export class PartSearchEngine {
  /**
   * Search for a part across all providers, falling through on failure.
   */
  async search(request: PartSearchRequest): Promise<PartSearchResponse> {
    const startTime = Date.now();
    const attempted: ProviderSource[] = [];
    let usedProvider: ProviderSource | null = null;
    let lastError: { code: string; message: string; provider?: ProviderSource } | undefined;

    const normalizedTerm = normalizeOem(request.partNumber);
    const searchReq: PartSearchRequest = { ...request, partNumber: normalizedTerm };

    for (const provider of PROVIDERS) {
      attempted.push(provider.providerName);

      try {
        const available = await provider.checkAvailability();
        if (!available) {
          lastError = {
            code: 'PROVIDER_UNAVAILABLE',
            message: `${provider.providerName} is not available.`,
            provider: provider.providerName,
          };
          continue;
        }

        const result = await provider.searchPart(searchReq);

        if (result.part) {
          usedProvider = provider.providerName;
          return {
            part: result.part,
            crossReferences: result.crossReferences,
            vehicleApplications: result.vehicleApplications,
            fitmentEvidence: null,
            provider: usedProvider,
            meta: {
              totalCrossReferences: result.crossReferences.length,
              totalVehicleApplications: result.vehicleApplications.length,
              searchTimeMs: Date.now() - startTime,
              providersAttempted: attempted,
              providerUsed: usedProvider,
            },
          };
        }

        lastError = {
          code: 'PART_NOT_FOUND',
          message: `Part not found in ${provider.providerName}.`,
          provider: provider.providerName,
        };
      } catch (err) {
        lastError = {
          code: 'PROVIDER_ERROR',
          message: err instanceof Error ? err.message : 'Unknown provider error.',
          provider: provider.providerName,
        };
      }
    }

    return {
      part: null,
      crossReferences: [],
      vehicleApplications: [],
      fitmentEvidence: null,
      provider: 'INTERNAL_OEM',
      error: lastError,
      meta: {
        totalCrossReferences: 0,
        totalVehicleApplications: 0,
        searchTimeMs: Date.now() - startTime,
        providersAttempted: attempted,
        providerUsed: null,
      },
    };
  }

  /**
   * Get fitment evidence for a part on a specific vehicle (VIN).
   */
  async getFitment(partNumber: string, vin: string): Promise<PartSearchResponse['fitmentEvidence'] | null> {
    const normalized = normalizeOem(partNumber);

    for (const provider of PROVIDERS) {
      try {
        const available = await provider.checkAvailability();
        if (!available) continue;

        const fitment = await provider.getFitment(normalized, vin);
        if (fitment) return fitment;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Get cross-references from the best available provider.
   */
  async getCrossReferences(partNumber: string) {
    const normalized = normalizeOem(partNumber);
    for (const provider of PROVIDERS) {
      try {
        const refs = await provider.getCrossReferences(normalized);
        if (refs.length > 0) return refs;
      } catch { continue; }
    }
    return [];
  }
}

export const partSearchEngine = new PartSearchEngine();
