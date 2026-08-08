/**
 * VIN Vehicle Lookup Service
 * ===========================
 * Phase 2: Real Supabase-powered vehicle identification.
 * Replaces mockVehicles.ts with RPC get_vehicle_by_vin.
 */
import { supabase } from '../../../lib/supabaseClient';
import type { VehicleConfiguration } from '../types';

export const vinVehicleService = {
  /**
   * Look up a vehicle by its VIN from the knowledge base.
   * Returns null when not found (caller should handle gracefully).
   */
  async lookupVehicle(vin: string): Promise<VehicleConfiguration | null> {
    const normalized = vin.toUpperCase().replace(/\s+/g, '');
    if (normalized.length < 5) return null;

    try {
      const { data, error } = await supabase.rpc('get_vehicle_by_vin', {
        p_vin: normalized,
      });

      if (error) {
        console.warn('[vinVehicleService] RPC error:', error.message);
        return null;
      }

      // RPC returns zero rows when VIN is unknown
      if (!data || data.length === 0) return null;

      const row = data[0];
      return {
        vin: normalized,
        make: row.make,
        model: row.model,
        year: row.year ?? undefined,
        generation: row.generation ?? undefined,
        engineCode: row.engine_code ?? undefined,
        engineSize: row.engine_size ?? undefined,
        cylinderCount: row.cylinder_count ?? undefined,
        fuelType: row.fuel_type as VehicleConfiguration['fuelType'],
        transmission: row.transmission as VehicleConfiguration['transmission'],
        driveType: row.drive_type as VehicleConfiguration['driveType'],
        market: row.market as VehicleConfiguration['market'],
        bodyType: row.body_type ?? undefined,
        cabType: row.cab_type as VehicleConfiguration['cabType'],
      };
    } catch (err) {
      console.warn('[vinVehicleService] lookup failed:', err);
      return null;
    }
  },

  /**
   * Get approximate count of vehicles in knowledge base.
   * Falls back to 0 when Supabase is unavailable.
   */
  async getVehicleCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('vehicle_knowledge_base')
        .select('*', { count: 'exact', head: true });

      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  },
};
