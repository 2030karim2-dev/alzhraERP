import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { useFeedbackStore } from '../feedback/store';
import type { CreateInvoiceDTO } from '../sales/types';
import { salesService } from '../sales/service';
import { useBranchFilter } from '../branches/hooks/useBranchFilter';
import { invalidateByPreset } from '../../lib/invalidation';
import { syncStore } from '../../core/lib/sync-store';

export const usePOSCheckout = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { branchId } = useBranchFilter();

  const checkout = useMutation({
    mutationFn: async (data: CreateInvoiceDTO) => {
      if (!user?.company_id || !user?.id) throw new Error('جلسة العمل منتهية');
      // تمرير branchId النشط تلقائياً مع كل عملية بيع من نقطة البيع
      const finalData = { ...data, branchId: data.branchId || branchId };
      return salesService.processNewSale(user.company_id, user.id, finalData);
    },
    onSuccess: invoice => {
      showToast(`تمت عملية البيع بنجاح (رقم: ${invoice?.invoice_number ?? ''})`, 'success');
      invalidateByPreset(queryClient, 'sale');
    },
    onError: (error: any, variables: CreateInvoiceDTO) => {
      const err = error as { message?: string; status?: number };
      const isFetchError =
        typeof err?.message === 'string' && err.message.includes('Failed to fetch');
      const isNetworkError = err?.status === 0;

      if (!navigator.onLine || isFetchError || isNetworkError) {
        void syncStore.enqueue({
          mutationKey: ['sales', 'create'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id },
        });
        showToast('تم حفظ الفاتورة محلياً وسيتم مزامنتها عند عودة الاتصال', 'info');
        return;
      }

      showToast(err?.message || 'فشل في إتمام عملية البيع', 'error');
    },
  });

  return {
    processPayment: checkout.mutate,
    isProcessing: checkout.isPending,
  };
};
