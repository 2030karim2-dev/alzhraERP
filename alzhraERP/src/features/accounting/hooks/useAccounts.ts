
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService } from '../services/index';
import { useAuthStore } from '../../auth/store';
import { AccountFormData } from '../types/index';
import { useFeedbackStore } from '../../feedback/store';
import { useNetworkStatus } from '../../../lib/hooks/useNetworkStatus';
import { syncStore } from '../../../core/lib/sync-store';

export const useAccounts = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['accounts', user?.company_id],
    queryFn: () => user?.company_id ? accountingService.getAccounts(user.company_id) : Promise.resolve([]),
    enabled: !!user?.company_id
  });
};

export const useAccountMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { isOnline } = useNetworkStatus();

  const seedAccounts = useMutation({
    mutationFn: () => {
      if (!user?.company_id) throw new Error("No Company ID");
      return accountingService.seedDefaultAccounts(user.company_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const createAccount = useMutation({
    mutationFn: (data: AccountFormData) => {
      if (!user?.company_id) throw new Error("No Company ID");
      return accountingService.createAccount(data, user.company_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: Error, variables) => {
      if (!isOnline || err.message?.includes('Failed to fetch')) {
        syncStore.enqueue({
          mutationKey: ['accounting', 'create_account'],
          variables: { ...variables, company_id: user?.company_id }
        });
        showToast("تم حفظ الحساب محلياً. سيتم المزامنة فور توفر الإنترنت.", 'info');
        return;
      }
      showToast(err.message, 'error');
    }
  });

  const deleteAccount = useMutation({
    mutationFn: ({ id, isSystem }: { id: string; isSystem: boolean }) => {
      return accountingService.deleteAccount(id, isSystem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: Error) => {
      showToast(err.message || 'لا يمكن حذف الحساب', 'error');
    }
  });

  const seedYemeniExchanges = useMutation({
    mutationFn: () => {
      if (!user?.company_id) throw new Error("No Company ID");
      return accountingService.seedYemeniExchanges(user.company_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast("تمت إضافة حسابات الصرافة اليمنية بنجاح", 'success');
    },
    onError: (err: Error) => {
      showToast(`فشل إضافة الحسابات: ${err.message}`, 'error');
    }
  });

  const seedSubCashboxes = useMutation({
    mutationFn: () => {
      if (!user?.company_id) throw new Error("No Company ID");
      return accountingService.seedSubCashboxes(user.company_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast("تم تقسيم صندوق الكاش للعملات بنجاح", 'success');
    },
    onError: (err: Error) => {
      showToast(`فشل تقسيم الصندوق: ${err.message}`, 'error');
    }
  });

  const migrateCashboxBalances = useMutation({
    mutationFn: async () => {
      if (!user?.company_id) throw new Error("No Company ID");
      const { migrateCashboxBalances: migrateScript } = await import('../services/migrateCashboxBalances');
      return migrateScript(user.company_id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast(data.message || "تم نقل الأرصدة السابقة بنجاح", 'success');
    },
    onError: (err: Error) => {
      showToast(`فشل النقل: ${err.message}`, 'error');
    }
  });

  return {
    seedAccounts: seedAccounts.mutate,
    createAccount: createAccount.mutate,
    deleteAccount: deleteAccount.mutate,
    isSeeding: seedAccounts.isPending,
    isCreating: createAccount.isPending,
    isDeleting: deleteAccount.isPending,
    seedYemeniExchanges: seedYemeniExchanges.mutate,
    isSeedingExchanges: seedYemeniExchanges.isPending,
    seedSubCashboxes: seedSubCashboxes.mutate,
    isSeedingSubCashboxes: seedSubCashboxes.isPending,
    migrateCashboxBalances: migrateCashboxBalances.mutate,
    isMigratingCashbox: migrateCashboxBalances.isPending,
  };
};