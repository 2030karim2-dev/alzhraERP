import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesService } from './service';
import { useAuthStore } from '../auth/store';
import { useFeedbackStore } from '../feedback/store';
import { ExpenseFormData } from './types';
import { useMemo } from 'react';
import { AuthorizeActionUsecase } from '../../core/usecases/auth/AuthorizeActionUsecase';
import { supabase } from '../../lib/supabaseClient';
import { invalidateByPreset } from '../../lib/invalidation';
import { useNetworkStatus } from '../../lib/hooks/useNetworkStatus';
import { syncStore } from '../../core/lib/sync-store';
import { useBranchFilter } from '../branches/hooks/useBranchFilter';

export const useNextExpenseNumber = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['next_expense_number', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return '---';
      const { data, error } = await supabase.rpc('get_next_sequence', {
        p_company_id: user.company_id,
        p_type: 'expense'
      });

      if (error) {
        console.warn('Failed to fetch sequence:', error);
        return '';
      }
      return data;
    },
    enabled: !!user?.company_id,
    staleTime: 0,
  });
};

export const useExpenseCategories = () => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: ['expense_categories', companyId],
    queryFn: () => companyId ? expensesService.getExpenseCategories(companyId) : Promise.resolve([]),
    enabled: !!companyId,
    select: (data) => Array.isArray(data) ? data : [],
  });
};

export const useExpenseCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user?.company_id) throw new Error("Authentication required");
      return expensesService.createCategory(user.company_id, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_categories'] });
      showToast('تمت إضافة التصنيف بنجاح', 'success');
    }
  });
};

export const useExpensesData = (searchTerm: string = '') => {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const { branchId } = useBranchFilter();

  const query = useQuery({
    queryKey: ['expenses', companyId, branchId],
    queryFn: () => companyId ? expensesService.getExpensesList(companyId, branchId) : Promise.resolve([]),
    enabled: !!companyId,
  });

  const filteredExpenses = useMemo(() => {
    if (!query.data) return [];
    if (!searchTerm) return query.data;
    const term = searchTerm.toLowerCase();
    return query.data.filter(e => e.description.toLowerCase().includes(term));
  }, [query.data, searchTerm]);

  const stats = useMemo(() => {
    return expensesService.calculateStats(query.data || []);
  }, [query.data]);

  return { ...query, expenses: filteredExpenses, stats };
};

export const useExpenseActions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { isOnline } = useNetworkStatus();

  const { branchId } = useBranchFilter();

  const create = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      if (!user?.company_id || !user?.id) throw new Error("جلسة العمل منتهية");
      AuthorizeActionUsecase.validateAction(user, 'create_expense');
      const finalData = { ...data, branch_id: data.branch_id || branchId };
      return expensesService.processNewExpense(finalData, user.company_id, user.id);
    },
    onSuccess: () => {
      invalidateByPreset(queryClient, 'expense');
      showToast('تم تسجيل المصروف وترحيله بنجاح', 'success');
    },
    onError: (error: Error, variables) => {
      if (!isOnline || error.message?.includes('Failed to fetch')) {
        syncStore.enqueue({
          mutationKey: ['expenses', 'create'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id }
        });
        showToast("تم حفظ المصروف محلياً (وضع عدم الاتصال). سيتم المزامنة تلقائياً.", 'info');
        return;
      }
      showToast(error.message, 'error', { error });
    }
  });

  const remove = useMutation({
    mutationFn: (id: string) => expensesService.deleteExpense(id),
    onSuccess: () => {
      invalidateByPreset(queryClient, 'expense');
      showToast('تم إلغاء المصروف بنجاح', 'success');
    },
    onError: (error: Error) => showToast(error.message, 'error')
  });

  return {
    createExpense: create.mutate,
    isCreating: create.isPending,
    error: create.error,
    deleteExpense: remove.mutate,
    isDeleting: remove.isPending,
  };
};