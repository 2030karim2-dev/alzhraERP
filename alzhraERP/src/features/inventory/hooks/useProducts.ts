import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { inventoryService } from '../service';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import type { ProductFormData, Product } from '../types';
import { useMemo } from 'react';
import { syncStore } from '../../../core/lib/sync-store';
import { invalidateByPreset } from '../../../lib/invalidation';
import { normalizeSearch } from '../../../core/utils/search';

/** True when the failure is a network/offline issue worth queuing for later sync. */
const isOfflineError = (error: Error): boolean =>
  !navigator.onLine || error.message.includes('Failed to fetch');

/** Paginated products cache shape used by the paginated product list queries. */
interface PaginatedProducts {
  data?: Product[];
}

interface ProductsQueryResult {
  products: Product[];
  stats: { count: number; totalValue: number; lowStockCount: number };
  data: Product[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Filter + stats computation for the products list. */
const useFilteredProducts = (
  data: Product[] | undefined,
  searchTerm: string,
  limitNum?: number
): { products: Product[]; stats: { count: number; totalValue: number; lowStockCount: number } } => {
  const filteredProducts = useMemo(() => {
    const products = data ?? [];
    if (searchTerm.trim() === '') return products;

    const searchTokens = normalizeSearch(searchTerm).split(/\s+/).filter(Boolean);

    return products.filter(p => {
      const searchableText = normalizeSearch(
        [
          p.name,
          p.name_ar,
          p.sku,
          p.brand,
          p.part_number,
          p.barcode,
          p.alternative_numbers,
          p.size,
          p.specifications,
        ]
          .filter(Boolean)
          .join(' ')
      );

      return searchTokens.every(token => searchableText.includes(token));
    });
  }, [data, searchTerm]);

  const stats = useMemo(
    () => ({
      count: filteredProducts.length,
      totalValue: filteredProducts.reduce((acc, p) => acc + p.cost_price * p.stock_quantity, 0),
      lowStockCount: filteredProducts.filter(p => p.stock_quantity <= p.min_stock_level).length,
    }),
    [filteredProducts]
  );

  const slicedProducts = useMemo(() => {
    return filteredProducts.slice(0, limitNum ?? 100);
  }, [filteredProducts, limitNum]);

  return { products: slicedProducts, stats };
};

export const useProducts = (
  searchTerm = '',
  options: { limitNum?: number; enabled?: boolean; warehouseId?: string } = {}
): ProductsQueryResult => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  const query = useQuery({
    queryKey: ['products', companyId, options.limitNum, options.warehouseId],
    // The signal lets TanStack Query cancel this heavy (up to 10000-row)
    // fetch at the network layer when it is superseded or unmounted.
    queryFn: ({ signal }) =>
      companyId !== undefined && companyId !== ''
        ? inventoryService.getProducts(
            companyId,
            1,
            options.limitNum ?? 500,
            options.warehouseId,
            signal
          )
        : Promise.resolve([]),
    enabled: options.enabled ?? (companyId !== undefined && companyId !== ''),
  });

  // NOTE: live updates for `products` are handled by the app-wide
  // `useRealtimeSync` global channel (TABLE_PRESET_MAP['products'] → the
  // 'inventory' preset → invalidates ['products', ...]). A dedicated per-hook
  // channel was redundant and only added extra WebSocket subscribe churn on
  // an already-flaky connection.

  const { products, stats } = useFilteredProducts(query.data, searchTerm, options.limitNum);

  return {
    products,
    stats,
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
};

export const useMinimalProducts = (): UseQueryResult<Product[]> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MinimalProduct subset is assignable at runtime; full Product type expected by consumers
  return useQuery({
    queryKey: ['products_minimal', companyId],
    queryFn: () =>
      companyId !== undefined && companyId !== ''
        ? inventoryService.getMinimalProducts(companyId)
        : Promise.resolve([]),
    enabled: companyId !== undefined && companyId !== '',
    staleTime: 5 * 60 * 1000,
  }) as unknown as UseQueryResult<Product[]>;
};

export const useItemMovement = (productId: string | null): UseQueryResult<unknown[]> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  return useQuery({
    queryKey: ['item_movement', productId, companyId],
    queryFn: () =>
      productId !== null && productId !== '' && companyId !== undefined && companyId !== ''
        ? inventoryService.getItemMovement(productId, companyId)
        : Promise.resolve([]),
    enabled: productId !== null && productId !== '' && companyId !== undefined && companyId !== '',
    staleTime: 60 * 1000,
  });
};

interface ProductMutations {
  saveProduct: (vars: { data: ProductFormData; id?: string }) => Promise<unknown>;
  deleteProduct: (id: string) => Promise<unknown>;
  bulkDeleteProducts: (ids: string[]) => Promise<unknown>;
  toggleCoreProduct: (vars: { id: string; isCore: boolean }) => Promise<unknown>;
  isSaving: boolean;
  isDeleting: boolean;
}

