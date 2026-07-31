// Backward-compatible wrapper after hook consolidation
import { useQuery } from '@tanstack/react-query';
import { partiesService } from '../parties/service';
import { useAuthStore } from '../auth/store';

export const useCustomers = (_companyId?: string) => {
    const { user } = useAuthStore();
    const companyId = _companyId || user?.company_id;

    return useQuery({
        queryKey: ['parties', companyId, 'customer'],
        queryFn: async () => {
            if (!companyId) return [];
            return await partiesService.getParties(companyId, 'customer');
        },
        enabled: !!companyId,
        staleTime: 1000 * 60 * 5,
    });
};
