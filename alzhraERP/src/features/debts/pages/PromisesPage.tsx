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
  const { completePromise, deletePromise, breakOverduePromises } = useDebtMutations();
  // Write actions (create/edit/complete/delete/break) require debts:manage.
  const { hasPermission: canManage, isLoading: permissionLoading } = usePermission('debts:manage');
  const showManage = permissionLoading || canManage;

  // The query already filters by status server-side; keep a null-safe alias.
  const filtered = promises ?? [];

  return (
    <div className="space-y-4 max-md:space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); }}
              className={`px-3 max-md:px-2 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
                onClick={() => { breakOverduePromises(); }}
                className="inline-flex items-center gap-1.5 px-3 max-md:px-2 py-2 max-md:py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all"
              >
                <RefreshCcw size={13} /> كشف الوعود المتجاوزة
              </button>
              <button
                onClick={() => {
                  setEditingPromise(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 max-md:px-2 py-2 max-md:py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
              >
                <Plus size={14} /> وعد جديد
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 max-md:p-8 text-center text-sm text-[var(--app-text-secondary)]">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="p-14 max-md:p-6 text-center text-sm text-[var(--app-text-secondary)] border-2 border-dashed border-[var(--app-border)] rounded-2xl">
          لا توجد وعود في هذا التصنيف
        </div>
      ) : (
        <div className="hidden md:block overflow-x-auto bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] shadow-sm">
          <table className="w-full text-right">
            <thead>
              <tr className="text-[10px] font-bold text-[var(--app-text-secondary)] border-b border-[var(--app-border)] bg-[var(--app-surface-hover)]/50">
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">العميل</th>
                <th className="px-4 max-md:px-2 py-3 max-md:py-2 text-left">المبلغ</th>
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">تاريخ الوفاء</th>
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">الحالة</th>
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">ملاحظات</th>
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {filtered.map((p) => {
                const meta = PROMISE_STATUS_META[p.status as PromiseStatus] ?? PROMISE_STATUS_META.pending;
                return (
                  <tr key={p.id} className="hover:bg-[var(--app-surface-hover)] transition-colors">
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      <span className="text-xs font-bold text-[var(--app-text)]">
                        {p.parties?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      <span className="text-xs font-bold font-mono text-[var(--app-text)]" dir="ltr">
                        {formatCurrency(Number(p.amount), p.currency_code)}
                      </span>
                    </td>
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      <span className="text-xs font-mono text-[var(--app-text-secondary)]" dir="ltr">
                        {p.promise_date}
                      </span>
                    </td>
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      <StatusBadge {...meta} />
                    </td>
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      <span className="text-xs text-[var(--app-text-secondary)] line-clamp-1">
                        {p.notes ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      {showManage && (
                        <div className="flex items-center gap-1.5">
                          {p.status === 'pending' && (
                            <button
                              onClick={() => {
                                const confirmed = window.confirm(
                                  'سيتم إتمام الوعد بدون ربط سند قبض. هل المبلغ مسدَّد فعلياً؟'
                                );
                                if (confirmed) completePromise({ promiseId: p.id });
                              }}
                              title="إتمام الوعد (تم السداد)"
                              className="p-2 max-md:p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {p.status === 'pending' && (
                            <button
                              onClick={() => {
                                setEditingPromise(p);
                                setIsModalOpen(true);
                              }}
                              title="تعديل"
                              className="p-2 max-md:p-1.5 rounded-xl bg-sky-500/10 text-sky-600 hover:bg-sky-500 hover:text-white transition-all"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm('هل تريد حذف هذا الوعد نهائياً؟')) deletePromise(p.id);
                            }}
                            title="حذف"
                            className="p-2 max-md:p-1.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
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
        {filtered.map((p) => {
          const meta = PROMISE_STATUS_META[p.status as PromiseStatus] ?? PROMISE_STATUS_META.pending;
          return (
            <MobileCardRow
              key={p.id}
              id={p.id}
              title={p.parties?.name ?? '—'}
              subtitle={p.promise_date}
              badge={<StatusBadge {...meta} />}
              meta={
                <span className="text-sm font-bold font-mono text-[var(--app-text)]" dir="ltr">
                  {formatCurrency(Number(p.amount), p.currency_code)}
                </span>
              }
              body={p.notes || undefined}
              actions={
                showManage ? (
                  <>
                    {p.status === 'pending' && (
                      <button
                        onClick={() => {
                          const confirmed = window.confirm(
                            'سيتم إتمام الوعد بدون ربط سند قبض. هل المبلغ مسدَّد فعلياً؟'
                          );
                          if (confirmed) completePromise({ promiseId: p.id });
                        }}
                        title="إتمام الوعد (تم السداد)"
                        className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {p.status === 'pending' && (
                      <button
                        onClick={() => {
                          setEditingPromise(p);
                          setIsModalOpen(true);
                        }}
                        title="تعديل"
                        className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 hover:bg-sky-500 hover:text-white transition-all active:scale-90"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm('هل تريد حذف هذا الوعد نهائياً؟')) deletePromise(p.id);
                      }}
                      title="حذف"
                      className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : undefined
              }
            />
          );
        })}
      </MobileCardList>

      <PromiseFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); }}
        promise={editingPromise}
      />
    </div>
  );
};

export default PromisesPage;

