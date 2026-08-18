import { logger } from '../../../core/utils/logger';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journalService } from '../services/journalService';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { JournalEntryFormData } from '../types/models';
import { PostTransactionUsecase } from '../../../core/usecases/accounting/PostTransactionUsecase';
import { assertPermission } from '../../../core/hooks/usePermission';
import { invalidateByPreset } from '../../../lib/invalidation';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';

export const useJournals = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();

  return useInfiniteQuery({
    queryKey: ['journals', companyId, branchId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!companyId) return [];
      try {
        const result = await journalService.formatJournalsForUI(companyId, branchId, pageParam);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        logger.error("useJournals", "useJournals fetch error:", error);
        throw error;
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !Array.isArray(lastPage) || lastPage.length < 50) {
        return undefined;
      }
      return allPages?.length ?? 1;
    },
    enabled: !!companyId,
  });
};

export const useJournalMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { branchId } = useBranchFilter();

  const mutation = useMutation({
    mutationFn: async (data: JournalEntryFormData) => {
      if (!user?.company_id || !user?.id) throw new Error("جلسة العمل منتهية");

      // 1. فحص الصلاحية عبر الخادم
      await assertPermission('accounting:create', 'ترحيل قيود محاسبية');

      // 2. التنفيذ عبر Usecase لضمان صحة السنة المالية والتوازن
      return PostTransactionUsecase.execute(data, user.company_id, user.id, branchId);
    },
    onSuccess: () => {
      invalidateByPreset(queryClient, 'journal');
      showToast('تم ترحيل القيد المحاسبي بنجاح وتحديث أرصدة الأستاذ العام', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error', error);
    }
  });

  return {
    createJournal: mutation.mutate,
    isCreating: mutation.isPending
  };
};