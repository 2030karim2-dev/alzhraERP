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
import type { Product } from '../types';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import { logger } from '../../../core/utils/logger';

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
  isCore?: boolean | undefined;
}

// ── Query key factory ────────────────────────────────────────────────────────

export const productsPageKey = (
  companyId: string,
  page: number,
  pageSize: number,
  search: string,
  sortKey: string,
  sortDir: string,
  branchId?: string | null,
  isCore?: boolean | null
) =>
  [
    'products_paginated',
    companyId,
    page,
    pageSize,
    search,
    sortKey,
    sortDir,
    branchId,
    isCore,
  ] as const;

/** Fallback query directly hitting products table if the search RPC is unavailable or encounters error */
async function fetchProductsFallback(
  companyId: string,
  page: number,
  pageSize: number,
  search: string,
  sortKey: string,
  sortDir: string,
  isCore?: boolean
): Promise<ProductsPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('products')
    .select(
      `
        id,
        company_id,
        name_ar,
        sku,
        part_number,
        brand,
        category_id,
        size,
        description,
        purchase_price,
        sale_price,
        min_stock_level,
        unit,
        image_url,
        is_core,
        alternative_numbers,
        barcode,
        created_at,
        updated_at,
        status,
        category:product_categories(id, name),
        stock:product_stock(
          quantity,
          warehouse_id,
          warehouses(name_ar)
        )
      `,
      { count: 'exact' }
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .or('status.eq.active,status.is.null');

  if (isCore !== undefined) {
    query = query.eq('is_core', isCore);
  }

  const cleanSearch = search.trim();
  if (cleanSearch) {
    query = query.or(
      `name_ar.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%,` +
        `part_number.ilike.%${cleanSearch}%,alternative_numbers.ilike.%${cleanSearch}%,` +
        `barcode.ilike.%${cleanSearch}%,brand.ilike.%${cleanSearch}%`
    );
  }

  const validSortCols: Record<string, string> = {
    name_ar: 'name_ar',
    sku: 'sku',
    part_number: 'part_number',
    brand: 'brand',
    sale_price: 'sale_price',
    purchase_price: 'purchase_price',
    updated_at: 'updated_at',
    created_at: 'created_at',
  };
  const orderCol = validSortCols[sortKey] || 'created_at';
  query = query.order(orderCol, { ascending: sortDir === 'asc' }).range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  const products = productService.mapRawProducts(data ?? []);
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  return { data: products, totalCount, page, pageSize, totalPages };
}

// ── Main hook ────────────────────────────────────────────────────────────────

