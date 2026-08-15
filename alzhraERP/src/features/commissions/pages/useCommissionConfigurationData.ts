import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { useAllPermissions } from '../../../core/hooks/usePermission';
import { createCommissionPlan, listCommissionPlans, listCommissionRules, listCommissionTiers, updateCommissionPlan } from '../api';
import { canManagePlansByAccess } from '../authorization';
import type { CommissionPlan } from '../types';
import { commissionQueryKeys } from './commissionQueryKeys';

function requiredText(value: string | undefined): string {
  if (value === undefined || value.length === 0) throw new Error('company_required');
  return value;
}

function useConfigurationQueries(companyId: string | undefined, selectedId: string): {
  plans: Awaited<ReturnType<typeof listCommissionPlans>>;
  selected: CommissionPlan | undefined;
  rules: Awaited<ReturnType<typeof listCommissionRules>>;
  tiers: Awaited<ReturnType<typeof listCommissionTiers>>;
} {
  const hasCompany = companyId !== undefined && companyId.length > 0;
  const plansQuery = useQuery({ queryKey: commissionQueryKeys.plans(companyId), queryFn: () => listCommissionPlans(requiredText(companyId)), enabled: hasCompany });
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const selected = useMemo(() => plans.find(plan => plan.id === selectedId) ?? plans.at(0), [plans, selectedId]);
  const hasSelected = selected !== undefined;
  const rulesQuery = useQuery({ queryKey: commissionQueryKeys.rules(companyId, selected?.id), queryFn: () => listCommissionRules(requiredText(companyId), requiredText(selected?.id)), enabled: hasCompany && hasSelected });
  const tiersQuery = useQuery({ queryKey: commissionQueryKeys.tiers(companyId, selected?.id), queryFn: () => listCommissionTiers(requiredText(companyId), requiredText(selected?.id)), enabled: hasCompany && hasSelected });
  return { plans, selected, rules: rulesQuery.data ?? [], tiers: tiersQuery.data ?? [] };
}

function useConfigurationMutations(input: { companyId: string | undefined; selected: CommissionPlan | undefined; name: string; basis: CommissionPlan['calculation_basis']; currency: string; invalidatePlans: () => Promise<void> }): {
  create: () => void;
  toggleActive: () => void;
  creating: boolean;
  toggling: boolean;
  createError: boolean;
} {
  const createMutation = useMutation({ mutationFn: () => createCommissionPlan({ company_id: requiredText(input.companyId), name: input.name.trim(), calculation_basis: input.basis, currency_code: input.currency }), onSuccess: () => { void input.invalidatePlans(); } });
  const activateMutation = useMutation({ mutationFn: () => updateCommissionPlan(requiredText(input.selected?.id), requiredText(input.companyId), { status: input.selected?.status === 'active' ? 'inactive' : 'active' }), onSuccess: () => { void input.invalidatePlans(); } });
  return { create: () => { createMutation.mutate(); }, toggleActive: () => { activateMutation.mutate(); }, creating: createMutation.isPending, toggling: activateMutation.isPending, createError: createMutation.error !== null };
}

export function useCommissionConfigurationData(): {
  companyId: string | undefined;
  canManage: boolean;
  plans: Awaited<ReturnType<typeof listCommissionPlans>>;
  selected: CommissionPlan | undefined;
  rules: Awaited<ReturnType<typeof listCommissionRules>>;
  tiers: Awaited<ReturnType<typeof listCommissionTiers>>;
  name: string;
  basis: CommissionPlan['calculation_basis'];
  currency: string;
  setSelectedId: (id: string) => void;
  setName: (value: string) => void;
  setBasis: (value: CommissionPlan['calculation_basis']) => void;
  setCurrency: (value: string) => void;
  create: () => void;
  toggleActive: () => void;
  creating: boolean;
  toggling: boolean;
  createError: boolean;
} {
  const user = useAuthStore(state => state.user);
  const companyId = user?.company_id;
  const { permissions } = useAllPermissions();
  const canManage = canManagePlansByAccess(permissions, user?.role);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [basis, setBasis] = useState<CommissionPlan['calculation_basis']>('sales');
  const [currency, setCurrency] = useState('SAR');
  const queries = useConfigurationQueries(companyId, selectedId);
  const invalidatePlans = (): Promise<void> => queryClient.invalidateQueries({ queryKey: commissionQueryKeys.plans(companyId) });
  const mutations = useConfigurationMutations({ companyId, selected: queries.selected, name, basis, currency, invalidatePlans });
  const create = (): void => { mutations.create(); setName(''); };
  return { companyId, canManage, ...queries, name, basis, currency, setSelectedId, setName, setBasis, setCurrency, create, toggleActive: mutations.toggleActive, creating: mutations.creating, toggling: mutations.toggling, createError: mutations.createError };
}
