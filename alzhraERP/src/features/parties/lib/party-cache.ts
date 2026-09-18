import { logger } from '../../../core/utils/logger';

/**
 * Party Cache Utility
 * Provides local storage persistence for parties to improve search performance.
 */

import type { Party, PartyType } from '../types';

const CACHE_KEY_PREFIX = 'alzahra_party_cache_';

export const partyCache = {
  /**
   * Get cached parties for a specific company, type, and optional branch
   */
  get: (companyId: string, type: PartyType, branchId?: string | null): Party[] => {
    try {
      const branchKey = branchId ?? 'all';
      const key = `${CACHE_KEY_PREFIX}${companyId}_${branchKey}_${type}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const parsed = JSON.parse(stored) as { data?: unknown; timestamp?: unknown };
      const data = parsed.data;
      const timestamp = parsed.timestamp;

      // Expire cache after 1 hour to ensure fresh data eventual consistency.
      if (typeof timestamp !== 'number' || Date.now() - timestamp > 3600000) {
        localStorage.removeItem(key);
        return [];
      }

      if (!Array.isArray(data)) {
        logger.warn('party-cache', 'Party cache entry malformed, discarding for', key);
        localStorage.removeItem(key);
        return [];
      }

      return data as Party[];
    } catch (e) {
      logger.error('party-cache', 'Failed to read party cache:', e);
      return [];
    }
  },

  /**
   * Set cached parties
   */
  set: (companyId: string, type: PartyType, data: Party[], branchId?: string | null) => {
    try {
      const branchKey = branchId ?? 'all';
      const key = `${CACHE_KEY_PREFIX}${companyId}_${branchKey}_${type}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      logger.error('party-cache', 'Failed to update party cache:', e);
    }
  },

  /**
   * Clear cache for a specific company/type/branch
   */
  clear: (companyId: string, type: PartyType, branchId?: string | null) => {
    try {
      const branchKey = branchId ?? 'all';
      const key = `${CACHE_KEY_PREFIX}${companyId}_${branchKey}_${type}`;
      localStorage.removeItem(key);
    } catch (e) {
      logger.error('party-cache', 'Failed to clear party cache:', e);
    }
  },

  /**
   * Clear all party caches
   */
  clearAll: () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_KEY_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        localStorage.removeItem(k);
      });
    } catch (e) {
      logger.error('party-cache', 'Failed to clear all party caches:', e);
    }
  },
};
