import React, { useState } from 'react';
import { Plus, RefreshCcw, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../../core/utils/currencyUtils';
import { usePermission } from '../../../core/hooks/usePermission';
import { useDebtPromises } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';
import { PROMISE_STATUS_META } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import MobileCardList, { MobileCardRow } from '../../../ui/base/MobileCardList';
import PromiseFormModal from '../components/PromiseFormModal';
import { RowActions, type RowAction } from '../components/RowActions';
import type { PaymentPromiseWithParty, PromiseStatus } from '../types';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'قائمة' },
  { value: 'broken', label: 'وعود مخلَفة' },
  { value: 'completed', label: 'تمت' },
  { value: 'cancelled', label: 'ملغاة' },
];

const PromisesPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromise, setEditingPromise] = useState<PaymentPromiseWithParty | null>(null);
  const { data: promises, isLoading } = useDebtPromises(
    statusFilter ? { status: statusFilter } : undefined
  );
  const { completePromise, deletePromise, breakOverduePromises, isSaving } = useDebtMutations();
  // Write actions (create/edit/complete/delete/break) require debts:manage.
  const { hasPermission: canManage, isLoading: permissionLoading } = usePermission('debts:manage');
  const showManage = permissionLoading || canManage;

  // The query already filters by status server-side; keep a null-safe alias.
  const filtered = promises ?? [];

  /**
   * إجراءات صف الوعد — مصدر واحد لجدول سطح المكتب وبطاقات الموبايل.
   * الإجراءات المؤكَّدة (إتمام/حذف) تمر عبر ConfirmModal بدل window.confirm.
   */
  const promiseRowActions = (p: PaymentPromiseWithParty): RowAction[] => {
    const actions: RowAction[] = [];
    if (p.status === 'pending') {
      actions.push({
        key: 'complete',
        icon: CheckCircle2,
        label: 'إتمام الوعد (تم السداد)',
        colorClasses: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white',
        disabled: isSaving,
        confirm: {
          title: 'إتمام الوعد',
          message: 'سيتم إتمام الوعد بدون ربط سند قبض. هل المبلغ مسدَّد فعلياً؟',
          confirmLabel: 'نعم، إتمام',
          variant: 'warning',
        },
        onAction: () => {
          completePromise({ promiseId: p.id });
        },
      });
      actions.push({
        key: 'edit',
        icon: Pencil,
        label: 'تعديل',
        colorClasses: 'bg-sky-500/10 text-sky-600 hover:bg-sky-500 hover:text-white',
        onAction: () => {
          setEditingPromise(p);
          setIsModalOpen(true);
        },
      });
    }
    actions.push({
      key: 'delete',
      icon: Trash2,
      label: 'حذف',
      colorClasses: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white',
      disabled: isSaving,
      confirm: {
        title: 'حذف الوعد',
        message: 'هل تريد حذف هذا الوعد نهائياً؟',
        confirmLabel: 'حذف',
        variant: 'danger',
      },
      onAction: () => {
        deletePromise(p.id);
      },
    });
    return actions;
  };

  return (
    <div className="space-y-4 max-md:space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all max-md:px-2 ${
                statusFilter === f.value
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {showManage && (
            <>
              <button
                onClick={() => {
                  breakOverduePromises();
                }}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 transition-all hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 max-md:px-2 max-md:py-1.5"
              >
                <RefreshCcw size={13} /> كشف الوعود المتجاوزة
              </button>
              <button
                onClick={() => {
                  setEditingPromise(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 max-md:px-2 max-md:py-1.5"
              >
                <Plus size={14} /> وعد جديد
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-sm text-[var(--app-text-secondary)] max-md:p-8">
          جاري التحميل...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--app-border)] p-14 text-center text-sm text-[var(--app-text-secondary)] max-md:p-6">
          لا توجد وعود في هذا التصنيف
        </div>
      ) : (
        <div className="hidden overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm md:block">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-[var(--app-surface-hover)]/50 border-b border-[var(--app-border)] text-[10px] font-bold text-[var(--app-text-secondary)]">
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">العميل</th>
                <th className="px-4 py-3 text-left max-md:px-2 max-md:py-2">المبلغ</th>
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">تاريخ الوفاء</th>
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">الحالة</th>
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">ملاحظات</th>
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {filtered.map(p => {
                const meta =
                  PROMISE_STATUS_META[p.status as PromiseStatus] ?? PROMISE_STATUS_META.pending;
                return (
                  <tr key={p.id} className="transition-colors hover:bg-[var(--app-surface-hover)]">
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <span className="text-xs font-bold text-[var(--app-text)]">
                        {p.parties?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <span
                        className="font-mono text-xs font-bold text-[var(--app-text)]"
                        dir="ltr"
                      >
                        {formatCurrency(p.amount, p.currency_code)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <span
                        className="font-mono text-xs text-[var(--app-text-secondary)]"
                        dir="ltr"
                      >
                        {p.promise_date}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <StatusBadge {...meta} />
                    </td>
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <span className="line-clamp-1 text-xs text-[var(--app-text-secondary)]">
                        {p.notes ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      {showManage && <RowActions actions={promiseRowActions(p)} variant="table" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards — بديل الجدول على الهاتف (مكوّن موحّد) */}
      <MobileCardList>
        {filtered.map(p => {
          const meta =
            PROMISE_STATUS_META[p.status as PromiseStatus] ?? PROMISE_STATUS_META.pending;
          return (
            <MobileCardRow
              key={p.id}
              id={p.id}
              title={p.parties?.name ?? '—'}
              subtitle={p.promise_date}
              badge={<StatusBadge {...meta} />}
              meta={
                <span className="font-mono text-sm font-bold text-[var(--app-text)]" dir="ltr">
                  {formatCurrency(p.amount, p.currency_code)}
                </span>
              }
              body={p.notes ?? undefined}
              actions={
                showManage ? (
                  <RowActions actions={promiseRowActions(p)} variant="card" />
                ) : undefined
              }
            />
          );
        })}
      </MobileCardList>

      <PromiseFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        promise={editingPromise}
      />
    </div>
  );
};

export default PromisesPage;
