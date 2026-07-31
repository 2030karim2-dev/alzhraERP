/**
 * useProductsPaginated
 * =====================
 * Server-side pagination hook for the product inventory list.
 *
 * Instead of fetching ALL products at once (which degrades with 10k+ rows),
 * this hook fetches a fixed page from Supabase on demand and keeps track of
 * the total count so the UI can render a proper pagination widget.
 *
 * Features:
 *  - Server-side pagination (OFFSET / LIMIT in the DB query)
 *  - Total-count from Supabase `count: 'exact'`
 *  - Server-side search debounce (300 ms)
 *  - Server-side sort direction
 *  - Real-time invalidation via Supabase channel
 *  - Prefetches the next page for instant navigation
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';
import { productService } from '../services/productService';
import { Product } from '../types';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProductsPage {
  data: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UseProductsPaginatedOptions {
  pageSize?: number;
  initialPage?: number;
  initialSearch?: string;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
}

// ── Query key factory ────────────────────────────────────────────────────────

export const productsPageKey = (
  companyId: string,
  page: number,
  pageSize: number,
  search: string,
  sortKey: string,
  sortDir: string,
  branchId?: string | null
) => ['products_paginated', companyId, page, pageSize, search, sortKey, sortDir, branchId] as const;

// ── Main hook ────────────────────────────────────────────────────────────────

export const useProductsPaginated = (options: UseProductsPaginatedOptions = {}) => {
  const {
    pageSize = 50,
    initialPage = 1,
    initialSearch = '',
    sortKey = 'updated_at',
    sortDir = 'desc',
  } = options;

  const { user } = useAuthStore();
  const companyId = user?.company_id ?? '';
  const queryClient = useQueryClient();
  const { branchId } = useBranchFilter();

  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // Debounce search: 300 ms delay before sending to server
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1); // reset to first page on new search
    }, 300);
  }, []);

  // ── Main paginated query ─────────────────────────────────────────────────

  const queryKey = productsPageKey(companyId, page, pageSize, debouncedSearch, sortKey, sortDir, branchId);

  const query = useQuery<ProductsPage>({
    queryKey,
    queryFn: async (): Promise<ProductsPage> => {
      if (!companyId) return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };

      const from = (page - 1) * pageSize;

      const { data, error } = await supabase.rpc('search_inventory_paginated', {
        p_company_id: companyId,
        p_term: debouncedSearch.trim(),
        p_limit: pageSize,
        p_offset: from,
        p_sort_key: sortKey,
        p_sort_dir: sortDir,
        p_branch_id: branchId || null
      });
      if (error) throw error;

      const products = productService.mapRawProducts(data ?? []);
      const totalCount = (data as any)?.[0]?.total_count ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return { data: products, totalCount, page, pageSize, totalPages };
    },
    enabled: !!companyId,
    staleTime: 1000 * 30, // 30s - products don't change every second
    placeholderData: (prev) => prev, // Keep previous data while loading new page (no flicker)
  });

  // ── Prefetch next page ───────────────────────────────────────────────────

  useEffect(() => {
    if (!query.data || page >= (query.data.totalPages ?? 1)) return;
    const nextKey = productsPageKey(companyId, page + 1, pageSize, debouncedSearch, sortKey, sortDir, branchId);
    void queryClient.prefetchQuery({
      queryKey: nextKey,
      queryFn: async (): Promise<ProductsPage> => {
        const from = page * pageSize;

        const { data, error } = await supabase.rpc('search_inventory_paginated', {
          p_company_id: companyId,
          p_term: debouncedSearch.trim(),
          p_limit: pageSize,
          p_offset: from,
          p_sort_key: sortKey,
          p_sort_dir: sortDir,
          p_branch_id: branchId || null
        });
        if (error) throw error;

        const products = productService.mapRawProducts(data ?? []);
        const totalCount = (data as any)?.[0]?.total_count ?? 0;
        return { data: products, totalCount, page: page + 1, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
      },
      staleTime: 1000 * 30,
    });
  }, [page, query.data, companyId, pageSize, debouncedSearch, sortKey, sortDir, branchId, queryClient]);

  // ── Real-time invalidation ───────────────────────────────────────────────

  // Semi-persistent channel (singleton per company) to prevent the
  // "cannot add callbacks after subscribe()" race during StrictMode/HMR.
  useEffect(() => {
    if (!companyId) return;

    const channelKey = `products_paginated_rt_${companyId}`;
    const globalAny = window as any;
    if (!globalAny.__ALZ_PAGINATED_CHANNELS__) {
      globalAny.__ALZ_PAGINATED_CHANNELS__ = new Map<string, any>();
    }
    const registry: Map<string, any> = globalAny.__ALZ_PAGINATED_CHANNELS__;

    if (!registry.has(channelKey)) {
      const channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products', filter: `company_id=eq.${companyId}` },
          () => {
            // Invalidate all paginated product queries so all pages refresh
            void queryClient.invalidateQueries({ queryKey: ['products_paginated', companyId] });
          }
        )
        .subscribe();

      registry.set(channelKey, channel);
    }

    return () => { /* no-op: keep channel alive for stability */ };
  }, [companyId, queryClient]);

  // ── Navigation helpers ───────────────────────────────────────────────────

  const goToPage = useCallback((p: number) => setPage(p), []);
  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);

  return {
    // Data
    products: query.data?.data ?? [],
    totalCount: query.data?.totalCount ?? 0,
    totalPages: query.data?.totalPages ?? 1,

    // Pagination state
    page,
    pageSize,

    // Loading states
    isLoading: query.isLoading,
    isFetching: query.isFetching,  // true when background-fetching (next page prefetch etc.)
    isError: query.isError,
    error: query.error,

    // Search
    search,
    handleSearchChange,

    // Navigation
    goToPage,
    nextPage,
    prevPage,
  };
};
