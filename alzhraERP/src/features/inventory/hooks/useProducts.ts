import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../service';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { ProductFormData } from '../types';
import { useMemo, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import { syncStore } from '../../../core/lib/sync-store';

// Global registry to prevent duplicate/racing realtime channels
// Follows the same semi-persistent pattern used in useRealtimeSync.ts
const globalAny = window as any;
if (!globalAny.__ALZ_PRODUCT_CHANNELS__) {
    globalAny.__ALZ_PRODUCT_CHANNELS__ = new Map<string, any>();
}
const channelRegistry: Map<string, any> = globalAny.__ALZ_PRODUCT_CHANNELS__;

export const useProducts = (searchTerm: string = '', options: { limitNum?: number, enabled?: boolean } = {}) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const companyId = user?.company_id;

    const query = useQuery({
        queryKey: ['products', companyId, options.limitNum],
        queryFn: () => companyId ? inventoryService.getProducts(companyId, 1, options.limitNum || 10000) : Promise.resolve([]),
        enabled: (options.enabled !== undefined ? options.enabled : true) && !!companyId,
        staleTime: 5 * 60 * 1000, // 5 minutes cache to prevent tab-switching lag
    });

    // Semi-persistent Realtime channel (singleton per company).
    // We intentionally do NOT remove the channel on unmount to avoid the
    // "cannot add postgres_changes callbacks after subscribe()" race condition
    // that occurs during StrictMode double-mount, HMR, or rapid tab switching.
    useEffect(() => {
        if (!companyId) return;

        const channelKey = `products_realtime_${companyId}`;

        // Reuse existing channel if already subscribed
        if (!channelRegistry.has(channelKey)) {
            logger.debug('Products', `Creating realtime channel [${channelKey}]`);
            const channel = supabase
                .channel(channelKey)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'products',
                        filter: `company_id=eq.${companyId}`
                    },
                    (payload: any) => {
                        logger.debug('Products', 'Inventory updated via realtime', JSON.stringify(payload));
                        queryClient.invalidateQueries({ queryKey: ['products', companyId] });
                    }
                )
                .subscribe((status: any) => {
                    if (status === 'SUBSCRIBED') {
                        logger.debug('Products', `Realtime channel [${channelKey}] subscribed`);
                    }
                });

            channelRegistry.set(channelKey, channel);
        }

        // No-op cleanup: keep the channel alive to prevent the subscribe race
        return () => { /* intentional no-op for channel stability */ };
    }, [companyId, queryClient]);

    const filteredProducts = useMemo(() => {
        const products = query.data || [];
        if (!searchTerm) return products;

        // Normalize Arabic characters for more flexible matching
        const normalizeArabic = (text: string) => {
            return text
                .replace(/[أإآ]/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/ى/g, 'ي')
                .replace(/[\u064B-\u065F]/g, ''); // Remove Harakat
        };

        const searchTokens = searchTerm.toLowerCase().split(/\s+/).filter(Boolean).map(normalizeArabic);

        return products.filter(p => {
            const searchableText = normalizeArabic([
                p.name,
                p.name_ar,
                p.sku,
                p.brand,
                p.part_number,
                p.alternative_numbers,
                p.size,
                p.specifications
            ].filter(Boolean).join(' ').toLowerCase());

            return searchTokens.every(token => searchableText.includes(token));
        });
    }, [query.data, searchTerm]);

    const stats = useMemo(() => ({
        count: filteredProducts.length,
        totalValue: filteredProducts.reduce((acc, p) => acc + (p.cost_price * p.stock_quantity), 0),
        lowStockCount: filteredProducts.filter(p => p.stock_quantity <= p.min_stock_level).length
    }), [filteredProducts]);

    const slicedProducts = useMemo(() => {
        return filteredProducts.slice(0, options.limitNum || 100);
    }, [filteredProducts, options.limitNum]);

    return { ...query, products: slicedProducts, stats };
};

export const useMinimalProducts = () => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['products_minimal', user?.company_id],
        queryFn: () => user?.company_id ? inventoryService.getMinimalProducts(user.company_id) : Promise.resolve([]),
        enabled: !!user?.company_id,
        staleTime: 5 * 60 * 1000,
    });
};

export const useItemMovement = (productId: string | null) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['item_movement', productId, user?.company_id],
        queryFn: () => (productId && user?.company_id) ? inventoryService.getItemMovement(productId, user.company_id) : Promise.resolve([]),
        enabled: !!productId && !!user?.company_id,
        staleTime: 60 * 1000,
    });
};

export const useProductMutations = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();
    // const { enqueue } = useOfflineQueueStore(); // LEGACY - REMOVING

    const saveProduct = useMutation({
        mutationFn: async ({ data, id }: { data: ProductFormData, id?: string }) => {
            if (!user?.company_id || !user.id) throw new Error("جلسة العمل منتهية");
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
                queryClient.setQueryData(['products', user?.company_id], (old: any[]) =>
                    old?.map(p => p.id === id ? { ...p, ...data } : p) ?? []
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
                const originalProduct = (context?.previousProducts as any[])?.find(p => p.id === variables.id);

                syncStore.enqueue({
                    mutationKey: ['products', 'save'], // Key for identification
                    variables: { ...variables.data, id: variables.id, company_id: user?.company_id, user_id: user?.id },
                    metadata: {
                        last_updated_at: originalProduct?.updated_at
                    }
                });
                showToast("تم الحفظ محلياً (وضع عدم الاتصال). سيتم المزامنة تلقائياً عند عودة الإنترنت.", 'info');
                return;
            }

            showToast("فشل الحفظ: " + error.message, 'error');
        },
        onSuccess: () => {
            showToast("تم حفظ بيانات المنتج بنجاح", 'success');
        },
        onSettled: () => {
            // Always refetch after mutation to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });

    const deleteProduct = useMutation({
        // Fix: Call deleteProduct which will be added to inventoryService
        mutationFn: (id: string) => inventoryService.deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            showToast("تم حذف المنتج من المستودع", 'info');
        }
    });

    const bulkDeleteProducts = useMutation({
        mutationFn: (ids: string[]) => inventoryService.bulkDeleteProducts(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            showToast("تم حذف المنتجات المحددة بنجاح", 'info');
        }
    });

    return {
        // Fix: Changed to `mutateAsync` to allow chaining callbacks for component-specific logic like closing a modal.
        saveProduct: saveProduct.mutateAsync,
        deleteProduct: deleteProduct.mutate,
        bulkDeleteProducts: bulkDeleteProducts.mutateAsync,
        isSaving: saveProduct.isPending,
        isDeleting: deleteProduct.isPending || bulkDeleteProducts.isPending
    };
};

export const useSearchProducts = (searchTerm: string) => {
    const { user } = useAuthStore();
    const companyId = user?.company_id;

    return useQuery({
        queryKey: ['products_search', companyId, searchTerm],
        queryFn: () => (companyId && searchTerm.length > 1)
            ? inventoryService.searchProducts(companyId, searchTerm)
            : Promise.resolve([]),
        enabled: !!companyId && searchTerm.length > 1,
        staleTime: 5 * 60 * 1000,
    });
};