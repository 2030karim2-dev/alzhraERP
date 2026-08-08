import { validateVin } from '../../utils/vinValidator';
import type { IVinDecoder, VehicleIdentity } from '../decoder/vinDecoder.types';
import { supabase } from '../../../../lib/supabase/client';
import { findInventoryForOem } from '../vinInventoryBridge';

export interface VehiclePartMatch {
  canonicalName: string;
  oemNumbers: string[];
  compatibility: 'CONFIRMED' | 'UNKNOWN' | 'NOT_COMPATIBLE';
  evidence: string | null;
  inventory: any[]; // Inventory results from Phase 2A
}

export interface VehicleSearchResponse {
  vin: string;
  vehicle: VehicleIdentity | null;
  status: 'SUCCESS' | 'INVALID_VIN' | 'DECODER_UNAVAILABLE' | 'VEHICLE_UNKNOWN' | 'PARTS_SEARCH_FAILED';
  parts: VehiclePartMatch[];
}

export class VehicleSearchEngine {
  constructor(private vinDecoder: IVinDecoder) {}

  /**
   * Main Orchestration Workflow: Phase 2B
   */
  async searchByVin(vinInput: string): Promise<VehicleSearchResponse> {
    // 1. Validate VIN
    const validation = validateVin(vinInput);
    if (!validation.isValid) {
      return {
        vin: vinInput,
        vehicle: null,
        status: 'INVALID_VIN',
        parts: [],
      };
    }
    const vin = validation.normalizedVin;

    // 2. Decode VIN (or find in DB)
    // For now, we rely on the decoder abstraction to resolve the vehicle context
    const decodeResult = await this.vinDecoder.decodeVin(vin);
    if (decodeResult.status !== 'SUCCESS' || !decodeResult.vehicle) {
      return {
        vin,
        vehicle: null,
        status: decodeResult.status === 'VIN_NOT_FOUND' ? 'VEHICLE_UNKNOWN' : 'DECODER_UNAVAILABLE',
        parts: [],
      };
    }
    const vehicle = decodeResult.vehicle;

    // 3. Persist or lookup in vehicle_knowledge_base (Simulated for this contract layer)
    // If we had a real Edge Function, we would insert/update it here.
    // We will query vehicle_core_parts based on the vehicle identity (Make/Model/Generation).
    
    // For this demonstration backend contract, we will query vehicle_core_parts directly 
    // by matching the VIN if it exists in vehicle_knowledge_base.
    let corePartsData: any[] = [];
    try {
      // Find the vehicle_id in the knowledge base
      const { data: vkb } = await supabase
        .from('vehicle_knowledge_base')
        .select('id')
        .eq('vin', vin)
        .maybeSingle();

      if (vkb?.id) {
        // Query compatibility evidence
        const { data: parts } = await supabase
          .from('vehicle_core_parts')
          .select('*')
          .eq('vehicle_id', vkb.id);
        
        corePartsData = parts || [];
      } else {
        // Fallback: If no exact VIN match in DB, we could query by generation/model.
        // But rule #11 says: "If the system does not have sufficient compatibility data to prove that a product fits a vehicle, it MUST NOT claim compatibility."
        // We will return empty confirmed parts, but the vehicle identity is still successful.
      }
    } catch (e) {
      return {
        vin,
        vehicle,
        status: 'PARTS_SEARCH_FAILED',
        parts: [],
      };
    }

    // 4. Map to VehiclePartMatch and Search Inventory
    const partsResults: VehiclePartMatch[] = [];

    for (const cp of corePartsData) {
      const oemNumbers = cp.oem_numbers || [];
      
      // Step 5: OEM/Part Number Matching -> Inventory (using Phase 2A RPC)
      // `findInventoryForOem` natively uses the safe `search_by_oem` exact matching mechanism.
      const inventory = await findInventoryForOem(oemNumbers);

      partsResults.push({
        canonicalName: cp.canonical_part_name,
        oemNumbers: oemNumbers,
        compatibility: cp.fitment_status === 'VERIFIED' ? 'CONFIRMED' : 'UNKNOWN',
        evidence: cp.evidence || cp.evidence_source || null,
        inventory: inventory,
      });
    }

    return {
      vin,
      vehicle,
      status: 'SUCCESS',
      parts: partsResults,
    };
  }
}
