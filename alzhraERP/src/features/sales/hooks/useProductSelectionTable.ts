import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';
import { productService } from '../../inventory/service';
import type { Product } from '../../inventory/types';
import { useFeedbackStore } from '../../feedback/store';
import { logger } from '../../../core/utils/logger';

/**
 * useProductSelectionTable
 * ----------------------------------------
 * Encapsulates the product-table data logic of ProductSelectionModal:
 * server-side normalized search across full catalog, warehouse-aware stock checks,
 * in-stock filter, column sorting, client pagination, and keyboard navigation.
 */
interface UseProductSelectionTableOptions {
  isOpen: boolean;
  initialQuery: string;
  effectiveBranchId: string | null;
  mode?: 'sale' | 'purchase' | 'quotation';
  onSelect: (product: Product) => void;
}

export function useProductSelectionTable({
  isOpen,
  initialQuery,
  effectiveBranchId,
  mode = 'sale',
  onSelect,
}: UseProductSelectionTableOptions) {
  const { showToast } = useFeedbackStore();
  const { user } = useAuthStore();
  const companyId = user?.company_id ?? '';

  // Query / filter state
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [showInStockOnly, setShowInStockOnly] = useState(false);

  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Column sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null
  );

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  // Map sort config to SQL sort keys
  const sqlSortKey = useMemo(() => {
    if (!sortConfig) return 'updated_at';
    switch (sortConfig.key) {
      case 'name':
        return 'name_ar';
      case 'part_number':
      case 'sku':
        return 'sku';
      default:
        return 'updated_at';
    }
  }, [sortConfig]);

  const sqlSortDir = sortConfig?.direction || 'desc';

  // Server-side search & fetch via high-performance RPC
  const { data: rawProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: [
      'product_selection_table',
      companyId,
      submittedQuery.trim(),
      effectiveBranchId,
      sqlSortKey,
      sqlSortDir,
    ],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        const { data, error } = await supabase.rpc('search_inventory_paginated', {
          p_company_id: companyId,
          p_term: submittedQuery.trim(),
          p_limit: 1000,
          p_offset: 0,
          p_sort_key: sqlSortKey,
          p_sort_dir: sqlSortDir,
          ...(effectiveBranchId ? { p_branch_id: effectiveBranchId } : {}),
        });

        if (error) {
          logger.warn('useProductSelectionTable', 'RPC search error, falling back:', error.message);
          return await productService.getProducts(companyId, 1, 500);
        }

        return productService.mapRawProducts(data ?? []);
      } catch (err) {
        logger.error('useProductSelectionTable', 'Failed to fetch products:', err);
        return [];
      }
    },
    enabled: isOpen && !!companyId,
    staleTime: 1000 * 15,
  });

  // In-stock filter
  const filteredProducts = useMemo(() => {
    if (!showInStockOnly) return rawProducts;
    return rawProducts.filter(p => (p.stock_quantity ?? 0) > 0);
  }, [rawProducts, showInStockOnly]);

  // Client-side Sort products for fields not handled directly by SQL RPC (e.g. stock, price, brand)
  const products = useMemo(() => {
    if (!sortConfig) return filteredProducts;
    const { key, direction } = sortConfig;

    return [...filteredProducts].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (key) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'part_number':
          aVal = a.part_number || '';
          bVal = b.part_number || '';
          break;
        case 'brand':
          aVal = a.brand || '';
          bVal = b.brand || '';
          break;
        case 'stock':
          aVal = a.stock_quantity ?? 0;
          bVal = b.stock_quantity ?? 0;
          break;
        case 'price':
          aVal = mode === 'purchase' ? a.cost_price || 0 : ((a.selling_price || a.sale_price) ?? 0);
          bVal = mode === 'purchase' ? b.cost_price || 0 : ((b.selling_price || b.sale_price) ?? 0);
          break;
        case 'size':
          aVal = a.size || '';
          bVal = b.size || '';
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return direction === 'asc' ? -1 : 1;
      if (strA > strB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortConfig, mode]);

  // Handle column header click for sorting
  const handleSort = (colId: string) => {
    if (colId === 'index' || colId === 'actions' || colId === 'branch' || colId === 'specs') return;
    setSortConfig(prev => {
      if (prev?.key === colId) {
        return { key: colId, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: colId, direction: 'asc' };
    });
  };

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const safePage = Math.min(page, totalPages);

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setPage(1);
  }, [submittedQuery, showInStockOnly, sortConfig, effectiveBranchId]);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, safePage, pageSize]);

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, newPage)));
    setFocusedIndex(-1);
  };

  // Reset local query when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalQuery(initialQuery);
      setSubmittedQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Live debounced search: updates submittedQuery automatically when user types
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setSubmittedQuery(localQuery);
    }, 150);
    return () => {
      clearTimeout(timer);
    };
  }, [localQuery, isOpen]);

  // Submit query on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setSubmittedQuery(localQuery);
    }
  };

  // Track double-click state
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCountRef = useRef<Record<string, number>>({});

  const handleRowClick = (p: Product) => {
    const id = p.id;
    clickCountRef.current[id] = (clickCountRef.current[id] ?? 0) + 1;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current[id] = 0;
    }, 300);

    if (clickCountRef.current[id] >= 2) {
      clickCountRef.current[id] = 0;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

      // التحقق من توفر المخزون فقط في وضع البيع الفعلي (وليس عروض الأسعار أو المشتريات)
      if (mode === 'sale') {
        const effectiveQty = p.stock_quantity ?? 0;
        if (effectiveQty <= 0) {
          showToast(`تنبيه: المنتج "${p.name}" رصيده 0 في هذا الفرع`, 'warning');
        }
      }

      onSelect(p);
    }
  };

  // Keyboard navigation: Arrow Up/Down + Enter for selection
  const handleTableKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const max = paginatedProducts.length - 1;
          if (max < 0) return -1;
          if (prev < 0) return 0;
          const next = e.key === 'ArrowDown' ? prev + 1 : prev - 1;
          return Math.max(0, Math.min(max, next));
        });
      } else if (
        e.key === 'Enter' &&
        focusedIndex >= 0 &&
        focusedIndex < paginatedProducts.length
      ) {
        e.preventDefault();
        const product = paginatedProducts[focusedIndex];
        if (product) {
          if (mode === 'sale') {
            const effectiveQty = product.stock_quantity ?? 0;
            if (effectiveQty <= 0) {
              showToast(`تنبيه: المنتج "${product.name}" رصيده 0 في هذا الفرع`, 'warning');
            }
          }
          onSelect(product);
        }
      }
    },
    [paginatedProducts, focusedIndex, mode, showToast, onSelect]
  );

  // Scroll focused row into view when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && tableBodyRef.current) {
      const row = tableBodyRef.current.children[focusedIndex] as HTMLElement | undefined;
      row?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Reset keyboard focus when products change or modal opens/closes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [products, isOpen]);

  return {
    localQuery,
    setLocalQuery,
    submittedQuery,
    setSubmittedQuery,
    showInStockOnly,
    setShowInStockOnly,
    products,
    isLoading,
    sortConfig,
    handleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    safePage,
    paginatedProducts,
    handlePageChange,
    focusedIndex,
    setFocusedIndex,
    tableBodyRef,
    handleKeyDown,
    handleTableKeyDown,
    handleRowClick,
  };
}
