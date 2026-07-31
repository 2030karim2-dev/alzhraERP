// ============================================
// Product Search Hook
// Hook for searching products
// ============================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../inventory/api';

interface UseProductSearchOptions {
    companyId: string;
    debounceMs?: number;
    enabled?: boolean;
}

export interface ProductSearchResult {
    id: string;
    name_ar: string;
    sku: string;
    sale_price: number;
    purchase_price: number;
    quantity: number;
    category?: string;
    alternative_numbers?: string;
    is_core?: boolean;
}

export const useProductSearch = (searchTerm: string, options?: UseProductSearchOptions) => {
    const { companyId, debounceMs = 300, enabled = true } = options ?? {};

    const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

    // Debounce the search term using useEffect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [searchTerm, debounceMs]);

    // Normalize the term for consistent caching (strip extra spaces)
    const normalizedTerm = useMemo(() => 
        debouncedTerm.replace(/\s+/g, ' ').trim(), 
        [debouncedTerm]
    );

    const queryKey = useMemo(() =>
        ['product_search', companyId, normalizedTerm] as const,
        [companyId, normalizedTerm]
    );

    const {
        data: products = [],
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!companyId || !normalizedTerm || normalizedTerm.length < 2) {
                return [];
            }

            const { data, error } = await inventoryApi.searchProduct(companyId, normalizedTerm);

            if (data === null) return [];
            
            if (error !== null) {
                throw new Error(error.message || 'Failed to search products');
            }

            // Map results to sum quantities from the nested stock array
            return data.map((item: Record<string, unknown>) => {
                const stockArray = Array.isArray(item.quantity) ? item.quantity : [];
                const totalQty = (stockArray as { quantity: string | number }[]).reduce(
                    (sum: number, s: { quantity: string | number }) => sum + (Number(s.quantity) || 0), 
                    0
                );
                
                return {
                    id: String(item.id || ''),
                    name_ar: String(item.name_ar || ''),
                    sku: String(item.sku || ''),
                    sale_price: Number(item.sale_price || 0),
                    purchase_price: Number(item.purchase_price || 0),
                    quantity: totalQty,
                    alternative_numbers: item.alternative_numbers ? String(item.alternative_numbers) : undefined,
                    is_core: Boolean(item.is_core)
                } as ProductSearchResult;
            });
        },
        enabled: enabled && !!companyId && normalizedTerm.length >= 2,
    });

    const search = useCallback((term: string) => {
        setDebouncedTerm(term);
    }, []);

    return {
        products,
        isLoading,
        isError,
        error,
        search,
        hasResults: products.length > 0,
        resultsCount: products.length,
    };
};

export default useProductSearch;
