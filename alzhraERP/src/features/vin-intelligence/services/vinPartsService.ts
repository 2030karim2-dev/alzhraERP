/**
 * VIN Parts Service
 * =================
 * Phase 2: Real Supabase-powered core parts lookup.
 * Replaces MOCK_PARTS with RPC get_core_parts_for_vehicle.
 */
import { supabase } from '../../../lib/supabaseClient';
import type { VehicleCorePart, FitmentStatus } from '../types';

export const vinPartsService = {
  /**
   * Fetch core parts for a given VIN from the knowledge base.
   * Returns empty array when not found or unavailable.
   */
  async getCoreParts(vin: string): Promise<VehicleCorePart[]> {
    const normalized = vin.toUpperCase().replace(/\s+/g, '');
    if (normalized.length < 5) return [];

    try {
      const { data, error } = await supabase.rpc('get_core_parts_for_vehicle', {
        p_vin: normalized,
      });

      if (error) {
        console.warn('[vinPartsService] RPC error:', error.message);
        return [];
      }

      if (!data || data.length === 0) return [];

      return data.map((row: any) => ({
        id: row.id,
        canonicalPartName: row.canonical_part_name,
        category: row.category,
        position: row.position ?? undefined,
        side: row.side ?? undefined,
        oemNumbers: row.oem_numbers ?? [],
        crossReferences: row.cross_references ?? undefined,
        fitmentStatus: (row.fitment_status as FitmentStatus) ?? 'UNKNOWN',
        evidence: row.evidence ?? undefined,
        evidenceSource: row.evidence_source ?? undefined,
        demandLevel: row.demand_level as VehicleCorePart['demandLevel'],
        salesCount: row.sales_count ?? undefined,
        vehicleMatches: row.vehicle_matches ?? undefined,
        inventoryMatches: [], // populated later by inventory bridge
      }));
    } catch (err) {
      console.warn('[vinPartsService] fetch failed:', err);
      return [];
    }
  },
};
