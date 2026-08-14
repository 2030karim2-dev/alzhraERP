/**
 * POS Smart Search Service
 * Coordinates server-side RPC, sales history, popular products,
 * and comprehensive search across products, categories, and codes.
 */
import { normalizeSearch } from '../../../../core/utils/search';
import type { POSSearchFilters, POSSearchResponse, POSSearchResult } from './types';
import { getCachedSearch, setCachedSearch, invalidateSearchCache } from './cache';
import { searchDatabase, searchByBarcode } from './database';
import { getRecentSales, getSalesCounts } from './history';
import { getPopularProducts } from './popular';

export * from './types';

export const posSearchService = {
    /**
     * Perform a comprehensive POS search with fuzzy matching,
     * popularity scoring, and quick results.
     */
    async search(
        companyId: string,
        query: string,
        filters?: POSSearchFilters,
        limit: number = 20
    ): Promise<POSSearchResponse> {
        const startTime = performance.now();
        const cacheKey = `${companyId}:${query}:${JSON.stringify(filters)}:${limit}`;

        // Cache hit
        const cached = getCachedSearch(cacheKey);
        if (cached) {
            return cached;
        }

        const normalizedQuery = normalizeSearch(query).trim();

        // If empty query, return popular products
        if (!normalizedQuery) {
            const popular = await getPopularProducts(companyId, limit);
            const response: POSSearchResponse = {
                results: popular,
                total: popular.length,
                popular_suggestions: popular.map(p => p.name_ar),
                search_time_ms: performance.now() - startTime,
            };
            setCachedSearch(cacheKey, response);
            return response;
        }

        // Parallel: DB search + popular products + sales history
        const [dbResults, popularProducts, salesHistory] = await Promise.all([
            searchDatabase(companyId, normalizedQuery, filters, limit),
            getPopularProducts(companyId, 5),
            getRecentSales(companyId, normalizedQuery, 5),
        ]);

        // Merge and deduplicate results
        const seen = new Set<string>();
        const merged: POSSearchResult[] = [];

        // Add DB results first (most relevant)
        for (const item of dbResults) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                merged.push(item);
            }
        }

        // Add sales history results (if not already included)
        for (const item of salesHistory) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                merged.push(item);
            }
        }

        // Add popular products as fallback (only if few results)
        if (merged.length < 5) {
            for (const item of popularProducts) {
                if (!seen.has(item.id)) {
                    seen.add(item.id);
                    merged.push(item);
                }
            }
        }

        // Sort by score descending
        merged.sort((a, b) => b.score - a.score);

        // Generate popular suggestions
        const popular_suggestions = popularProducts
            .map(p => p.name_ar)
            .slice(0, 5);

        const response: POSSearchResponse = {
            results: merged.slice(0, limit),
            total: merged.length,
            popular_suggestions,
            search_time_ms: performance.now() - startTime,
        };

        // Update cache
        setCachedSearch(cacheKey, response);

        return response;
    },

    searchDatabase,
    getPopularProducts,
    getRecentSales,
    getSalesCounts,

    /**
     * Invalidate the search cache (useful after product updates).
     */
    invalidateCache(): void {
        invalidateSearchCache();
    },

    searchByBarcode,
};

export default posSearchService;
