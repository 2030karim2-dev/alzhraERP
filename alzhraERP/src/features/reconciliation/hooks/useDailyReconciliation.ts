import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import { useFeedbackStore } from '../../feedback/store';
import { parseError } from '../../../core/utils/errorUtils';
import { reconciliationApi } from '../api/reconciliationApi';
import type {
  CommitDailyReconciliationDTO,
  QuickDrawerExpenseDTO,
  DailyDrawerSummary,
  ExistingReconciliationRecord,
} from '../types';

export const useDailyDrawerSummary = (date: string) => {
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();

  return useQuery<DailyDrawerSummary, Error>({
    queryKey: ['daily_drawer_summary', user?.company_id, date, branchId],
    queryFn: async () => {
      if (!user?.company_id) {
        throw new Error('جلسة العمل منتهية أو لم يتم تحديد المنشأة');
      }
      return reconciliationApi.fetchDailyDrawerSummary(user.company_id, date, branchId);
    },
    enabled: Boolean(user?.company_id && date),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

export const useCommitDailyReconciliation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: async (payload: CommitDailyReconciliationDTO) => {
      return reconciliationApi.commitReconciliation(payload);
    },
    onSuccess: data => {
      showToast(data.message || 'تم إقفال يومية المحل واعتماد المطابقة بنجاح', 'success');
      queryClient.invalidateQueries({ queryKey: ['daily_drawer_summary'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation_history'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
    onError: (error: unknown) => {
      const parsed = parseError(error);
      showToast(parsed.message, 'error');
    },
  });
};

export const useRecordQuickDrawerExpense = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: async (payload: QuickDrawerExpenseDTO) => {
      return reconciliationApi.recordQuickExpense(payload);
    },
    onSuccess: data => {
      showToast(data.message || 'تم تسجيل مصروف الدرج بنجاح', 'success');
      queryClient.invalidateQueries({ queryKey: ['daily_drawer_summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
    onError: (error: unknown) => {
      const parsed = parseError(error);
      showToast(parsed.message, 'error');
    },
  });
};

export const useReconciliationHistory = (limit = 30) => {
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();

  return useQuery<ExistingReconciliationRecord[], Error>({
    queryKey: ['reconciliation_history', user?.company_id, branchId, limit],
    queryFn: async () => {
      if (!user?.company_id) return [];
      return reconciliationApi.fetchReconciliationHistory(user.company_id, limit, branchId);
    },
    enabled: Boolean(user?.company_id),
    staleTime: 60 * 1000,
  });
};
