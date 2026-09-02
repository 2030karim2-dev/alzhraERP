import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { treasuryApi, type CreateTreasuryInput } from '../api/treasuryApi';

// ─── Cashboxes ────────────────────────────────────────────────────────────────

export const useCashboxes = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['cashboxes', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      const { data, error } = await treasuryApi.getCashboxes(user.company_id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.company_id,
  });
};

// ─── Exchange Companies ────────────────────────────────────────────────────────

export const useExchangeCompanies = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['exchange_companies', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      const { data, error } = await treasuryApi.getExchangeCompanies(user.company_id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.company_id,
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useTreasuryMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const createCashbox = useMutation({
    mutationFn: (input: CreateTreasuryInput) => {
      if (!user?.company_id) throw new Error('No Company ID');
      return treasuryApi.createCashbox(user.company_id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashboxes'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast('تم إنشاء الصندوق وربطه بالحسابات المحاسبية بنجاح', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  const createExchangeCompany = useMutation({
    mutationFn: (input: CreateTreasuryInput) => {
      if (!user?.company_id) throw new Error('No Company ID');
      return treasuryApi.createExchangeCompany(user.company_id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange_companies'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast('تم إنشاء شركة الصرافة وربطها بالحسابات المحاسبية بنجاح', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  return {
    createCashbox: createCashbox.mutate,
    isCreatingCashbox: createCashbox.isPending,
    createExchangeCompany: createExchangeCompany.mutate,
    isCreatingExchange: createExchangeCompany.isPending,
  };
};
