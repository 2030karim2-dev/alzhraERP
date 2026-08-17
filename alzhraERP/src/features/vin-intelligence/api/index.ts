/**
 * VIN Intelligence — API Layer
 * Single boundary for all Supabase + Edge Function calls.
 * Layer: Component → Hook → Service → API → Supabase
 */

import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type { TableInsert } from '../../../core/types/supabase-helpers';
import type {
  ExtractedPart,
  MatchingInventoryProduct,
  VehicleInfo,
  VehicleProductLink,
} from '../types';

export const vinApi = {
  /** Structural VIN → vehicle resolution via vin_prefix (DB only) */
  resolveVehicleFromVin: async (vin: string) => {
    const { data, error } = await supabase.rpc('resolve_vehicle_from_vin', { p_vin: vin });
    if (error) throw error;
    return data as { found: boolean; vin: string; vehicle: Record<string, unknown> | null };
  },

  /** Hybrid VIN decode: vPIC → DB → AI (Edge Function) */
  decodeVin: async (body: { vin: string; mode?: 'hybrid' | 'db' | 'ai'; provider?: string; model?: string }) => {
    const { data, error } = await supabase.functions.invoke('vin-decode', { body });
    if (error) {
      logger.error('VinAPI', 'decodeVin failed', error);
      throw new Error('فشل فك الشاصي، حاول مرة أخرى');
    }
    return data as {
      found: boolean;
      source: 'db' | 'ai' | 'vpic';
      vin: string;
      vehicle: Record<string, unknown> | null;
      confidence: 'high' | 'medium' | 'low' | null;
      raw_ai?: unknown;
    };
  },

  /** Inventory products matching a vehicle (Internal Compatibility Graph) */
  getMatchingInventoryProducts: async (
    companyId: string,
    make: string,
    model?: string | null,
    year?: number | null,
  ): Promise<MatchingInventoryProduct[]> => {
    const { data, error } = await supabase.rpc('get_matching_inventory_products', {
      p_company_id: companyId,
      p_vehicle_make: make,
      p_vehicle_model: model ?? null,
      p_year: year ?? null,
    });
    if (error) throw error;
    return (data ?? []) as MatchingInventoryProduct[];
  },

  /** Real parts lookup via megazip.net catalog (no AI) */
  searchPartsByNumber: async (partNumber: string) => {
    const { data, error } = await supabase.functions.invoke('vin-parts', {
      body: { action: 'searchByPart', partNumber },
    });
    if (error) {
      logger.error('VinAPI', 'searchPartsByNumber failed', error);
      throw new Error('فشل البحث عن القطعة، حاول مرة أخرى');
    }
    return data as { source: string; parts: Array<{ partNumber: string; name: string; make: string | null }> };
  },

  // ── vin_analyses ─────────────────────────────────────────
  listVinAnalyses: async (companyId: string) => {
    // Prefer updated_at ordering (added by migration 20260814000005).
    // If that column is missing on the server (migration not applied yet),
    // PostgREST answers 400 → fall back to created_at ordering so the list
    // keeps working and stops spamming the console with errors.
    const query = () =>
      supabase
        .from('vin_analyses')
        .select('*')
        .eq('company_id', companyId)
        .limit(50);

    const { data, error } = await query()
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error) return data ?? [];

    logger.warn(
      'VinAPI',
      'order by updated_at failed (migration 20260814000005 missing on server?) — retrying with created_at only',
      error
    );

    const { data: fallback, error: fallbackError } = await query().order('created_at', { ascending: false });
    if (fallbackError) throw fallbackError;
    return fallback ?? [];
  },

  saveVinAnalysis: async (payload: TableInsert<'vin_analyses'>) => {
    // PostgREST expects COLUMN names in `on_conflict` (not the constraint name).
    // Passing the constraint name ("uq_vin_analyses_company_vin") returns 400:
    //   column "uq_vin_analyses_company_vin" does not exist
    const { data, error } = await supabase
      .from('vin_analyses')
      .upsert(payload, { onConflict: 'company_id,vin' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── vehicle_products (vehicle ↔ product links) ───────────
  listVehicleProducts: async (vehicleId: string): Promise<VehicleProductLink[]> => {
    const { data, error } = await supabase.from('vehicle_products').select('*').eq('vehicle_id', vehicleId);
    if (error) throw error;
    return (data ?? []) as VehicleProductLink[];
  },

  linkVehicleProduct: async (payload: TableInsert<'vehicle_products'>): Promise<VehicleProductLink> => {
    // PostgREST expects COLUMN names in `on_conflict` (not the constraint name).
    const { data, error } = await supabase
      .from('vehicle_products')
      .upsert(payload, { onConflict: 'vehicle_id,product_id' })
      .select()
      .single();
    if (error) throw error;
    return data as VehicleProductLink;
  },

  unlinkVehicleProduct: async (id: string) => {
    const { error } = await supabase.from('vehicle_products').delete().eq('id', id);
    if (error) throw error;
  },

  // ── part_compatibility (graph edge) ──────────────────────
  upsertPartCompatibility: async (payload: TableInsert<'part_compatibility'>) => {
    // PostgREST expects COLUMN names in `on_conflict` (not the constraint name).
    const { data, error } = await supabase
      .from('part_compatibility')
      .upsert(payload, {
        onConflict:
          'company_id,part_number,vehicle_make,vehicle_model,vehicle_year_from,vehicle_year_to',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Atomically create products + link + graph edges for extracted parts (RPC) */
  addPartsToInventory: async (
    companyId: string,
    vehicle: VehicleInfo,
    parts: ExtractedPart[],
  ): Promise<number> => {
    const { data, error } = await supabase.rpc('add_vin_parts_to_inventory', {
      p_company_id: companyId,
      p_vehicle: {
        id: vehicle.id ?? null,
        make: vehicle.make,
        model: vehicle.model ?? null,
        year: vehicle.year ?? null,
        year_start: vehicle.yearStart ?? null,
        year_end: vehicle.yearEnd ?? null,
        engine: vehicle.engine ?? null,
        body_type: vehicle.bodyType ?? null,
        drive_type: vehicle.driveType ?? null,
        fuel_type: vehicle.fuelType ?? null,
        transmission: vehicle.transmission ?? null,
        region: vehicle.region ?? null,
      },
      p_parts: parts.map((p) => ({
        part_number: p.partNumber,
        description: p.description ?? null,
        manufacturer: p.manufacturer ?? null,
        source: p.source,
      })),
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },
};
