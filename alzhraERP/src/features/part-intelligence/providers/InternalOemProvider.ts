/**
 * InternalOemProvider — wraps the existing search_by_oem RPC.
 * Provides graceful degradation when external providers are unavailable.
 * Internal inventory remains the authoritative source for stock/price.
 */

import { supabase } from '@/lib/supabaseClient';
import { normalizeOem } from '@/core/utils/oemNormalization';
import type { IPartCatalogProvider } from '../types/provider';
import type {
  PartIdentity,
  PartReference,
  VehicleApplication,
  FitmentEvidence,
  PartSearchRequest,
  ProviderInfo,
  MatchQuality,
} from '../types/models';
import type { ProviderSource } from '../types/models';

export class InternalOemProvider implements IPartCatalogProvider {
  readonly providerName: ProviderSource = 'INTERNAL_OEM';

  async checkAvailability(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('search_by_oem', {
        p_company_id: '00000000-0000-0000-0000-000000000000',
        p_search_term: 'test',
      });
      return !error;
    } catch {
      return false;
    }
  }

  async getInfo(): Promise<ProviderInfo> {
    return {
      name: 'INTERNAL_OEM',
      isAvailable: true,
      lastChecked: new Date().toISOString(),
      capabilities: {
        oemSearch: true,
        crossReference: true,
        vehicleApplication: false,
        fitmentEvidence: false,
        vinDecode: false,
      },
    };
  }

  async searchPart(req: PartSearchRequest): Promise<{
    part: PartIdentity | null;
    crossReferences: PartReference[];
    vehicleApplications: VehicleApplication[];
  }> {
    const term = normalizeOem(req.partNumber);
    const { data, error } = await supabase.rpc('search_by_oem', {
      p_company_id: '00000000-0000-0000-0000-000000000000',
      p_search_term: term,
    });

    if (error || !data?.length) {
      return { part: null, crossReferences: [], vehicleApplications: [] };
    }

    const first = data[0];
    const part: PartIdentity = {
      normalizedNumber: term,
      displayNumber: first.target_number || first.source_number || term,
      manufacturer: first.brand || '',
      description: first.product_name || first.product_name_ar || '',
    };

    const crossRefs: PartReference[] = data.slice(1).map((r: any) => ({
      normalizedNumber: normalizeOem(r.target_number || r.source_number || ''),
      displayNumber: r.target_number || r.source_number || '',
      manufacturer: r.brand || '',
      matchQuality: mapInternalQuality(r.match_quality),
    }));

    return { part, crossReferences: crossRefs, vehicleApplications: [] };
  }

  async getPartDetails(number: string, _mfrId?: number): Promise<PartIdentity | null> {
    const result = await this.searchPart({ partNumber: number, includeCrossReferences: false });
    return result.part;
  }

  async getCrossReferences(number: string): Promise<PartReference[]> {
    const result = await this.searchPart({ partNumber: number, includeCrossReferences: true });
    return result.crossReferences;
  }

  async getVehicleApplications(_number: string): Promise<VehicleApplication[]> {
    return [];
  }

  async getFitment(_number: string, _vin: string): Promise<FitmentEvidence | null> {
    return null;
  }
}

function mapInternalQuality(raw: string | null | undefined): MatchQuality {
  switch (raw) {
    case 'exact': return 'EXACT';
    case 'partial': return 'POSSIBLE';
    case 'interchangeable': return 'CROSS_REFERENCE';
    default: return 'UNKNOWN';
  }
}

export const internalOemProvider = new InternalOemProvider();
