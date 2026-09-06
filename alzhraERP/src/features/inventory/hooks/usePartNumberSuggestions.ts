import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../api/productsApi';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface UsePartNumberSuggestionsOptions {
  companyId?: string | undefined;
  query?: string | undefined;
  enabled?: boolean | undefined;
}

export const usePartNumberSuggestions = ({
  companyId,
  query = '',
  enabled = true,
}: UsePartNumberSuggestionsOptions) => {
  const debouncedQuery = useDebounce(query.trim(), 300);

  const shouldFetch = Boolean(enabled && companyId && debouncedQuery.length >= 2);

  const {
    data: suggestions = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['products', 'part-number-search', companyId, debouncedQuery],
    queryFn: () =>
      companyId && debouncedQuery
        ? productsApi.searchPartNumbers(companyId, debouncedQuery)
        : Promise.resolve([]),
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });

  return {
    suggestions: shouldFetch ? suggestions : [],
    isSearching: isFetching || (query.trim().length >= 2 && query.trim() !== debouncedQuery),
    isLoading,
  };
};
