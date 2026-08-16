import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { purchasesService } from './service';
import { useAuthStore } from '../auth/store';
import { useFeedbackStore } from '../feedback/store';
import type { CreatePurchaseDTO, CreatePaymentDTO, PurchaseStats } from './types';
import { purchasesApi } from './api';
import { usePartySearch } from '../parties/hooks';
import { invalidateByPreset } from '../../lib/invalidation';
import { useNetworkStatus } from '../../lib/hooks/useNetworkStatus';
import { syncStore } from '../../core/lib/sync-store';
import { useBranchFilter } from '../branches/hooks/useBranchFilter';

type PurchaseList = Awaited<ReturnType<typeof purchasesService.getPurchases>>;
type PurchaseAnalytics = Awaited<ReturnType<typeof purchasesService.getAnalytics>>;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim() !== '') return error.message;
  return fallback;
};

// Fix: Added missing usePurchases hook to fetch purchase history
export const usePurchases = (): UseQueryResult<PurchaseList> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();
  const hasCompany = companyId !== undefined && companyId !== '';
  return useQuery({
    queryKey: ['purchases', companyId, branchId],
    queryFn: (): Promise<PurchaseList> => {
      if (!hasCompany) return Promise.resolve([]);
      return purchasesService.getPurchases(companyId, branchId);
    },
    enabled: hasCompany,
  });
};

// Fix: Added missing usePurchaseStats hook for dashboard summary
export const usePurchaseStats = (): UseQueryResult<PurchaseStats | null> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();
  const hasCompany = companyId !== undefined && companyId !== '';
  return useQuery({
    queryKey: ['purchase_stats', companyId, branchId],
    queryFn: (): Promise<PurchaseStats | null> => {
      if (!hasCompany) return Promise.resolve(null);
      return purchasesService.getStats(companyId, branchId);
    },
    enabled: hasCompany,
  });
};

// Fix: Added missing usePurchaseDetails hook for viewing a single invoice
export const usePurchaseDetails = (purchaseId: string | null): UseQueryResult<Awaited<ReturnType<typeof purchasesApi.getPurchaseDetails>>['data'] | null> => {
  return useQuery({
    queryKey: ['purchase_details', purchaseId],
    queryFn: async (): Promise<Awaited<ReturnType<typeof purchasesApi.getPurchaseDetails>>['data'] | null> => {
      if (purchaseId === null || purchaseId === '') return null;
      const { data, error } = await purchasesApi.getPurchaseDetails(purchaseId);
      if (error) throw error;
      return data; // Cast to unknown to bypass strict Supabase join types without losing safety
    },
    enabled: purchaseId !== null && purchaseId !== '',
  });
};

export const useCreatePurchase = (): UseMutationResult<Awaited<ReturnType<typeof purchasesService.processPurchase>>, Error, CreatePurchaseDTO> => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { isOnline } = useNetworkStatus();
  const { branchId } = useBranchFilter();

  return useMutation({
    mutationFn: async (data: CreatePurchaseDTO): Promise<Awaited<ReturnType<typeof purchasesService.processPurchase>>> => {
      const companyId = user?.company_id;
      const userId = user?.id;
      if (companyId === undefined || companyId === '' || userId === undefined || userId === '') throw new Error("Authentication failed");

      // نرسل الفاتورة بحالة 'posted' لتفعيل الـ Trigger المخزني والمحاسبي في SQL
      return purchasesService.processPurchase({ ...data, branchId }, companyId, userId);
    },
    onSuccess: (): void => {
      showToast(`تم توريد الفاتورة بنجاح وتحديث الأرصدة المخزنية والمالية`, 'success');
      invalidateByPreset(queryClient, 'purchase');
    },
    onError: (err: Error, variables): void => {
      if (!isOnline || getErrorMessage(err, '').includes('Failed to fetch')) {
        void syncStore.enqueue({
          mutationKey: ['purchases', 'create'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id }
        });
        showToast("تم حفظ فاتورة المشتريات محلياً (وضع عدم الاتصال). سيتم المزامنة تلقائياً.", 'info');
        return;
      }
      showToast(getErrorMessage(err, "فشل توريد الفاتورة"), 'error');
    }
  });
};

// Fix: Added missing useCreatePayment hook for supplier payments
export const useCreatePayment = (): UseMutationResult<Awaited<ReturnType<typeof purchasesApi.createSupplierPayment>>, Error, CreatePaymentDTO> => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { isOnline } = useNetworkStatus();
  return useMutation({
    mutationFn: async (data: CreatePaymentDTO): Promise<Awaited<ReturnType<typeof purchasesApi.createSupplierPayment>>> => {
      const companyId = user?.company_id;
      const userId = user?.id;
      if (companyId === undefined || companyId === '' || userId === undefined || userId === '') throw new Error("Authentication failed");
      return purchasesApi.createSupplierPayment(data, companyId, userId);
    },
    onSuccess: (): void => {
      showToast('تم تسجيل سند الصرف بنجاح', 'success');
      invalidateByPreset(queryClient, 'purchase');
    },
    onError: (err: Error, variables): void => {
      if (!isOnline || getErrorMessage(err, '').includes('Failed to fetch')) {
        void syncStore.enqueue({
          mutationKey: ['purchases', 'payment'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id }
        });
        showToast("تم حفظ السند محلياً (وضع عدم الاتصال). سيتم المزامنة تلقائياً.", 'info');
        return;
      }
      showToast(getErrorMessage(err, "فشل تسجيل السند"), 'error')
    }
  });
};

// Fix: Added missing usePurchasesAnalytics hook for charting
export const usePurchasesAnalytics = (): UseQueryResult<PurchaseAnalytics | null> => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  return useQuery({
    queryKey: ['purchases_analytics', companyId],
    queryFn: (): Promise<PurchaseAnalytics | null> => companyId !== undefined && companyId !== '' ? purchasesService.getAnalytics(companyId) : Promise.resolve(null),
    enabled: companyId !== undefined && companyId !== '',
  });
};

// Fix: Added missing useSupplierSearch hook for purchase forms
export const useSupplierSearch = (query: string): ReturnType<typeof usePartySearch> => {
  return usePartySearch('supplier', query);
};

export const useDeletePurchase = (): UseMutationResult<string, unknown, string> => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { error } = await purchasesApi.deletePurchase(id);
      if (error) throw error;
      return id;
    },
    onSuccess: (): void => {
      showToast('تم حذف فاتورة الشراء بنجاح', 'success');
      invalidateByPreset(queryClient, 'purchase');
    },
    onError: (error: unknown): void => {
      showToast(getErrorMessage(error, 'فشل في حذف فاتورة الشراء'), 'error');
    }
  });
};
