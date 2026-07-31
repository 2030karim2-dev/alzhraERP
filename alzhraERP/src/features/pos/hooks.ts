import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { ProcessPOSCheckoutUsecase } from '../../core/usecases/sales/ProcessPOSCheckoutUsecase';
import { useAuthStore } from '../auth/store';
import { useFeedbackStore } from '../feedback/store';
import { CreateInvoiceDTO } from '../sales/types';
// Fix: Import 'salesService' to resolve the 'Cannot find name' error.
import { salesService } from '../sales/service';
import { useBranchFilter } from '../branches/hooks/useBranchFilter';

export const usePOSCheckout = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { branchId } = useBranchFilter();

  const checkout = useMutation({
    mutationFn: async (data: CreateInvoiceDTO) => {
      if (!user?.company_id || !user?.id) throw new Error("جلسة العمل منتهية");
      // تمرير branchId النشط تلقائياً مع كل عملية بيع من نقطة البيع
      const finalData = { ...data, branchId: data.branchId || branchId };
      return salesService.processNewSale(user.company_id, user.id, finalData);
    },
    onSuccess: (invoice) => {
      showToast(`تمت عملية البيع بنجاح (رقم: ${invoice.invoice_number})`, 'success');
      // تحديث البيانات في الخلفية
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
    onError: (error: any) => {
      showToast("فشل في إتمام عملية البيع", 'error', error);
    }
  });

  return {
    processPayment: checkout.mutate,
    isProcessing: checkout.isPending
  };
};