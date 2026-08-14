/**
 * POS Smart Search — response cache
 */
import type { POSSearchResponse } from './types';

const recentSearchesCache = new Map<string, POSSearchResponse>();
const CACHE_TTL = 30_000; // 30 seconds
const CACHE_MAX_ENTRIES = 50;

export function getCachedSearch(key: string): POSSearchResponse | undefined {
    const cached = recentSearchesCache.get(key);
    if (cached && (Date.now() - cached.search_time_ms < CACHE_TTL)) {
        return cached;
    }
    return undefined;
}

export function setCachedSearch(key: string, value: POSSearchResponse): void {
    recentSearchesCache.set(key, value);
    // Evict oldest entry when the cache grows too large
    if (recentSearchesCache.size > CACHE_MAX_ENTRIES) {
        const firstKey = recentSearchesCache.keys().next().value;
        if (firstKey) recentSearchesCache.delete(firstKey);
    }
}

export function invalidateSearchCache(): void {
    recentSearchesCache.clear();
}