export const useProductsPaginated = (options: UseProductsPaginatedOptions = {}) => {
  const {
    pageSize = 50,
    initialPage = 1,
    initialSearch = '',
    sortKey = 'updated_at',
    sortDir = 'desc',
    isCore,
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

  const queryKey = productsPageKey(
    companyId,
    page,
    pageSize,
    debouncedSearch,
    sortKey,
    sortDir,
    branchId,
    isCore ?? null
  );

  const query = useQuery<ProductsPage>({
    queryKey,
    queryFn: async (): Promise<ProductsPage> => {
      if (!companyId) return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };

      const from = (page - 1) * pageSize;

      try {
        const { data, error } = await supabase.rpc('search_inventory_paginated', {
          p_company_id: companyId,
          p_term: debouncedSearch.trim(),
          p_limit: pageSize,
          p_offset: from,
          p_sort_key: sortKey,
          p_sort_dir: sortDir,
          ...(branchId ? { p_branch_id: branchId } : {}),
          p_is_core: isCore ?? null,
        });
        if (error) {
          logger.warn('useProductsPaginated', 'RPC search error, using fallback:', error.message);
          return await fetchProductsFallback(
            companyId,
            page,
            pageSize,
            debouncedSearch,
            sortKey,
            sortDir,
            isCore
          );
        }

        const products = productService.mapRawProducts(data ?? []);
        const totalCount = (data as any)?.[0]?.total_count ?? 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Safety fallback: If filtering by isCore=true and RPC returns 0 results,
        // double-check with direct table fallback to ensure favorite products never disappear
        if (isCore === true && products.length === 0 && !debouncedSearch.trim()) {
          const fallbackRes = await fetchProductsFallback(
            companyId,
            page,
            pageSize,
            debouncedSearch,
            sortKey,
            sortDir,
            isCore
          );
          if (fallbackRes.totalCount > 0) {
            return fallbackRes;
          }
        }

        return { data: products, totalCount, page, pageSize, totalPages };
      } catch (err) {
        logger.warn('useProductsPaginated', 'search RPC exception, using fallback:', err);
        return await fetchProductsFallback(
          companyId,
          page,
          pageSize,
          debouncedSearch,
          sortKey,
          sortDir,
          isCore
        );
      }
    },
    enabled: !!companyId,
    staleTime: 1000 * 30, // 30s - products don't change every second
    placeholderData: prev => prev, // Keep previous data while loading new page (no flicker)
  });

  // ── Prefetch next page ───────────────────────────────────────────────────

  useEffect(() => {
    if (!query.data || page >= (query.data.totalPages ?? 1)) return;
    const nextKey = productsPageKey(
      companyId,
      page + 1,
      pageSize,
      debouncedSearch,
      sortKey,
      sortDir,
      branchId,
      isCore ?? null
    );
    void queryClient.prefetchQuery({
      queryKey: nextKey,
      queryFn: async (): Promise<ProductsPage> => {
        const from = page * pageSize;

        try {
          const { data, error } = await supabase.rpc('search_inventory_paginated', {
            p_company_id: companyId,
            p_term: debouncedSearch.trim(),
            p_limit: pageSize,
            p_offset: from,
            p_sort_key: sortKey,
            p_sort_dir: sortDir,
            ...(branchId ? { p_branch_id: branchId } : {}),
            p_is_core: isCore ?? null,
          });
          if (error) {
            return await fetchProductsFallback(
              companyId,
              page + 1,
              pageSize,
              debouncedSearch,
              sortKey,
              sortDir,
              isCore
            );
          }

          const products = productService.mapRawProducts(data ?? []);
          const totalCount = (data as any)?.[0]?.total_count ?? 0;

          if (isCore === true && products.length === 0 && !debouncedSearch.trim()) {
            return await fetchProductsFallback(
              companyId,
              page + 1,
              pageSize,
              debouncedSearch,
              sortKey,
              sortDir,
              isCore
            );
          }

          return {
            data: products,
            totalCount,
            page: page + 1,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize),
          };
        } catch {
          return await fetchProductsFallback(
            companyId,
            page + 1,
            pageSize,
            debouncedSearch,
            sortKey,
            sortDir,
            isCore
          );
        }
      },
      staleTime: 1000 * 30,
    });
  }, [
    page,
    query.data,
    companyId,
    pageSize,
    debouncedSearch,
    sortKey,
    sortDir,
    branchId,
    queryClient,
  ]);

  // ── Real-time invalidation ───────────────────────────────────────────────
  // Handled by the app-wide `useRealtimeSync` global channel: 'products' changes
  // map to the 'inventory' preset, which now includes the 'products_paginated'
  // key prefix (see src/lib/invalidation.ts). A dedicated per-hook channel was
  // redundant and only added WebSocket subscribe churn.

  // ── Navigation helpers ───────────────────────────────────────────────────

  const goToPage = useCallback((p: number) => {
    setPage(p);
  }, []);
  const nextPage = useCallback(() => {
    setPage(p => p + 1);
  }, []);
  const prevPage = useCallback(() => {
    setPage(p => Math.max(1, p - 1));
  }, []);

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
    isFetching: query.isFetching, // true when background-fetching (next page prefetch etc.)
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
