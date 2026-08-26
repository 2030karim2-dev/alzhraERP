/**
 * VIN Intelligence — Service Layer
 * Orchestrates decode, inventory matching, part extraction and
 * the internal Compatibility Graph. The Internal Graph is the
 * single source of truth; AI/FAPI are enrichment only.
 */

import type { Json } from '../../../core/database.types';
import { vinApi } from '../api';
import { validateVin } from '../utils/vinValidator';
import type {
  ExtractedPart,
  MatchingInventoryProduct,
  VehicleInfo,
  VehicleProductLink,
  VinDecodeResult,
  VinAnalysisRecord,
} from '../types';

/** Map DB (snake_case) or AI rows into a normalized VehicleInfo */
function normalizeVehicle(raw: Record<string, unknown> | null | undefined): VehicleInfo | null {
  if (!raw) return null;
  const make = (raw.make as string) || '';
  if (!make) return null;

  const vehicle: VehicleInfo = {
    make,
    model: (raw.model as string | null) ?? null,
    submodel: (raw.submodel as string | null) ?? null,
    year: (raw.year as number | null) ?? (raw.year_start as number | null) ?? null,
    yearStart: (raw.year_start as number | null) ?? null,
    yearEnd: (raw.year_end as number | null) ?? null,
    engine: (raw.engine as string | null) ?? null,
    displacement: (raw.displacement as string | null) ?? null,
    cylinders: (raw.cylinders as string | null) ?? null,
    bodyType: (raw.body_type as string | null) ?? (raw.bodyType as string | null) ?? null,
    driveType: (raw.drive_type as string | null) ?? (raw.driveType as string | null) ?? null,
    fuelType: (raw.fuel_type as string | null) ?? (raw.fuelType as string | null) ?? null,
    transmission: (raw.transmission as string | null) ?? null,
    region: (raw.region as string | null) ?? null,
    market: (raw.market as string | null) ?? null,
    vinPrefix: (raw.vin_prefix as string | null) ?? (raw.vinPrefix as string | null) ?? null,
    trim: (raw.trim as string | null) ?? null,
    doors: (raw.doors as string | null) ?? null,
    brakeSystem: (raw.brake_system as string | null) ?? (raw.brakeSystem as string | null) ?? null,
    vehicleType: (raw.vehicle_type as string | null) ?? (raw.vehicleType as string | null) ?? null,
  };
  const id = raw.id as string | undefined;
  if (id) vehicle.id = id;
  return vehicle;
}

export const vinService = {
  /** Validate + decode a VIN (vPIC → internal DB → AI fallback) */
  async decodeVin(
    input: string,
    mode: 'hybrid' | 'db' | 'ai' = 'hybrid'
  ): Promise<VinDecodeResult> {
    const validation = validateVin(input);
    if (!validation.isValid) {
      const messages: Record<string, string> = {
        EMPTY_INPUT: 'يرجى إدخال رقم الشاصي (VIN)',
        INVALID_LENGTH: 'رقم الشاصي يجب أن يكون بين 11 و 17 خانة',
        INVALID_CHARACTERS: 'رقم الشاصي يحتوي على رموز غير صالحة (لا يُسمح بالأحرف I, O, Q)',
      };
      throw new Error(messages[validation.error ?? ''] || 'رقم شاصي غير صالح');
    }

    const raw = await vinApi.decodeVin({ vin: validation.normalizedVin, mode });
    const vehicle = normalizeVehicle(raw.vehicle);

    return {
      vin: raw.vin ?? validation.normalizedVin,
      found: raw.found,
      source: raw.source === 'vpic' ? 'vpic' : raw.source === 'ai' ? 'ai' : 'db',
      vehicle,
      confidence: raw.confidence ?? (vehicle ? 'high' : null),
      rawAi: raw.raw_ai,
    };
  },

  /** Match inventory products to a decoded vehicle via the graph */
  async matchInventory(
    companyId: string,
    vehicle: VehicleInfo
  ): Promise<MatchingInventoryProduct[]> {
    if (!vehicle.make) return [];
    return vinApi.getMatchingInventoryProducts(
      companyId,
      vehicle.make,
      vehicle.model ?? null,
      vehicle.year ?? vehicle.yearStart ?? null
    );
  },

  /** Search a part number against the megazip catalog (real data — no AI) */
  async searchPartByNumber(partNumber: string): Promise<ExtractedPart[]> {
    const res = await vinApi.searchPartsByNumber(partNumber);
    const parts: ExtractedPart[] = [];
    for (const p of res.parts ?? []) {
      const part: ExtractedPart = {
        partNumber: p.partNumber,
        description: p.name,
        source: 'megazip',
      };
      if (p.make) part.manufacturer = p.make;
      parts.push(part);
    }
    return parts;
  },

  /** Persist a decode result to history */
  async saveAnalysis(companyId: string, userId: string, result: VinDecodeResult): Promise<void> {
    await vinApi.saveVinAnalysis({
      company_id: companyId,
      vin: result.vin,
      vehicle_id: result.vehicle?.id ?? null,
      decoded: (result.vehicle as unknown as Json) ?? null,
      source: result.source,
      created_by: userId,
    });
  },

  async listAnalyses(companyId: string): Promise<VinAnalysisRecord[]> {
    return (await vinApi.listVinAnalyses(companyId)) as unknown as VinAnalysisRecord[];
  },

  async deleteAnalysis(id: string): Promise<void> {
    await vinApi.deleteVinAnalysis(id);
  },

  async listLinkedProducts(vehicleId: string): Promise<VehicleProductLink[]> {
    return vinApi.listVehicleProducts(vehicleId);
  },

  /** Manually link an existing inventory product to a vehicle */
  async linkProduct(
    companyId: string,
    userId: string,
    vehicleId: string,
    productId: string
  ): Promise<void> {
    await vinApi.linkVehicleProduct({
      company_id: companyId,
      vehicle_id: vehicleId,
      product_id: productId,
      fitment_status: 'POSSIBLE',
      source: 'manual',
      created_by: userId,
    });
  },

  async unlinkProduct(id: string): Promise<void> {
    await vinApi.unlinkVehicleProduct(id);
  },

  /** Find or create a canonical vehicle record in vehicles catalog */
  async ensureVehicle(vehicle: VehicleInfo): Promise<string | null> {
    return vinApi.ensureVehicle(vehicle);
  },

  /** Extract parts → create products + link + graph edges (atomic RPC) */
  async addPartsToInventory(params: {
    companyId: string;
    userId: string;
    vehicle: VehicleInfo;
    parts: ExtractedPart[];
  }): Promise<{ added: number; existing: number }> {
    const { companyId, vehicle, parts } = params;
    return vinApi.addPartsToInventory(companyId, vehicle, parts);
  },
};
