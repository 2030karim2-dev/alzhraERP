/**
 * POS Smart Search Service
 * Coordinates server-side RPC, sales history, popular products,
 * and comprehensive search across products, categories, and codes.
 */
import { normalizeSearch } from '../../../../core/utils/search';
import { logger } from '../../../../core/utils/logger';
import type { POSSearchFilters, POSSearchResponse, POSSearchResult } from './types';
import { getCachedSearch, setCachedSearch, invalidateSearchCache } from './cache';
import { searchDatabase, searchByBarcode } from './database';
import { getRecentSales, getSalesCounts } from './history';
import { getPopularProducts } from './popular';

export * from './types';

/** Monotonic timer with a Date.now() fallback for non-browser runtimes. */
const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Empty response used to fail gracefully when the search pipeline throws. */
const failedResponse = (): POSSearchResponse => ({
  results: [],
  total: 0,
  popular_suggestions: [],
  search_time_ms: 0,
  error: 'search_failed',
});

export const posSearchService = {
  /**
   * Perform a comprehensive POS search with fuzzy matching,
   * popularity scoring, and quick results.
   */
  async search(
    companyId: string,
    query: string,
    filters?: POSSearchFilters,
    limit = 20
  ): Promise<POSSearchResponse> {
    try {
      const startTime = now();
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
          search_time_ms: now() - startTime,
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
      const popular_suggestions = popularProducts.map(p => p.name_ar).slice(0, 5);

      const response: POSSearchResponse = {
        results: merged.slice(0, limit),
        total: merged.length,
        popular_suggestions,
        search_time_ms: now() - startTime,
      };

      // Update cache
      setCachedSearch(cacheKey, response);

      return response;
    } catch (err) {
      // The sub-services catch most failures themselves, but guard the
      // orchestrator as well so a single bad path never produces an
      // unhandled rejection that leaves the UI with no feedback.
      logger.error('pos-search', 'POS search failed:', (err as Error).message);
      return failedResponse();
    }
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
