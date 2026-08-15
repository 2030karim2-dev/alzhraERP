import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { useAllPermissions } from '../../../core/hooks/usePermission';
import { calculateCommissionPeriod, detectPendingInvoices, listCommissionCalculations, listCommissionPeriods, listPendingInvoices } from '../api';
import { canCalculatePeriodByAccess } from '../authorization';
import type { CommissionPeriod } from '../types';
import { commissionQueryKeys } from './commissionQueryKeys';

function requiredText(value: string | undefined): string {
  if (value === undefined || value.length === 0) throw new Error('company_required');
  return value;
}

export function useCommissionDashboardData(): {
  companyId: string | undefined;
  canCalculate: boolean;
  periods: Awaited<ReturnType<typeof listCommissionPeriods>>;
  selectedPeriod: CommissionPeriod | undefined;
  calculations: Awaited<ReturnType<typeof listCommissionCalculations>>;
  pending: Awaited<ReturnType<typeof listPendingInvoices>>;
  total: number;
  collected: number;
  invoiceCount: number;
  setSelectedPeriodId: (id: string) => void;
  calculate: () => void;
  detect: () => void;
  calculating: boolean;
  detecting: boolean;
  hasError: boolean;
} {
  const user = useAuthStore(state => state.user);
  const companyId = user?.company_id;
  const { permissions } = useAllPermissions();
  const canCalculate = canCalculatePeriodByAccess(permissions, user?.role);
  const queryClient = useQueryClient();
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const hasCompany = companyId !== undefined && companyId.length > 0;
  const periodsQuery = useQuery({ queryKey: commissionQueryKeys.periods(companyId), queryFn: () => listCommissionPeriods(requiredText(companyId)), enabled: hasCompany });
  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data]);
  const selectedPeriod = useMemo(() => periods.find(period => period.id === selectedPeriodId) ?? periods.at(0), [periods, selectedPeriodId]);
  const hasPeriod = selectedPeriod !== undefined;
  const calculationsQuery = useQuery({ queryKey: commissionQueryKeys.calculations(companyId, selectedPeriod?.id), queryFn: () => listCommissionCalculations(requiredText(companyId), requiredText(selectedPeriod?.id)), enabled: hasCompany && hasPeriod });
  const pendingQuery = useQuery({ queryKey: commissionQueryKeys.pending(companyId), queryFn: () => listPendingInvoices(requiredText(companyId)), enabled: hasCompany });
  const calculations = useMemo(() => calculationsQuery.data ?? [], [calculationsQuery.data]);
  const pending = useMemo(() => pendingQuery.data ?? [], [pendingQuery.data]);
  const total = calculations.reduce((sum, item) => sum + item.total_commission, 0);
  const collected = calculations.reduce((sum, item) => sum + item.collected_amount, 0);
  const invoiceCount = calculations.reduce((sum, item) => sum + item.invoice_count, 0);
  const calculateMutation = useMutation({ mutationFn: () => calculateCommissionPeriod(requiredText(companyId), requiredText(selectedPeriod?.id)), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: commissionQueryKeys.periods(companyId) }); await queryClient.invalidateQueries({ queryKey: commissionQueryKeys.calculations(companyId, selectedPeriod?.id) }); } });
  const detectMutation = useMutation({ mutationFn: () => detectPendingInvoices(requiredText(companyId)), onSuccess: () => queryClient.invalidateQueries({ queryKey: commissionQueryKeys.pending(companyId) }) });
  return { companyId, canCalculate, periods, selectedPeriod, calculations, pending, total, collected, invoiceCount, setSelectedPeriodId, calculate: () => { calculateMutation.mutate(); }, detect: () => { detectMutation.mutate(); }, calculating: calculateMutation.isPending, detecting: detectMutation.isPending, hasError: calculateMutation.error !== null || detectMutation.error !== null };
}
