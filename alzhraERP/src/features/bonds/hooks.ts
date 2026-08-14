import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bondsService } from './service';
import { useAuthStore } from '../auth/store';
import { useFeedbackStore } from '../feedback/store';
import { BondType, BondFormData } from './types';
import { assertPermission } from '../../core/hooks/usePermission';
import { useBranchFilter } from '../branches/hooks/useBranchFilter';

export const useBonds = (type?: BondType) => {
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['bonds', user?.company_id, branchId, type],
    queryFn: () => user?.company_id ? bondsService.fetchBonds(user.company_id, branchId, type) : Promise.resolve([]),
    enabled: !!user?.company_id,
  });
};

export const useBondsAnalytics = () => {
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['bonds_analytics', user?.company_id, branchId],
    queryFn: () => user?.company_id ? bondsService.getBondsStats(user.company_id, branchId) : Promise.resolve(null),
    enabled: !!user?.company_id,
  });
};

export const useBondMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { branchId } = useBranchFilter();

  return useMutation({
    mutationFn: async (data: BondFormData) => {
      if (!user?.company_id || !user?.id) throw new Error("جلسة العمل منتهية");

      // فحص الصلاحية لإصدار السندات
      await assertPermission('accounting:create', 'إصدار سندات مالية');

      return bondsService.createBond(user.company_id, user.id, { ...data, branch_id: branchId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bonds', user?.company_id] });
      queryClient.invalidateQueries({ queryKey: ['payments', user?.company_id] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      const typeName = variables.type === 'receipt' ? 'قبض' : (variables.type === 'transfer' ? 'تحويل' : 'صرف');
      showToast(`تم إصدار سند ال${typeName} وترحيله آلياً`, 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error', error);
    }
  });
};

export const useDeleteBond = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("جلسة العمل منتهية");

      // فحص الصلاحية لحذف السندات
      await assertPermission('accounting:delete', 'حذف سندات مالية');

      return bondsService.deleteBond(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast("تم حذف وإلغاء السند بنجاح", 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || "فشل حذف السند", 'error', error);
    }
  });
};