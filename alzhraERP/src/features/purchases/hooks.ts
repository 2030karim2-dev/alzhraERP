import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchasesService } from './service';
import { useAuthStore } from '../auth/store';
import { useFeedbackStore } from '../feedback/store';
import { CreatePurchaseDTO, CreatePaymentDTO } from './types';
import { purchasesApi } from './api';
import { usePartySearch } from '../parties/hooks';
import { invalidateByPreset } from '../../lib/invalidation';
import { useNetworkStatus } from '../../lib/hooks/useNetworkStatus';
import { syncStore } from '../../core/lib/sync-store';
import { useBranchFilter } from '../branches/hooks/useBranchFilter';

// Fix: Added missing usePurchases hook to fetch purchase history
export const usePurchases = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['purchases', companyId, branchId],
    queryFn: () => companyId ? purchasesService.getPurchases(companyId, branchId) : Promise.resolve([] as any[]),
    enabled: !!companyId,
  });
};

// Fix: Added missing usePurchaseStats hook for dashboard summary
export const usePurchaseStats = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['purchase_stats', companyId, branchId],
    queryFn: () => companyId ? purchasesService.getStats(companyId, branchId) : Promise.resolve(null),
    enabled: !!companyId,
  });
};

// Fix: Added missing usePurchaseDetails hook for viewing a single invoice
export const usePurchaseDetails = (purchaseId: string | null) => {
  return useQuery({
    queryKey: ['purchase_details', purchaseId],
    queryFn: async () => {
      if (!purchaseId) return null;
      const { data, error } = await purchasesApi.getPurchaseDetails(purchaseId);
      if (error) throw error;
      return data as unknown; // Cast to unknown to bypass strict Supabase join types without losing safety
    },
    enabled: !!purchaseId,
  });
};

export const useCreatePurchase = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { isOnline } = useNetworkStatus();
  const { branchId } = useBranchFilter();

  return useMutation({
    mutationFn: async (data: CreatePurchaseDTO) => {
      if (!user?.company_id || !user?.id) throw new Error("Authentication failed");

      // نرسل الفاتورة بحالة 'posted' لتفعيل الـ Trigger المخزني والمحاسبي في SQL
      return purchasesService.processPurchase({ ...data, branch_id: branchId }, user.company_id, user.id);
    },
    onSuccess: () => {
      showToast(`تم توريد الفاتورة بنجاح وتحديث الأرصدة المخزنية والمالية`, 'success');
      invalidateByPreset(queryClient, 'purchase');
    },
    onError: (err: Error, variables) => {
      if (!isOnline || err.message?.includes('Failed to fetch')) {
        syncStore.enqueue({
          mutationKey: ['purchases', 'create'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id }
        });
        showToast("تم حفظ فاتورة المشتريات محلياً (وضع عدم الاتصال). سيتم المزامنة تلقائياً.", 'info');
        return;
      }
      showToast(err.message || "فشل توريد الفاتورة", 'error');
    }
  });
};

// Fix: Added missing useCreatePayment hook for supplier payments
export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { isOnline } = useNetworkStatus();
  const { branchId } = useBranchFilter();

  return useMutation({
    mutationFn: async (data: CreatePaymentDTO) => {
      if (!user?.company_id || !user?.id) throw new Error("Authentication failed");
      return purchasesApi.createSupplierPayment({ ...data, branch_id: branchId }, user.company_id, user.id);
    },
    onSuccess: () => {
      showToast('تم تسجيل سند الصرف بنجاح', 'success');
      invalidateByPreset(queryClient, 'purchase');
    },
    onError: (err: Error, variables) => {
      if (!isOnline || err.message?.includes('Failed to fetch')) {
        syncStore.enqueue({
          mutationKey: ['purchases', 'payment'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id }
        });
        showToast("تم حفظ السند محلياً (وضع عدم الاتصال). سيتم المزامنة تلقائياً.", 'info');
        return;
      }
      showToast(err.message || "فشل تسجيل السند", 'error')
    }
  });
};

// Fix: Added missing usePurchasesAnalytics hook for charting
export const usePurchasesAnalytics = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  return useQuery({
    queryKey: ['purchases_analytics', companyId],
    queryFn: () => companyId ? purchasesService.getAnalytics(companyId) : Promise.resolve(null as any),
    enabled: !!companyId,
  });
};

// Fix: Added missing useSupplierSearch hook for purchase forms
export const useSupplierSearch = (query: string) => {
  return usePartySearch('supplier', query);
};

export const useDeletePurchase = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await purchasesApi.deletePurchase(id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      showToast('تم حذف فاتورة الشراء بنجاح', 'success');
      invalidateByPreset(queryClient, 'purchase');
    },
    onError: (error: any) => {
      showToast(error.message || 'فشل في حذف فاتورة الشراء', 'error');
    }
  });
};
