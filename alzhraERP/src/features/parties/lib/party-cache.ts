
/**
 * Party Cache Utility
 * Provides local storage persistence for parties to improve search performance.
 */

import { Party, PartyType } from '../types';

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

            const { data, timestamp } = JSON.parse(stored);

            // Expire cache after 1 hour to ensure fresh data eventual consistency
            const isExpired = Date.now() - timestamp > 3600000;
            if (isExpired) return [];

            return data as Party[];
        } catch (e) {
            console.error('Failed to read party cache:', e);
            return [];
        }
    },

    /**
     * Set cached parties
     */
    set: (companyId: string, type: PartyType, data: Party[]) => {
        try {
            const key = `${CACHE_KEY_PREFIX}${companyId}_${type}`;
            localStorage.setItem(key, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('Failed to update party cache:', e);
        }
    },

    /**
     * Clear cache for a specific company/type
     */
    clear: (companyId: string, type: PartyType) => {
        const key = `${CACHE_KEY_PREFIX}${companyId}_${type}`;
        localStorage.removeItem(key);
    }
};
