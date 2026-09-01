import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { purchasesService, purchasesApi } from '../service';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import type { CreatePurchaseDTO } from '../types';
import type { PurchaseListRow } from '../service';

const hasCompanyId = (companyId: string | null | undefined): companyId is string =>
  typeof companyId === 'string' && companyId.length > 0;

export const usePurchaseReturns = (): UseQueryResult<PurchaseListRow[]> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  return useQuery({
    queryKey: ['purchase_returns', companyId],
    queryFn: () =>
      hasCompanyId(companyId)
        ? purchasesService.getPurchaseReturns(companyId)
        : Promise.resolve([]),
    enabled: hasCompanyId(companyId),
  });
};

export const usePurchaseReturnsStats = (): UseQueryResult<{
  returnCount: number;
  totalReturns: number;
  pendingCount: number;
} | null> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  return useQuery({
    queryKey: ['purchase_returns_stats', companyId],
    queryFn: () =>
      hasCompanyId(companyId)
        ? purchasesService.getPurchaseReturnsStats(companyId)
        : Promise.resolve(null),
    enabled: hasCompanyId(companyId),
  });
};

export const useCreatePurchaseReturn = (): UseMutationResult<unknown, Error, CreatePurchaseDTO> => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  return useMutation({
    mutationFn: async (data: CreatePurchaseDTO) => {
      const companyId = user?.company_id;
      const userId = user?.id;
      if (!hasCompanyId(companyId) || !hasCompanyId(userId))
        throw new Error('Missing auth context');
      return purchasesService.processPurchaseReturn(data, companyId, userId);
    },
    onSuccess: () => {
      showToast('تم إنشاء مرتجع المشتريات بنجاح', 'success');
      void queryClient.invalidateQueries({ queryKey: ['purchase_returns'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase_returns_stats'] });
      void queryClient.invalidateQueries({ queryKey: ['purchases'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => {
      showToast(error.message.length > 0 ? error.message : 'فشل في إنشاء مرتجع المشتريات', 'error');
    },
  });
};

type PurchaseInvoicesForReturnResponse = Awaited<
  ReturnType<typeof purchasesApi.getPurchaseInvoicesForReturn>
>;
export type PurchaseInvoicesForReturnRow = NonNullable<
  PurchaseInvoicesForReturnResponse['data']
>[number];

export const usePurchaseInvoicesForReturn = (
  supplierId: string | null
): UseQueryResult<PurchaseInvoicesForReturnRow[] | null> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  return useQuery({
    queryKey: ['purchase_invoices_for_return', companyId, supplierId],
    queryFn: async () => {
      if (!hasCompanyId(companyId)) return [];
      const { data, error } = await purchasesApi.getPurchaseInvoicesForReturn(
        companyId,
        supplierId
      );
      if (error) throw error;
      return data;
    },
    enabled: hasCompanyId(companyId),
  });
};
