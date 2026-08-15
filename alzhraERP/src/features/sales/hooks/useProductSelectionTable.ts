import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useProducts } from '../../inventory/hooks/index';
import type { Product } from '../../inventory/types';
import { useFeedbackStore } from '../../feedback/store';

/**
 * useProductSelectionTable
 * ----------------------------------------
 * Encapsulates the product-table data logic of ProductSelectionModal:
 * query state, in-stock filter, column sorting, pagination, keyboard
 * navigation and double-click selection (with warehouse-aware stock checks).
 *
 * Extracted so the modal component stays focused on UI/rendering.
 */
interface UseProductSelectionTableOptions {
  isOpen: boolean;
  initialQuery: string;
  effectiveBranchId: string | null;
  onSelect: (product: Product) => void;
}

export function useProductSelectionTable({
  isOpen,
  initialQuery,
  effectiveBranchId,
  onSelect,
}: UseProductSelectionTableOptions) {
  const { showToast } = useFeedbackStore();

  // Query / filter state
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [showInStockOnly, setShowInStockOnly] = useState(false);

  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Column sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Client-side pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  const { products: allProducts, isLoading } = useProducts(
    submittedQuery,
    { limitNum: 5000, ...(effectiveBranchId ? { warehouseId: effectiveBranchId } : {}) }
  );

  // Filter products
  const filteredProducts = allProducts.filter(p => {
    if (showInStockOnly && p.stock_quantity <= 0) return false;
    return true;
  });

  // Sort products based on sortConfig
  const products = useMemo(() => {
    if (!sortConfig) return filteredProducts;
    const { key, direction } = sortConfig;
    const sorted = [...filteredProducts].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      // Map column key to product field
      switch (key) {
        case 'name': aVal = a.name || ''; bVal = b.name || ''; break;
        case 'part_number': aVal = a.part_number || ''; bVal = b.part_number || ''; break;
        case 'brand': aVal = a.brand || ''; bVal = b.brand || ''; break;
        case 'stock': {
          const aQty = a.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId)?.quantity ?? a.stock_quantity;
          const bQty = b.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId)?.quantity ?? b.stock_quantity;
          aVal = aQty; bVal = bQty; break;
        }
        case 'price': aVal = (a.selling_price || a.sale_price) ?? 0; bVal = (b.selling_price || b.sale_price) ?? 0; break;
        case 'size': aVal = a.size || ''; bVal = b.size || ''; break;
        default: return 0;
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
    return sorted;
  }, [filteredProducts, sortConfig, effectiveBranchId]);

  // Handle column header click for sorting
  const handleSort = (colId: string) => {
    // Don't sort index or actions columns
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
    setFocusedIndex(-1); // Reset keyboard focus
  };

  // Reset local query when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalQuery(initialQuery);
      setSubmittedQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

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

      // [FIX #5] التحقق من توفر المخزون قبل الإضافة
      const branchQty = p.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId)?.quantity;
      const effectiveQty = branchQty ?? p.stock_quantity;
      if (effectiveQty <= 0) {
        showToast(`المنتج "${p.name}" غير متوفر في المخزون حالياً`, 'warning');
        return;
      }

      onSelect(p);
    }
  };

  // Keyboard navigation: Arrow Up/Down + Enter for selection
  const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const max = paginatedProducts.length - 1;
        if (max < 0) return -1;
        if (prev < 0) return 0;
        const next = e.key === 'ArrowDown' ? prev + 1 : prev - 1;
        return Math.max(0, Math.min(max, next));
      });
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < paginatedProducts.length) {
      e.preventDefault();
      const product = paginatedProducts[focusedIndex];
      if (product) {
        const branchQty = product.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId)?.quantity;
        const effectiveQty = branchQty ?? product.stock_quantity;
        if (effectiveQty <= 0) {
          showToast(`المنتج "${product.name}" غير متوفر في المخزون حالياً`, 'warning');
          return;
        }
        onSelect(product);
      }
    }
  }, [paginatedProducts, focusedIndex, effectiveBranchId, showToast, onSelect]);

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
