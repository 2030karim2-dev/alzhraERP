
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseService } from '../services/warehouseService';
// import { settingsService } from '../service'; // Import settingsService for primary status
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store'; // Assuming this hook exists

export const useWarehouses = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['settings_warehouses', user?.company_id],
    queryFn: () => user?.company_id ? warehouseService.getWarehouses(user.company_id) : Promise.resolve([]),
    enabled: !!user?.company_id
  });
};

export const useWarehouseMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const save = useMutation({
    mutationFn: (data: any) => warehouseService.saveWarehouse(user!.company_id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings_warehouses'] });
      showToast("تم حفظ بيانات المستودع", 'success');
    }
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: string }) => warehouseService.removeWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings_warehouses'] });
      showToast("تم حذف المستودع", 'info');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const setPrimary = useMutation({
    mutationFn: (_warehouseId: string) => {
      // is_primary column not available in v2
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings_warehouses'] });
      showToast("تم تعيين المستودع الرئيسي بنجاح", 'success');
    }
  });

  return {
    save: save.mutate,
    remove: remove.mutate,
    setPrimary: setPrimary.mutate,
    isSaving: save.isPending
  };
};
