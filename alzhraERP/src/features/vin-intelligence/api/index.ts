/**
 * VIN Intelligence — API Layer
 * Single boundary for all Supabase + Edge Function calls.
 * Layer: Component → Hook → Service → API → Supabase
 */

import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type { TableInsert } from '../../../core/types/supabase-helpers';
import type {
  MatchingInventoryProduct,
  VehicleProductLink,
} from '../types';

/**
 * Proactively refresh the auth session before invoking edge functions.
 * Edge functions call supabase.auth.getUser(), which fails with 401 on an
 * expired access token (e.g. after a network outage breaks auto-refresh).
 * Returns false when the session is unrecoverable (must log in again).
 */
async function ensureFreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && !!data?.session;
  } catch {
    return false;
  }
}

function authErrorMsg(error: unknown): string | null {
  const ctx = (error as { context?: { body?: { code?: string } } }).context;
  const code = ctx?.body?.code;
  return code === 'AUTH_INVALID' || code === 'AUTH_MISSING'
    ? 'انتهت الجلسة، يرجى إعادة تسجيل الدخول'
    : null;
}

export const vinApi = {
  /** Structural VIN → vehicle resolution via vin_prefix (DB only) */
  resolveVehicleFromVin: async (vin: string) => {
    const { data, error } = await supabase.rpc('resolve_vehicle_from_vin', { p_vin: vin });
    if (error) throw error;
    return data as { found: boolean; vin: string; vehicle: Record<string, unknown> | null };
  },

  /** Hybrid VIN decode: vPIC → DB → AI (Edge Function) */
  decodeVin: async (body: { vin: string; mode?: 'hybrid' | 'db' | 'ai'; provider?: string; model?: string }) => {
    if (!(await ensureFreshSession())) {
      throw new Error('انتهت الجلسة، يرجى إعادة تسجيل الدخول');
    }
    const { data, error } = await supabase.functions.invoke('vin-decode', { body });
    if (error) {
      logger.error('VinAPI', 'decodeVin failed', error);
      throw new Error(authErrorMsg(error) ?? 'فشل فك الشاصي، حاول مرة أخرى');
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
    if (!(await ensureFreshSession())) {
      throw new Error('انتهت الجلسة، يرجى إعادة تسجيل الدخول');
    }
    const { data, error } = await supabase.functions.invoke('vin-parts', {
      body: { action: 'searchByPart', partNumber },
    });
    if (error) {
      logger.error('VinAPI', 'searchPartsByNumber failed', error);
      throw new Error(authErrorMsg(error) ?? 'فشل البحث عن القطعة، حاول مرة أخرى');
    }
    return data as { source: string; parts: Array<{ partNumber: string; name: string; make: string | null }> };
  },

  // ── vin_analyses ─────────────────────────────────────────
  listVinAnalyses: async (companyId: string) => {
    const { data, error } = await supabase
      .from('vin_analyses')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },

  saveVinAnalysis: async (payload: TableInsert<'vin_analyses'>) => {
    const { data, error } = await supabase.from('vin_analyses').insert(payload).select().single();
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
    const { data, error } = await supabase
      .from('vehicle_products')
      .upsert(payload, { onConflict: 'uq_vehicle_product' })
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
    const { data, error } = await supabase
      .from('part_compatibility')
      .upsert(payload, { onConflict: 'uq_part_compat' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
