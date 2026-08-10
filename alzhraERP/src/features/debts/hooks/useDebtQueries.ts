import { useQuery } from '@tanstack/react-query';
import { debtApi } from '../api/debtApi';
import { useAuthStore } from '@/features/auth/store';

function useCompanyId() {
  const { user } = useAuthStore();
  return user?.company_id || '';
}

export function usePartyBalances(partyId: string) {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'balances', cid, partyId],
    queryFn: () => debtApi.getPartyBalances(cid, partyId),
    enabled: !!cid && !!partyId,
  });
}

export function useFollowUpDashboard(dueSoonDays = 7, criticalDays = 30) {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'followup', cid, dueSoonDays, criticalDays],
    queryFn: () => debtApi.getFollowUpDashboard(cid, dueSoonDays, criticalDays),
    enabled: !!cid,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useTodayTasks() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'today', cid],
    queryFn: () => debtApi.getTodayTasks(cid),
    enabled: !!cid,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useDebtAnalytics() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'analytics', cid],
    queryFn: () => debtApi.getDebtAnalytics(cid),
    enabled: !!cid,
    staleTime: 60_000,
    retry: 1,
  });
}

export function usePromises(partyId?: string) {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'promises', cid, partyId],
    queryFn: () => debtApi.getPromises(cid, partyId ? { partyId } : undefined),
    enabled: !!cid,
  });
}

export function usePartyStatement(partyId: string) {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'statement', partyId],
    queryFn: () => debtApi.getPartyStatement(cid, partyId),
    enabled: !!cid && !!partyId,
  });
}

export function useOpeningBalances(partyId?: string) {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'opening', cid, partyId],
    queryFn: () => debtApi.getOpeningBalances(cid, partyId),
    enabled: !!cid,
  });
}

export function usePartyInfo(partyId: string) {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ['party', partyId],
    queryFn: () => debtApi.getPartyInfo(cid, partyId),
    enabled: !!cid && !!partyId,
  });
}

export function useCustomerActivities(partyId: string) {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'activities', cid, partyId],
    queryFn: () => debtApi.getCustomerActivities(cid, partyId),
    enabled: !!cid && !!partyId,
  });
}
