// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesService } from '../service';
import { useAuthStore } from '@/features/auth/store';
import { useFeedbackStore } from '@/features/feedback/store';
import { invalidateByPreset } from '@/lib/invalidation';
import { useOfflineQueueStore } from '@/core/services/offlineQueueStore';
import { CreateInvoiceDTO } from '../types';

import { useBranchFilter } from '@/features/branches/hooks/useBranchFilter';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useInvoices = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['invoices', companyId, branchId],
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    queryFn: () => companyId ? salesService.fetchSalesLog(companyId, 0, branchId) : Promise.resolve([]),
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useSalesStats = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  return useQuery({
    queryKey: ['sales_stats', companyId],
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    queryFn: () => companyId ? salesService.getStats(companyId) : Promise.resolve(null),
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { enqueue } = useOfflineQueueStore();
  const { branchId } = useBranchFilter();

  return useMutation({
    mutationFn: async (data: CreateInvoiceDTO) => {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!user?.company_id || !user?.id) throw new Error("Missing auth context");
      const finalData = { ...data, branchId: data.branchId ?? branchId };
      return await salesService.processNewSale(user.company_id, user.id, finalData);
    },
    onSuccess: () => {
      showToast(`تم اعتماد الفاتورة بنجاح`, 'success');
      invalidateByPreset(queryClient, 'sale');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any, variables) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const isFetchError = typeof error?.message === 'string' && error.message.includes('Failed to fetch');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const isNetworkError = error?.status === 0;

      if (!navigator.onLine || isFetchError || isNetworkError) {
        enqueue('CREATE_INVOICE', { ...variables, company_id: user?.company_id, user_id: user?.id });
        showToast("تم حفظ الفاتورة محلياً. سيتم مزامنتها عند عودة الاتصال.", 'info');
        return;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions
      showToast(error?.message || 'فشل في إصدار الفاتورة', 'error');
    }
  });
};
