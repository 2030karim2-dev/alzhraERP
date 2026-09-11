/**
 * draftStorage.ts
 * Lightweight helper for persisting form drafts in localStorage.
 * Each draft is keyed by feature + companyId to ensure isolation between companies.
 */

const PREFIX = 'alz_draft_';

const isStorageAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
};

export const draftStorage = {
  /**
   * Save a draft object. Silently fails if localStorage is unavailable.
   */
  save<T>(key: string, data: T): void {
    if (!isStorageAvailable()) return;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
    } catch {
      // Quota exceeded or private browsing – ignore
    }
  },

  /**
   * Load a previously saved draft. Returns null if nothing is saved.
   */
  load<T>(key: string): T | null {
    if (!isStorageAvailable()) return null;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /**
   * Remove a draft (e.g., after successful submission or discard).
   */
  clear(key: string): void {
    if (!isStorageAvailable()) return;
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
  },

  /**
   * Check whether a draft exists for the given key.
   */
  exists(key: string): boolean {
    if (!isStorageAvailable()) return false;
    try {
      return localStorage.getItem(PREFIX + key) !== null;
    } catch {
      return false;
    }
  },
};
