/**
 * Debt & Collection module — mutation hooks.
 * Server-side permissions enforced via assertPermission before each write.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { assertPermission } from '../../../core/hooks/usePermission';
import { debtApi, debtMessageApi } from '../api/debtApi';
import type {
  DebtFollowupConfigUpdate,
  PaymentPromiseInsert,
  PaymentPromiseUpdate,
  DebtMessageTemplateInsert,
  DebtMessageTemplateUpdate,
  PartyOpeningBalanceInsert,
} from '../types';

const DEBT_KEYS = ['debts'] as const;

export const useDebtMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const companyId = user?.company_id;

  const invalidateDebtQueries = () => {
    void queryClient.invalidateQueries({ queryKey: DEBT_KEYS });
  };

  // ── Follow-up configuration ─────────────────────────────────
  const saveFollowupConfig = useMutation({
    mutationFn: async (config: DebtFollowupConfigUpdate) => {
      await assertPermission('debts:manage', 'إعدادات متابعة الديون');
      if (!companyId) throw new Error('جلسة العمل غير مكتملة');
      return debtApi.upsertFollowupConfig(companyId, config);
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم حفظ إعدادات المتابعة', 'success');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  // ── Payment promises ────────────────────────────────────────
  const createPromise = useMutation({
    mutationFn: async (payload: Omit<PaymentPromiseInsert, 'company_id'>) => {
      await assertPermission('debts:manage', 'إضافة وعد سداد');
      if (!companyId) throw new Error('جلسة العمل غير مكتملة');
      return debtApi.createPromise({ ...payload, company_id: companyId });
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم تسجيل وعد السداد', 'success');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  const updatePromise = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PaymentPromiseUpdate }) => {
      await assertPermission('debts:manage', 'تعديل وعد السداد');
      return debtApi.updatePromise(id, payload);
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم تحديث الوعد', 'success');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  const deletePromise = useMutation({
    mutationFn: async (id: string) => {
      await assertPermission('debts:manage', 'حذف وعد السداد');
      return debtApi.deletePromise(id);
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم حذف الوعد', 'info');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  const completePromise = useMutation({
    mutationFn: async ({ promiseId, paymentId }: { promiseId: string; paymentId?: string }) => {
      await assertPermission('debts:manage', 'إتمام وعد السداد');
      if (!companyId) throw new Error('جلسة العمل غير مكتملة');
      return debtApi.completePromise(companyId, promiseId, paymentId);
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم إتمام الوعد 🎉', 'success');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  const breakOverduePromises = useMutation({
    mutationFn: async () => {
      await assertPermission('debts:manage', 'تحديث الوعود المتجاوزة');
      if (!companyId) throw new Error('جلسة العمل غير مكتملة');
      return debtApi.breakOverduePromises(companyId);
    },
    onSuccess: (ids) => {
      invalidateDebtQueries();
      showToast(
        ids.length > 0 ? `تم كشف ${ids.length} وعد مخلَف` : 'لا توجد وعود متجاوزة',
        'info'
      );
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  // ── Message templates ───────────────────────────────────────
  const saveTemplate = useMutation({
    mutationFn: async (payload: Omit<DebtMessageTemplateInsert, 'company_id'>) => {
      await assertPermission('debts:manage', 'حفظ قالب رسالة');
      if (!companyId) throw new Error('جلسة العمل غير مكتملة');
      return debtMessageApi.saveTemplate({ ...payload, company_id: companyId });
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم حفظ القالب', 'success');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: DebtMessageTemplateUpdate }) => {
      await assertPermission('debts:manage', 'تعديل قالب رسالة');
      return debtMessageApi.updateTemplate(id, payload);
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم تحديث القالب', 'success');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await assertPermission('debts:manage', 'حذف قالب رسالة');
      return debtMessageApi.deleteTemplate(id);
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم حذف القالب', 'info');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  // ── Reminder recording (wa.me — log the send, user opens the link) ──
  const recordReminder = useMutation({
    mutationFn: async (params: {
      partyId: string;
      messageText: string;
      templateId?: string | null;
      recipient?: string | null;
    }) => {
      await assertPermission('debts:remind', 'إرسال تذكير ديون');
      if (!companyId) throw new Error('جلسة العمل غير مكتملة');
      return debtMessageApi.recordReminder({
        companyId,
        partyId: params.partyId,
        messageText: params.messageText,
        templateId: params.templateId,
        recipient: params.recipient,
        channel: 'whatsapp',
      });
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم تسجيل التذكير — اضغط واتساب لإرسال الرسالة', 'success');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  // ── Opening balances ────────────────────────────────────────
  const saveOpeningBalance = useMutation({
    mutationFn: async (payload: Omit<PartyOpeningBalanceInsert, 'company_id'>) => {
      await assertPermission('debts:manage', 'تسجيل رصيد افتتاحي');
      if (!companyId) throw new Error('جلسة العمل غير مكتملة');
      return debtMessageApi.upsertOpeningBalance({ ...payload, company_id: companyId });
    },
    onSuccess: () => {
      invalidateDebtQueries();
      showToast('تم حفظ الرصيد الافتتاحي', 'success');
    },
    onError: (err: Error) => { showToast(err.message, 'error', err); },
  });

  return {
    saveFollowupConfig: saveFollowupConfig.mutate,
    createPromise: createPromise.mutate,
    updatePromise: updatePromise.mutate,
    deletePromise: deletePromise.mutate,
    completePromise: completePromise.mutate,
    breakOverduePromises: breakOverduePromises.mutate,
    saveTemplate: saveTemplate.mutate,
    updateTemplate: updateTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
    recordReminder: recordReminder.mutate,
    saveOpeningBalance: saveOpeningBalance.mutate,
    isSaving:
      saveFollowupConfig.isPending ||
      createPromise.isPending ||
      updatePromise.isPending ||
      saveTemplate.isPending ||
      recordReminder.isPending ||
      saveOpeningBalance.isPending,
  };
};

