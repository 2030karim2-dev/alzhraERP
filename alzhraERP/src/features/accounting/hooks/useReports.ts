
import { useQuery } from '@tanstack/react-query';
import { accountingService } from '../services/index';
import { reportsApi } from '../api/reportsApi';
import { useAuthStore } from '../../auth/store';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';

export const useLedger = (accountId: string | null, fromDate?: string, toDate?: string) => {
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();

  return useQuery({
    queryKey: ['ledger', user?.company_id, branchId, accountId, fromDate, toDate],
    queryFn: () => (user?.company_id && accountId)
      ? accountingService.getLedger(user.company_id, accountId, branchId, fromDate, toDate)
      : Promise.resolve([]),
    enabled: !!user?.company_id && !!accountId
  });
};

export const useTrialBalance = (fromDate?: string, toDate?: string) => {
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['trial_balance', user?.company_id, branchId, fromDate, toDate],
    queryFn: () => user?.company_id
      ? accountingService.getTrialBalance(user.company_id, branchId, fromDate, toDate)
      : Promise.resolve([]),
    enabled: !!user?.company_id
  });
};

export const useFinancials = (fromDate?: string, toDate?: string) => {
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['financials', user?.company_id, branchId, fromDate, toDate],
    queryFn: () => user?.company_id
      ? accountingService.getFinancials(user.company_id, branchId, fromDate, toDate)
      : Promise.resolve(null),
    enabled: !!user?.company_id
  });
};

export const useAuditJournals = (enabled: boolean) => {
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();
  return useQuery({
    queryKey: ['audit_journals', user?.company_id, branchId],
    queryFn: async () => {
      if (!user?.company_id) return [];
      const { data, error } = await reportsApi.getAuditJournals(user.company_id, branchId);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.company_id && enabled
  });
};