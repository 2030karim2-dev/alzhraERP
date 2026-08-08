/**
 * VIN History Service
 * ===================
 * Phase 2: Supabase-persisted VIN analysis history.
 * Replaces localStorage with vin_analysis_history table.
 * Falls back to localStorage when Supabase is unavailable.
 */
import { supabase } from '../../../lib/supabaseClient';
import type { VinHistoryEntry } from '../types';

const STORAGE_KEY = 'alzhra_vin_history';
const MAX_ENTRIES = 50;

/** Load history from localStorage as fallback */
function loadLocal(): VinHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save history to localStorage as fallback */
function saveLocal(entries: VinHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* storage full — ignore */ }
}

async function fetchRemote(userId: string): Promise<VinHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('vin_analysis_history')
      .select('vin, make, model, year, analyzed_at, result_summary')
      .eq('user_id', userId)
      .order('analyzed_at', { ascending: false })
      .limit(MAX_ENTRIES);

    if (error) throw error;
    return (data || []).map(r => ({
      vin: r.vin,
      make: r.make ?? undefined,
      model: r.model ?? undefined,
      year: r.year ?? undefined,
      analyzedAt: r.analyzed_at,
      resultSummary: r.result_summary ?? undefined,
    }));
  } catch {
    return loadLocal(); // fallback to localStorage
  }
}

async function pushRemote(userId: string, companyId: string | undefined, entry: VinHistoryEntry): Promise<void> {
  try {
    await supabase.from('vin_analysis_history').upsert({
      user_id: userId,
      company_id: companyId ?? null,
      vin: entry.vin,
      make: entry.make ?? null,
      model: entry.model ?? null,
      year: entry.year ?? null,
      analyzed_at: entry.analyzedAt,
      result_summary: entry.resultSummary ?? null,
    }, { onConflict: 'user_id, vin' });
  } catch {
    // Silently fall back to localStorage
  }
}

async function clearRemote(userId: string): Promise<void> {
  try {
    await supabase.from('vin_analysis_history').delete().eq('user_id', userId);
  } catch { /* ignore */ }
}

export const vinHistoryService = {
  async getHistory(userId: string): Promise<VinHistoryEntry[]> {
    return fetchRemote(userId);
  },

  async addEntry(
    userId: string,
    companyId: string | undefined,
    entry: VinHistoryEntry,
  ): Promise<VinHistoryEntry[]> {
    // Save to remote first
    await pushRemote(userId, companyId, entry);

    // Also update localStorage for offline access
    const local = loadLocal();
    const updated = [entry, ...local.filter(h => h.vin !== entry.vin)].slice(0, MAX_ENTRIES);
    saveLocal(updated);

    // Return fresh remote list
    return fetchRemote(userId);
  },

  async clearHistory(userId: string): Promise<void> {
    await clearRemote(userId);
    localStorage.removeItem(STORAGE_KEY);
  },

  /** Synchronous fallback for when user is not authenticated */
  getLocalHistory(): VinHistoryEntry[] {
    return loadLocal();
  },

  addLocalEntry(entry: VinHistoryEntry): VinHistoryEntry[] {
    const local = loadLocal();
    const updated = [entry, ...local.filter(h => h.vin !== entry.vin)].slice(0, MAX_ENTRIES);
    saveLocal(updated);
    return updated;
  },

  clearLocalHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
