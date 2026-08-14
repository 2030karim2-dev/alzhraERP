/**
 * Debt & Collection module — query hooks.
 * Data fetching only; no business computation in the frontend.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { debtsService } from '../services/debtService';
import { debtApi, debtMessageApi } from '../api/debtApi';

const STALE_TIME = 60 * 1000; // 1 min — debt data changes with every payment

const useCompanyId = (): string | undefined => {
  const { user } = useAuthStore();
  return user?.company_id;
};

export const useDebtDashboard = () => {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'dashboard', companyId],
    queryFn: () => (companyId ? debtsService.getDashboard(companyId) : Promise.resolve([])),
    enabled: !!companyId,
    staleTime: STALE_TIME,
  });
};

export const useDebtAnalytics = () => {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'analytics', companyId],
    queryFn: () => (companyId ? debtsService.getAnalytics(companyId) : Promise.resolve(null)),
    enabled: !!companyId,
    staleTime: STALE_TIME,
  });
};

export const useDebtTodayTasks = () => {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'today_tasks', companyId],
    queryFn: () => (companyId ? debtsService.getTodayTasks(companyId) : Promise.resolve([])),
    enabled: !!companyId,
    staleTime: STALE_TIME,
  });
};

export const useDebtPromises = (filters?: { partyId?: string; status?: string }) => {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'promises', companyId, filters?.partyId ?? '', filters?.status ?? ''],
    queryFn: () =>
      companyId ? debtApi.getPromises(companyId, filters) : Promise.resolve([]),
    enabled: !!companyId,
    staleTime: STALE_TIME,
  });
};

export const useDebtTemplates = (activeOnly = true) => {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'templates', companyId, activeOnly],
    queryFn: () =>
      companyId ? debtMessageApi.getTemplates(companyId, activeOnly) : Promise.resolve([]),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDebtMessageLog = (status?: string) => {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'message_log', companyId, status ?? ''],
    queryFn: () =>
      companyId ? debtMessageApi.getMessageLog(companyId, status) : Promise.resolve([]),
    enabled: !!companyId,
    staleTime: STALE_TIME,
  });
};

export const useDebtPartyOverview = (partyId: string | null) => {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'party_overview', companyId, partyId],
    queryFn: () =>
      companyId && partyId
        ? debtsService.getPartyOverview(companyId, partyId)
        : Promise.resolve(null),
    enabled: !!companyId && !!partyId,
    staleTime: STALE_TIME,
  });
};

export const useDebtFollowupConfig = () => {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'followup_config', companyId],
    queryFn: () =>
      companyId ? debtApi.getFollowupConfig(companyId) : Promise.resolve(null),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDebtOpeningBalances = (partyId?: string) => {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['debts', 'opening_balances', companyId, partyId ?? ''],
    queryFn: () =>
      companyId ? debtMessageApi.getOpeningBalances(companyId, partyId) : Promise.resolve([]),
    enabled: !!companyId,
    staleTime: STALE_TIME,
  });
};
