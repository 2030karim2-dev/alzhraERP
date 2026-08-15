import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import type { AuthUser } from '../../auth/types';
import { createEngineerLink, listPendingInvoices, resolvePendingInvoice } from '../api';
import { commissionQueryKeys } from './commissionQueryKeys';

export function useCommissionAssignmentsController(): {
  hasCompany: boolean;
  companyId: string | undefined;
  selected: string | null;
  invoiceId: string;
  engineerId: string;
  allocation: string;
  reason: string;
  pendingItems: Awaited<ReturnType<typeof listPendingInvoices>>;
  isIgnoring: boolean;
  linkError: Error | null;
  canSubmit: boolean;
  linkPending: boolean;
  setSelected: (value: string | null) => void;
  setInvoiceId: (value: string) => void;
  setEngineerId: (value: string) => void;
  setAllocation: (value: string) => void;
  setReason: (value: string) => void;
  selectInvoice: (invoiceId: string, pendingId: string) => void;
  ignoreInvoice: (pendingId: string) => void;
  submit: () => void;
} {
  const user: AuthUser | null = useAuthStore(state => state.user);
  const companyId = user?.company_id;
  const hasCompany = typeof companyId === 'string' && companyId.length > 0;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [allocation, setAllocation] = useState('100');
  const [reason, setReason] = useState('');
  const pendingQuery = useQuery({ queryKey: commissionQueryKeys.pending(companyId), queryFn: () => (hasCompany ? listPendingInvoices(companyId) : Promise.resolve([])), enabled: hasCompany });
  const reset = (): void => { setSelected(null); setInvoiceId(''); setEngineerId(''); setAllocation('100'); setReason(''); };
  const linkMutation = useMutation({
    mutationFn: async (): Promise<string> => createEngineerLink({ invoiceId, companyId: companyId ?? '', userId: engineerId, allocationPct: Number(allocation), assignmentType: reason.trim().length > 0 ? 'historical' : 'direct', reason: reason.trim() || null, source: reason.trim().length > 0 ? 'historical' : 'manual' }),
    onSuccess: async (): Promise<void> => { if (selected !== null && hasCompany) await resolvePendingInvoice({ pendingId: selected, companyId, status: 'resolved', reason: reason.trim() || 'تم اكتمال توزيع المهندس' }); reset(); await queryClient.invalidateQueries({ queryKey: commissionQueryKeys.pending(companyId) }); },
  });
  const ignoreMutation = useMutation({ mutationFn: async (pendingId: string): Promise<void> => { if (hasCompany) await resolvePendingInvoice({ pendingId, companyId, status: 'ignored', reason: 'تم التجاهل من مدير العمولات' }); }, onSuccess: async (): Promise<void> => { await queryClient.invalidateQueries({ queryKey: commissionQueryKeys.pending(companyId) }); } });
  const allocationValue = Number(allocation);
  return { hasCompany, companyId, selected, invoiceId, engineerId, allocation, reason, pendingItems: pendingQuery.data ?? [], isIgnoring: ignoreMutation.isPending, linkError: linkMutation.error, canSubmit: invoiceId.length > 0 && engineerId.length > 0 && Number.isFinite(allocationValue) && allocationValue > 0 && allocationValue <= 100 && !linkMutation.isPending, linkPending: linkMutation.isPending, setSelected, setInvoiceId, setEngineerId, setAllocation, setReason, selectInvoice: (nextInvoiceId, pendingId) => { setSelected(pendingId); setInvoiceId(nextInvoiceId); }, ignoreInvoice: pendingId => { void ignoreMutation.mutateAsync(pendingId); }, submit: () => { void linkMutation.mutateAsync(); } };
}
