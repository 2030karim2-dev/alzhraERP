import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../api/productsApi';
import { normalizeArabic } from '@/core/utils/search';

interface UseBrandSuggestionsOptions {
  companyId?: string | undefined;
  searchTerm?: string | undefined;
}

export const useBrandSuggestions = ({ companyId, searchTerm = '' }: UseBrandSuggestionsOptions) => {
  const {
    data: allBrands = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['products', 'distinct-brands', companyId],
    queryFn: () => (companyId ? productsApi.fetchDistinctBrands(companyId) : Promise.resolve([])),
    enabled: Boolean(companyId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const filteredBrands = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      return allBrands;
    }

    const normalizedTerm = normalizeArabic(trimmed.toLowerCase());
    return allBrands.filter(b => {
      const normalizedBrand = normalizeArabic(b.toLowerCase());
      return normalizedBrand.includes(normalizedTerm);
    });
  }, [allBrands, searchTerm]);

  return {
    brands: allBrands,
    filteredBrands,
    isLoading,
    refetch,
  };
};
