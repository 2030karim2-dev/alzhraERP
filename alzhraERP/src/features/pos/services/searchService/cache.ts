/**
 * POS Smart Search — response cache
 */
import type { POSSearchResponse } from './types';

/** Cache entry wraps the response with the wall-clock time it was stored at. */
interface CacheEntry {
    value: POSSearchResponse;
    cachedAt: number;
}

const recentSearchesCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30_000; // 30 seconds
const CACHE_MAX_ENTRIES = 50;

export function getCachedSearch(key: string): POSSearchResponse | undefined {
    const entry = recentSearchesCache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.cachedAt < CACHE_TTL) {
        return entry.value;
    }

    // Remove the expired entry so it stops consuming memory instead of only
    // being ignored until the next overwrite.
    recentSearchesCache.delete(key);
    return undefined;
}

export function setCachedSearch(key: string, value: POSSearchResponse): void {
    // Evict expired entries first so a still-fresh entry is not the one dropped
    // when the cache is at capacity.
    for (const [k, v] of recentSearchesCache) {
        if (Date.now() - v.cachedAt >= CACHE_TTL) {
            recentSearchesCache.delete(k);
        }
    }

    recentSearchesCache.set(key, { value, cachedAt: Date.now() });

    // Evict the oldest entries once the cache grows too large.
    while (recentSearchesCache.size > CACHE_MAX_ENTRIES) {
        const firstKey = recentSearchesCache.keys().next().value;
        if (firstKey === undefined) break;
        recentSearchesCache.delete(firstKey);
    }
}

export function invalidateSearchCache(): void {
    recentSearchesCache.clear();
}
