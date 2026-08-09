/**
 * FAPI Provider Adapter — wraps the FAPI Catalog API into IPartCatalogProvider.
 * API key is NEVER exposed to frontend — all calls go through Supabase Edge Function.
 */

import { supabase } from '@/lib/supabaseClient';
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

function mapConfidenceToMatchQuality(c: number): MatchQuality {
  if (c >= 4) return 'EXACT';
  if (c >= 3) return 'EQUIVALENT';
  if (c >= 2) return 'CROSS_REFERENCE';
  if (c >= 1) return 'POSSIBLE';
  return 'UNKNOWN';
}

function tsToYear(ts: number): number {
  if (!ts || ts <= 0) return 0;
  return new Date(ts).getFullYear();
}

export class FapiProvider implements IPartCatalogProvider {
  readonly providerName: ProviderSource = 'FAPI';

  async checkAvailability(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('part-search', {
        body: { action: 'health', provider: 'FAPI' },
      });
      return !error && data?.status === 'HEALTHY';
    } catch {
      return false;
    }
  }

  async getInfo(): Promise<ProviderInfo> {
    const available = await this.checkAvailability();
    return {
      name: 'FAPI',
      isAvailable: available,
      lastChecked: new Date().toISOString(),
      capabilities: {
        oemSearch: true,
        crossReference: true,
        vehicleApplication: true,
        fitmentEvidence: false,
        vinDecode: true,
      },
    };
  }

  async searchPart(req: PartSearchRequest): Promise<{
    part: PartIdentity | null;
    crossReferences: PartReference[];
    vehicleApplications: VehicleApplication[];
  }> {
    const { data, error } = await supabase.functions.invoke('part-search', {
      body: {
        action: 'search',
        provider: 'FAPI',
        partNumber: req.partNumber,
        includeCrossReferences: req.includeCrossReferences ?? true,
        includeVehicleApplications: req.includeVehicleApplications ?? false,
        limit: req.limit ?? 50,
      },
    });
    if (error || !data) return { part: null, crossReferences: [], vehicleApplications: [] };
    return {
      part: data.part ?? null,
      crossReferences: (data.crossReferences ?? []).map(mapRef),
      vehicleApplications: (data.vehicleApplications ?? []).map(mapApp),
    };
  }

  async getPartDetails(number: string, mfrId?: number): Promise<PartIdentity | null> {
    const { data, error } = await supabase.functions.invoke('part-search', {
      body: { action: 'details', provider: 'FAPI', partNumber: number, manufacturerId: mfrId },
    });
    return error || !data?.part ? null : data.part;
  }

  async getCrossReferences(number: string): Promise<PartReference[]> {
    const { data, error } = await supabase.functions.invoke('part-search', {
      body: { action: 'crossReferences', provider: 'FAPI', partNumber: number },
    });
    return error || !data?.crossReferences ? [] : (data.crossReferences ?? []).map(mapRef);
  }

  async getVehicleApplications(number: string): Promise<VehicleApplication[]> {
    const { data, error } = await supabase.functions.invoke('part-search', {
      body: { action: 'vehicleApplications', provider: 'FAPI', partNumber: number },
    });
    return error || !data?.vehicleApplications ? [] : (data.vehicleApplications ?? []).map(mapApp);
  }

  async getFitment(number: string, vin: string): Promise<FitmentEvidence | null> {
    const { data, error } = await supabase.functions.invoke('part-search', {
      body: { action: 'fitment', provider: 'FAPI', partNumber: number, vin },
    });
    if (error || !data?.fitment) return null;
    return {
      status: data.fitment.confidence >= 3 ? 'CONFIRMED' : 'POSSIBLE',
      evidence: data.fitment.evidence ?? null,
      evidenceSource: 'FAPI',
      part: data.fitment.part,
      vehicle: data.fitment.vehicle ?? undefined,
      provider: 'FAPI',
      resolvedAt: new Date().toISOString(),
    };
  }
}

function mapRef(r: any): PartReference {
  return {
    normalizedNumber: (r.ns || r.n || '').replace(/[\s\-\/\.]/g, '').toUpperCase(),
    displayNumber: r.n || r.ns || '',
    manufacturer: r.mfd || '',
    manufacturerId: r.mfi,
    matchQuality: mapConfidenceToMatchQuality(r.c),
    confidence: r.c,
  };
}

function mapApp(r: any): VehicleApplication {
  return {
    make: r.make || '',
    model: r.model || '',
    modification: r.d || '',
    yearFrom: tsToYear(r.cb),
    yearTo: tsToYear(r.ce),
    engineCode: r.engineCode || undefined,
    engineType: r.engineType || undefined,
    engineCapacity: r.capacity || undefined,
    enginePower: r.power || undefined,
    driveType: r.driveType || undefined,
    bodyType: r.bodyType || undefined,
  };
}

export const fapiProvider = new FapiProvider();
