import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import type { AuthUser } from '../../auth/types';
import { calculateCommissionPeriod, listCommissionPeriods, transitionCommissionPeriod } from '../api';
import { transitionPermission } from '../authorization';
import type { CommissionPeriod, CommissionPeriodState } from '../types';

const nextStates = new Map<CommissionPeriodState, CommissionPeriodState>([
  ['open', 'calculating'], ['calculating', 'calculated'], ['calculated', 'under_review'],
  ['under_review', 'approved'], ['approved', 'locked'], ['locked', 'paid'],
]);

function usePeriodData(companyId: string | undefined, hasCompany: boolean, selectedId: string | null): {
  periods: CommissionPeriod[];
  selected: CommissionPeriod | undefined;
} {
  const query = useQuery({
    queryKey: ['commission-periods', companyId],
    queryFn: () => (hasCompany && companyId !== undefined ? listCommissionPeriods(companyId) : Promise.resolve([] as CommissionPeriod[])),
    enabled: hasCompany,
  });
  const periods = useMemo<CommissionPeriod[]>(() => query.data ?? [], [query.data]);
  const selected = useMemo<CommissionPeriod | undefined>(
    () => periods.find(period => period.id === selectedId) ?? periods.at(0),
    [periods, selectedId]
  );
  return { periods, selected };
}

function usePeriodMutations(companyId: string | undefined, selected: CommissionPeriod | undefined): {
  isCalculating: boolean;
  isTransitioning: boolean;
  hasError: boolean;
  calculate: () => void;
  transition: (target?: CommissionPeriodState) => void;
} {
  const queryClient = useQueryClient();
  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['commission-periods', companyId] });
  };
  const transitionMutation = useMutation({
    mutationFn: async (newState: CommissionPeriodState): Promise<void> => {
      if (selected?.id === undefined || companyId === undefined) return;
      await transitionCommissionPeriod({ periodId: selected.id, companyId, newState, permission: transitionPermission(newState) });
    },
    onSuccess: invalidate,
  });
  const calculateMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (selected !== undefined && companyId !== undefined) await calculateCommissionPeriod(companyId, selected.id);
    },
    onSuccess: invalidate,
  });
  return {
    isCalculating: calculateMutation.isPending,
    isTransitioning: transitionMutation.isPending,
    hasError: transitionMutation.error != null || calculateMutation.error != null,
    calculate: () => { void calculateMutation.mutateAsync(); },
    transition: (target?: CommissionPeriodState) => { if (target !== undefined) void transitionMutation.mutateAsync(target); },
  };
}

export function useCommissionPeriodsController(): {
  companyId: string | undefined;
  periods: CommissionPeriod[];
  selected: CommissionPeriod | undefined;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  target: CommissionPeriodState | undefined;
  isProtectedTest: boolean;
  isCalculating: boolean;
  isTransitioning: boolean;
  hasError: boolean;
  calculate: () => void;
  transition: () => void;
} {
  const user: AuthUser | null = useAuthStore(state => state.user);
  const companyId = user?.company_id;
  const hasCompany = companyId !== undefined && companyId.length > 0;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { periods, selected } = usePeriodData(companyId, hasCompany, selectedId);
  const target = selected === undefined ? undefined : nextStates.get(selected.state);
  const mutations = usePeriodMutations(companyId, selected);
  return {
    companyId, periods, selected, selectedId, setSelectedId, target,
    isProtectedTest: selected?.is_test_period === true,
    ...mutations,
    transition: () => {
      mutations.transition(target);
    },
  };
}
