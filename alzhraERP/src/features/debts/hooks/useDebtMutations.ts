import { useMutation, useQueryClient } from '@tanstack/react-query';
import { debtApi } from '../api/debtApi';
import type { PaymentPromiseInsert, PaymentPromiseUpdate, PartyOpeningBalanceInsert } from '@/core/database/types/debt.types';
import { useAuthStore } from '@/features/auth/store';

function useCompanyId() {
  const { user } = useAuthStore();
  return user?.company_id || '';
}

// ─── Payment Promise Mutations ───────────────────────

export function useCreatePromise() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<PaymentPromiseInsert, 'company_id'>) =>
      debtApi.createPromise({ ...payload, company_id: companyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts', 'promises'] });
      qc.invalidateQueries({ queryKey: ['debts', 'followup'] });
      qc.invalidateQueries({ queryKey: ['debts', 'today'] });
    },
  });
}

export function useUpdatePromise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PaymentPromiseUpdate }) =>
      debtApi.updatePromise(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts', 'promises'] });
      qc.invalidateQueries({ queryKey: ['debts', 'followup'] });
      qc.invalidateQueries({ queryKey: ['debts', 'today'] });
    },
  });
}

// ─── Opening Balance Mutations ───────────────────────

export function useUpsertOpeningBalance() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<PartyOpeningBalanceInsert, 'company_id'>) =>
      debtApi.upsertOpeningBalance({ ...payload, company_id: companyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts', 'opening'] });
      qc.invalidateQueries({ queryKey: ['debts', 'balances'] });
    },
  });
}