// eslint-disable-next-line max-lines-per-function -- mutation hub composing 4 product mutations (save/delete/bulkDelete/toggleCore); splitting fragments a cohesive offline-sync contract.
export const useProductMutations = (): ProductMutations => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const saveProduct = useMutation({
    mutationFn: async ({ data, id }: { data: ProductFormData; id?: string }) => {
      if (user?.company_id === undefined || user.company_id === '' || user.id === '')
        throw new Error('جلسة العمل منتهية');
      if (id !== undefined && id !== '') {
        return inventoryService.updateProduct(id, data, user.company_id);
      }
      return inventoryService.createProduct(data, user.company_id, user.id);
    },
    // Optimistic Update: show changes instantly before server confirms
    onMutate: async ({ data, id }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['products'] });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData<Product[]>(['products', user?.company_id]);

      // Optimistically update the cache
      if (id !== undefined && previousProducts !== undefined) {
        queryClient.setQueryData<Product[]>(
          ['products', user?.company_id],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- spread of ProductFormData is a valid partial Product at runtime
          (old = []) => old.map(p => (p.id === id ? ({ ...p, ...data } as unknown as Product) : p))
        );
      }

      return { previousProducts };
    },
    onError: (error: Error, variables, context) => {
      // Rollback to snapshot on failure
      if (context?.previousProducts !== undefined) {
        queryClient.setQueryData(['products', user?.company_id], context.previousProducts);
      }

      if (!isOfflineError(error)) {
        showToast('فشل الحفظ: ' + error.message, 'error');
        return;
      }

      // Network error: enqueue for offline processing via the global syncStore
      const originalProduct = context?.previousProducts?.find(
        (p: Product) => p.id === variables.id
      );

      void syncStore.enqueue({
        mutationKey: ['products', 'save'], // Key for identification
        variables: {
          ...variables.data,
          id: variables.id,
          company_id: user?.company_id,
          user_id: user?.id,
        },
        metadata: {
          ...(originalProduct?.updated_at !== undefined
            ? { last_updated_at: originalProduct.updated_at }
            : {}),
        },
      });
      showToast(
        'تم الحفظ محلياً (وضع عدم الاتصال). سيتم المزامنة تلقائياً عند عودة الإنترنت.',
        'info'
      );
    },
    onSuccess: () => {
      showToast('تم حفظ بيانات المنتج بنجاح', 'success');
      invalidateByPreset(queryClient, 'inventory');
    },
    onSettled: () => {
      // Always refetch after mutation to ensure consistency across all views
      invalidateByPreset(queryClient, 'inventory');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['products_paginated'] });
      void queryClient.invalidateQueries({ queryKey: ['item_movement'] });
    },
  });

  const deleteProduct = useMutation({
    // Fix: Call deleteProduct which will be added to inventoryService
    mutationFn: (id: string) => inventoryService.deleteProduct(id),
    onSuccess: () => {
      invalidateByPreset(queryClient, 'inventory');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['products_paginated'] });
      showToast('تم حذف المنتج من المستودع', 'info');
    },
  });

  const bulkDeleteProducts = useMutation({
    mutationFn: (ids: string[]) => inventoryService.bulkDeleteProducts(ids),
    onSuccess: () => {
      invalidateByPreset(queryClient, 'inventory');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['products_paginated'] });
      showToast('تم حذف المنتجات المحددة بنجاح', 'info');
    },
  });

  const toggleCoreProduct = useMutation({
    mutationFn: async ({ id, isCore }: { id: string; isCore: boolean }) => {
      return inventoryService.toggleCoreProduct(id, isCore);
    },
    onMutate: async ({ id, isCore }) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['products_paginated'] });

      // Optimistically update paginated queries data
      queryClient.setQueriesData<PaginatedProducts>({ queryKey: ['products_paginated'] }, old => {
        if (old === undefined || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((p: Product) => (p.id === id ? { ...p, is_core: isCore } : p)),
        };
      });

      // Optimistically update full list query data
      queryClient.setQueriesData<Product[]>({ queryKey: ['products'] }, old => {
        if (!Array.isArray(old)) return old;
        return old.map((p: Product) => (p.id === id ? { ...p, is_core: isCore } : p));
      });
    },
    onSuccess: (_, { isCore }) => {
      invalidateByPreset(queryClient, 'inventory');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['products_paginated'] });
      void queryClient.invalidateQueries({ queryKey: ['core_products_stats'] });
      showToast(
        isCore
          ? 'تمت إضافة الصنف إلى المنتجات الاستراتيجية ⭐'
          : 'تمت إزالة الصنف من المنتجات الاستراتيجية',
        'success'
      );
    },
    onError: (err: Error) => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['products_paginated'] });
      showToast(err.message !== '' ? err.message : 'تعذر تحديث حالة الصنف الاستراتيجي', 'error');
    },
  });

  return {
    // Fix: Changed to `mutateAsync` to allow chaining callbacks for component-specific logic like closing a modal.
    saveProduct: saveProduct.mutateAsync,
    deleteProduct: deleteProduct.mutateAsync,
    bulkDeleteProducts: bulkDeleteProducts.mutateAsync,
    toggleCoreProduct: toggleCoreProduct.mutateAsync,
    isSaving: saveProduct.isPending,
    isDeleting: deleteProduct.isPending || bulkDeleteProducts.isPending,
  };
};

export const useSearchProducts = (searchTerm: string): UseQueryResult<Product[]> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SearchResultProduct is a runtime subset of Product; full Product type expected by consumers
  return useQuery({
    queryKey: ['products_search', companyId, searchTerm],
    queryFn: () =>
      companyId !== undefined && companyId !== '' && searchTerm.length > 1
        ? inventoryService.searchProducts(companyId, searchTerm)
        : Promise.resolve([]),
    enabled: companyId !== undefined && companyId !== '' && searchTerm.length > 1,
    staleTime: 5 * 60 * 1000,
  }) as unknown as UseQueryResult<Product[]>;
};

/**
 * High-performance hook for dashboard widgets (Low Stock alerts & Transfer suggestions).
 * Fetches only products with active stock or core items (~1,000 rows in ~15ms)
 * instead of the full 10,000+ catalog.
 */
export const useStockedProducts = (): UseQueryResult<Product[]> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: ['stocked_products', companyId],
    queryFn: ({ signal }) =>
      companyId !== undefined && companyId !== ''
        ? inventoryService.getProductsWithStock(companyId, signal)
        : Promise.resolve([]),
    enabled: companyId !== undefined && companyId !== '',
    staleTime: 60 * 1000,
  });
};
