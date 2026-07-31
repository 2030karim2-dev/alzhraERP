import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchasesService, purchasesApi } from '../service';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { CreatePurchaseDTO } from '../types';

// Hook to fetch purchase returns
export const usePurchaseReturns = () => {
    const { user } = useAuthStore();
    const companyId = user?.company_id;

    return useQuery({
        queryKey: ['purchase_returns', companyId],
        queryFn: () => companyId ? purchasesService.getPurchaseReturns(companyId) : Promise.resolve([]),
        enabled: !!companyId,
    });
};

// Hook to fetch purchase returns statistics
export const usePurchaseReturnsStats = () => {
    const { user } = useAuthStore();
    const companyId = user?.company_id;

    return useQuery({
        queryKey: ['purchase_returns_stats', companyId],
        queryFn: () => companyId ? purchasesService.getPurchaseReturnsStats(companyId) : Promise.resolve(null),
        enabled: !!companyId,
    });
};

// Hook to create a purchase return
export const useCreatePurchaseReturn = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();

    return useMutation({
        mutationFn: async (data: CreatePurchaseDTO) => {
            if (!user?.company_id || !user?.id) throw new Error("Missing auth context");
            return await purchasesService.processPurchaseReturn(data, user.company_id, user.id);
        },
        onSuccess: () => {
            showToast(`تم إنشاء مرتجع المشتريات بنجاح`, 'success');
            queryClient.invalidateQueries({ queryKey: ['purchase_returns'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_returns_stats'] });
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
        onError: (error: Error) => {
            showToast(error.message || 'فشل في إنشاء مرتجع المشتريات', 'error');
        }
    });
};

// Hook to fetch original purchase invoices for selection
export const usePurchaseInvoicesForReturn = (supplierId: string | null) => {
    const { user } = useAuthStore();
    const companyId = user?.company_id;

    return useQuery({
        queryKey: ['purchase_invoices_for_return', companyId, supplierId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await purchasesApi.getPurchaseInvoicesForReturn(companyId, supplierId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });
};
