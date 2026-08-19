import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCachedSearch, invalidateSearchCache, setCachedSearch } from './cache';
import type { POSSearchResponse } from './types';

const makeResponse = (id: number): POSSearchResponse => ({
  results: [
    {
      id: `p-${id}`,
      type: 'product',
      name: `Product ${id}`,
      name_ar: `منتج ${id}`,
      selling_price: 10,
      cost_price: 5,
      stock_quantity: 1,
      unit: 'pcs',
      score: 1,
    },
  ],
  total: 1,
  popular_suggestions: [],
  search_time_ms: 5,
});

describe('POS search response cache', () => {
  beforeEach(() => {
    invalidateSearchCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the cached response for a fresh key', () => {
    setCachedSearch('q=brake', makeResponse(1));
    expect(getCachedSearch('q=brake')).toEqual(makeResponse(1));
  });

  it('returns undefined for a key that was never cached', () => {
    expect(getCachedSearch('missing')).toBeUndefined();
  });

  it('treats expired entries (older than TTL) as a miss', () => {
    setCachedSearch('q=oil', makeResponse(2));
    vi.advanceTimersByTime(31_000); // CACHE_TTL = 30s
    expect(getCachedSearch('q=oil')).toBeUndefined();
  });

  it('keeps fresh entries alive while under the TTL', () => {
    setCachedSearch('q=filter', makeResponse(3));
    vi.advanceTimersByTime(29_000);
    expect(getCachedSearch('q=filter')).toBeDefined();
  });

  it('evicts every entry when invalidateSearchCache is called', () => {
    setCachedSearch('a', makeResponse(4));
    setCachedSearch('b', makeResponse(5));
    invalidateSearchCache();
    expect(getCachedSearch('a')).toBeUndefined();
    expect(getCachedSearch('b')).toBeUndefined();
  });

  it('allows a key to be re-cached after invalidation', () => {
    setCachedSearch('q=wheel', makeResponse(6));
    invalidateSearchCache();
    setCachedSearch('q=wheel', makeResponse(7));
    expect(getCachedSearch('q=wheel')?.results[0]?.id).toBe('p-7');
  });
});
