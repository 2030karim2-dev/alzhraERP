import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/features/sales/api';
import { useFeedbackStore } from '@/features/feedback/store';
import { invalidateByPreset } from '@/lib/invalidation';

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await salesApi.deleteInvoice(id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      showToast('تم حذف الفاتورة بنجاح', 'success');
      invalidateByPreset(queryClient, 'sale');
    },
    onError: (error: any) => {
      showToast(error.message || 'فشل في حذف الفاتورة', 'error');
    }
  });
};
