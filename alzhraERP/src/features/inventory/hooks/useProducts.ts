/* eslint-disable */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../service';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { ProductFormData } from '../types';
import { useMemo } from 'react';
import { syncStore } from '../../../core/lib/sync-store';
import { invalidateByPreset } from '../../../lib/invalidation';
import { normalizeSearch } from '../../../core/utils/search';

export const useProducts = (
  searchTerm: string = '',
  options: { limitNum?: number; enabled?: boolean; warehouseId?: string } = {}
) => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  const query = useQuery({
    queryKey: ['products', companyId, options.limitNum, options.warehouseId],
    // The signal lets TanStack Query cancel this heavy (up to 10000-row)
    // fetch at the network layer when it is superseded or unmounted.
    queryFn: ({ signal }) =>
      companyId
        ? inventoryService.getProducts(
            companyId,
            1,
            options.limitNum || 10000,
            options.warehouseId,
            signal
          )
        : Promise.resolve([]),
    enabled: options.enabled !== undefined ? options.enabled : !!companyId,
  });

  // NOTE: live updates for `products` are handled by the app-wide
  // `useRealtimeSync` global channel (TABLE_PRESET_MAP['products'] → the
  // 'inventory' preset → invalidates ['products', ...]). A dedicated per-hook
  // channel was redundant and only added extra WebSocket subscribe churn on
  // an already-flaky connection.

  const filteredProducts = useMemo(() => {
    const products = query.data || [];
    if (!searchTerm.trim()) return products;

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
  }, [query.data, searchTerm]);

  const stats = useMemo(
    () => ({
      count: filteredProducts.length,
      totalValue: filteredProducts.reduce((acc, p) => acc + p.cost_price * p.stock_quantity, 0),
      lowStockCount: filteredProducts.filter(p => p.stock_quantity <= p.min_stock_level).length,
    }),
    [filteredProducts]
  );

  const slicedProducts = useMemo(() => {
    return filteredProducts.slice(0, options.limitNum || 100);
  }, [filteredProducts, options.limitNum]);

  return { ...query, products: slicedProducts, stats };
};

export const useMinimalProducts = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['products_minimal', user?.company_id],
    queryFn: () =>
      user?.company_id ? inventoryService.getMinimalProducts(user.company_id) : Promise.resolve([]),
    enabled: !!user?.company_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useItemMovement = (productId: string | null) => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['item_movement', productId, user?.company_id],
    queryFn: () =>
      productId && user?.company_id
        ? inventoryService.getItemMovement(productId, user.company_id)
        : Promise.resolve([]),
    enabled: !!productId && !!user?.company_id,
    staleTime: 60 * 1000,
  });
};

export const useProductMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const saveProduct = useMutation({
    mutationFn: async ({ data, id }: { data: ProductFormData; id?: string }) => {
      if (!user?.company_id || !user.id) throw new Error('جلسة العمل منتهية');
      if (id) {
        return inventoryService.updateProduct(id, data, user.company_id);
      }
      return inventoryService.createProduct(data, user.company_id, user.id);
    },
    // Optimistic Update: show changes instantly before server confirms
    onMutate: async ({ data, id }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['products'] });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData(['products', user?.company_id]);

      // Optimistically update the cache
      if (id && previousProducts) {
        queryClient.setQueryData(
          ['products', user?.company_id],
          (old: any[]) => old?.map(p => (p.id === id ? { ...p, ...data } : p)) ?? []
        );
      }

      return { previousProducts };
    },
    onError: (error: any, variables, context) => {
      // Rollback to snapshot on failure
      if (context?.previousProducts) {
        queryClient.setQueryData(['products', user?.company_id], context.previousProducts);
      }

      // If it's a network error, enqueue for offline processing via new global syncStore
      if (!navigator.onLine || error.message?.includes('Failed to fetch') || error.status === 0) {
        const originalProduct = (context?.previousProducts as any[])?.find(
          p => p.id === variables.id
        );

        syncStore.enqueue({
          mutationKey: ['products', 'save'], // Key for identification
          variables: {
            ...variables.data,
            id: variables.id,
            company_id: user?.company_id,
            user_id: user?.id,
          },
          metadata: {
            last_updated_at: originalProduct?.updated_at,
          },
        });
        showToast(
          'تم الحفظ محلياً (وضع عدم الاتصال). سيتم المزامنة تلقائياً عند عودة الإنترنت.',
          'info'
        );
        return;
      }

      showToast('فشل الحفظ: ' + error.message, 'error');
    },
    onSuccess: () => {
      showToast('تم حفظ بيانات المنتج بنجاح', 'success');
      invalidateByPreset(queryClient, 'inventory');
    },
    onSettled: () => {
      // Always refetch after mutation to ensure consistency across all views
      invalidateByPreset(queryClient, 'inventory');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['item_movement'] });
    },
  });

  const deleteProduct = useMutation({
    // Fix: Call deleteProduct which will be added to inventoryService
    mutationFn: (id: string) => inventoryService.deleteProduct(id),
    onSuccess: () => {
      invalidateByPreset(queryClient, 'inventory');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products_paginated'] });
      showToast('تم حذف المنتج من المستودع', 'info');
    },
  });

  const bulkDeleteProducts = useMutation({
    mutationFn: (ids: string[]) => inventoryService.bulkDeleteProducts(ids),
    onSuccess: () => {
      invalidateByPreset(queryClient, 'inventory');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products_paginated'] });
      showToast('تم حذف المنتجات المحددة بنجاح', 'info');
    },
  });

  return {
    // Fix: Changed to `mutateAsync` to allow chaining callbacks for component-specific logic like closing a modal.
    saveProduct: saveProduct.mutateAsync,
    deleteProduct: deleteProduct.mutateAsync,
    bulkDeleteProducts: bulkDeleteProducts.mutateAsync,
    isSaving: saveProduct.isPending,
    isDeleting: deleteProduct.isPending || bulkDeleteProducts.isPending,
  };
};

export const useSearchProducts = (searchTerm: string) => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: ['products_search', companyId, searchTerm],
    queryFn: () =>
      companyId && searchTerm.length > 1
        ? inventoryService.searchProducts(companyId, searchTerm)
        : Promise.resolve([]),
    enabled: !!companyId && searchTerm.length > 1,
    staleTime: 5 * 60 * 1000,
  });
};
