import { useMutation, useQuery } from '@tanstack/react-query';
import { aiPartLookupApi, AIPartLookupResult } from '../api/aiPartLookupApi';
import { useFeedbackStore } from '../../feedback/store';

/**
 * Hook for AI-powered part number lookup.
 * Uses the ai-part-lookup Edge Function to scrape real auto parts websites.
 */
export const useAIPartLookup = (partNumber?: string | null) => {
    const { showToast } = useFeedbackStore();

    // Check cache first (passive query)
    const cachedQuery = useQuery({
        queryKey: ['ai_part_lookup_cache', partNumber],
        queryFn: () => partNumber ? aiPartLookupApi.getCachedResults(partNumber) : Promise.resolve(null),
        enabled: !!partNumber && partNumber.length >= 3,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    // Active search mutation (triggered by user)
    const searchMutation = useMutation({
        mutationFn: ({ partNumber, brand }: { partNumber: string; brand?: string | null | undefined }) =>
            aiPartLookupApi.lookupPartNumber(partNumber, brand),
        onSuccess: (data) => {
            const count = data.alternatives?.length || 0;
            if (count > 0) {
                showToast(`تم العثور على ${count} رقم بديل من ${data.source_sites.join(', ')}`, 'success');
            } else {
                showToast('لم يتم العثور على أرقام بديلة لهذا المنتج', 'info');
            }
        },
        onError: (err: Error) => {
            showToast(err.message || 'فشل البحث الذكي', 'error');
        },
    });

    return {
        // Cached data (auto-loaded)
        cachedResult: cachedQuery.data as AIPartLookupResult | null,
        isCacheLoading: cachedQuery.isLoading,

        // Active search (user-triggered)
        search: searchMutation.mutateAsync,
        searchResult: searchMutation.data as AIPartLookupResult | undefined,
        isSearching: searchMutation.isPending,
        searchError: searchMutation.error,
    };
};
