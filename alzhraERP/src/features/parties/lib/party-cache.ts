import { logger } from '../../../core/utils/logger';

/**
 * Party Cache Utility
 * Provides local storage persistence for parties to improve search performance.
 */

import type { Party, PartyType } from '../types';

const CACHE_KEY_PREFIX = 'alzahra_party_cache_';

export const partyCache = {
  /**
   * Get cached parties for a specific company and type
   */
  get: (companyId: string, type: PartyType): Party[] => {
    try {
      const key = `${CACHE_KEY_PREFIX}${companyId}_${type}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const parsed = JSON.parse(stored) as { data?: unknown; timestamp?: unknown };
      const data = parsed.data;
      const timestamp = parsed.timestamp;

      // Expire cache after 1 hour to ensure fresh data eventual consistency.
      // Also drop the stale entry so it stops occupying storage.
      if (typeof timestamp !== 'number' || Date.now() - timestamp > 3600000) {
        localStorage.removeItem(key);
        return [];
      }

      // Guard the shape we trust downstream: corrupt/legacy payloads must
      // never surface as malformed parties.
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
  set: (companyId: string, type: PartyType, data: Party[]) => {
    try {
      const key = `${CACHE_KEY_PREFIX}${companyId}_${type}`;
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
   * Clear cache for a specific company/type
   */
  clear: (companyId: string, type: PartyType) => {
    // localStorage.removeItem can throw in restricted/incognito contexts —
    // keep the parity with `get`/`set` so callers are never broken.
    try {
      const key = `${CACHE_KEY_PREFIX}${companyId}_${type}`;
      localStorage.removeItem(key);
    } catch (e) {
      logger.error('party-cache', 'Failed to clear party cache:', e);
    }
  },
};
