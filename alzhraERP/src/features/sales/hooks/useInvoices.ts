import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesService } from '../service';
import { useAuthStore } from '@/features/auth/store';
import { useFeedbackStore } from '@/features/feedback/store';
import { invalidateByPreset } from '@/lib/invalidation';
import { syncStore } from '@/core/lib/sync-store';
import { CreateInvoiceDTO } from '../types';

import { useBranchFilter } from '@/features/branches/hooks/useBranchFilter';

export const useInvoices = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['invoices', companyId, branchId],
    queryFn: () => companyId ? salesService.fetchSalesLog(companyId, 0, branchId) : Promise.resolve([]),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSalesStats = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['sales_stats', companyId, branchId],
    queryFn: () => companyId ? salesService.getStats(companyId, branchId) : Promise.resolve(null),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { branchId } = useBranchFilter();

  return useMutation({
    mutationFn: async (data: CreateInvoiceDTO) => {
      if (!user?.company_id || !user?.id) throw new Error("Missing auth context");
      const finalData = { ...data, branchId: data.branchId ?? branchId };
      return await salesService.processNewSale(user.company_id, user.id, finalData);
    },
    onSuccess: () => {
      showToast(`تم اعتماد الفاتورة بنجاح`, 'success');
      invalidateByPreset(queryClient, 'sale');
    },
    onError: (error, variables) => {
      const err = error as { message?: string; status?: number };
      const isFetchError = typeof err?.message === 'string' && err.message.includes('Failed to fetch');
      const isNetworkError = err?.status === 0;

      if (!navigator.onLine || isFetchError || isNetworkError) {
        // Unified offline queue (sync-store): replayed by ReactQueryProvider's
        // useSyncQueue via processSyncMutation(['sales', 'create']).
        void syncStore.enqueue({
          mutationKey: ['sales', 'create'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id },
        });
        showToast("تم حفظ الفاتورة محلياً. سيتم مزامنتها عند عودة الاتصال.", 'info');
        return;
      }

      showToast(err?.message || 'فشل في إصدار الفاتورة', 'error');
    }
  });
};
