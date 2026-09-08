import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesService } from '../service';
import { useAuthStore } from '@/features/auth/store';
import { useFeedbackStore } from '@/features/feedback/store';
import { invalidateByPreset } from '@/lib/invalidation';
import { syncStore } from '@/core/lib/sync-store';
import type { CreateInvoiceDTO } from '../types';

import { useBranchFilter } from '@/features/branches/hooks/useBranchFilter';

export interface UseInvoicesOptions {
  searchTerm?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: string | undefined;
  paymentMethod?: string | undefined;
  type?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export const useInvoices = (options?: UseInvoicesOptions) => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();

  const isSearchMode = Boolean(
    (options?.searchTerm && options.searchTerm.trim() !== '') ||
    options?.dateFrom ||
    options?.dateTo ||
    options?.status ||
    options?.paymentMethod
  );

  return useQuery({
    queryKey: ['invoices', companyId, branchId, options],
    queryFn: () => {
      if (!companyId) return Promise.resolve([]);
      if (isSearchMode) {
        return salesService.searchSalesInvoices(companyId, {
          query: options?.searchTerm,
          dateFrom: options?.dateFrom,
          dateTo: options?.dateTo,
          status: options?.status,
          paymentMethod: options?.paymentMethod,
          type: options?.type ?? 'sale',
          branchId,
          page: options?.page ?? 0,
          limit: options?.limit ?? 50,
        });
      }
      return salesService.fetchSalesLog(companyId, options?.page ?? 0, branchId);
    },
    enabled: !!companyId,
    staleTime: isSearchMode ? 30 * 1000 : 5 * 60 * 1000,
  });
};

export const useSalesStats = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['sales_stats', companyId, branchId],
    queryFn: () => (companyId ? salesService.getStats(companyId, branchId) : Promise.resolve(null)),
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
      if (!user?.company_id || !user?.id) throw new Error('Missing auth context');
      const finalData = { ...data, branchId: data.branchId ?? branchId };
      return await salesService.processNewSale(user.company_id, user.id, finalData);
    },
    onSuccess: () => {
      showToast(`تم اعتماد الفاتورة بنجاح`, 'success');
      invalidateByPreset(queryClient, 'sale');
    },
    onError: (error, variables) => {
      const err = error as { message?: string; status?: number };
      const isFetchError =
        typeof err?.message === 'string' && err.message.includes('Failed to fetch');
      const isNetworkError = err?.status === 0;

      if (!navigator.onLine || isFetchError || isNetworkError) {
        // Unified offline queue (sync-store): replayed by ReactQueryProvider's
        // useSyncQueue via processSyncMutation(['sales', 'create']).
        void syncStore.enqueue({
          mutationKey: ['sales', 'create'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id },
        });
        showToast('تم حفظ الفاتورة محلياً. سيتم مزامنتها عند عودة الاتصال.', 'info');
        return;
      }

      showToast(err?.message || 'فشل في إصدار الفاتورة', 'error');
    },
  });
};
