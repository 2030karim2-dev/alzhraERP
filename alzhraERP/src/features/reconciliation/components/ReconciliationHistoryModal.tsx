import React, { useState, useMemo } from 'react';
import { History, Calendar, ArrowUpRight, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { formatCurrency } from '../../../core/utils';
import type { ExistingReconciliationRecord } from '../types';

interface ReconciliationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  historyList?: ExistingReconciliationRecord[] | undefined;
  isLoading?: boolean | undefined;
  currency?: string | undefined;
}

export const ReconciliationHistoryModal: React.FC<ReconciliationHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  historyList = [],
  isLoading = false,
  currency = 'SAR',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyList;
    const q = searchQuery.trim().toLowerCase();
    return historyList.filter(
      row => row.reconciliation_date.includes(q) || (row.notes || '').toLowerCase().includes(q)
    );
  }, [historyList, searchQuery]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={History}
      title="أرشيف وسجل مطابقات الأيام السابقة"
      description="استعراض الإقفالات المعتمدة، ومقارنة فروقات الكاش والشبكة عبر الفترات"
      size="3xl"
    >
      <div className="space-y-4">
        {/* Search & Stats Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="البحث بتاريخ معين (مثال: 2026-09)..."
              className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] pl-3 pr-9 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)] focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="text-xs font-semibold text-[var(--app-text-secondary)]">
            إجمالي السجلات:{' '}
            <span className="font-bold text-[var(--app-text)]">{filteredHistory.length}</span>
          </div>
        </div>

        {/* History Table */}
        <div className="max-h-[60vh] overflow-x-auto rounded-lg border border-[var(--app-border)]">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-secondary)]">
              <tr>
                <th className="px-3 py-2.5 font-bold">تاريخ اليومية</th>
                <th className="px-3 py-2.5 font-bold">إجمالي المبيعات</th>
                <th className="px-3 py-2.5 font-bold">كاش الدرج</th>
                <th className="px-3 py-2.5 font-bold">فارق الكاش</th>
                <th className="px-3 py-2.5 font-bold">فارق الشبكة</th>
                <th className="px-3 py-2.5 font-bold">المسلم للمالك</th>
                <th className="px-3 py-2.5 text-center font-bold">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)] bg-[var(--app-card-bg)]">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-xs text-[var(--app-text-secondary)]"
                  >
                    جاري تحميل سجل المطابقات...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-xs text-[var(--app-text-secondary)]"
                  >
                    لا توجد مطابقات محفوظة تطابق البحث
                  </td>
                </tr>
              ) : (
                filteredHistory.map(row => {
                  const isCashBalanced = row.cash_variance === 0;
                  const isCashSurplus = row.cash_variance > 0;
                  const isCardBalanced = row.card_variance === 0;

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-[var(--app-hover)]">
                      <td className="px-3 py-2.5 font-bold text-[var(--app-text)]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          <span>{row.reconciliation_date}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[var(--app-text)]">
                        {formatCurrency(row.total_sales, currency)}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--app-text)]">
                        {formatCurrency(row.actual_cash_counted, currency)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                            isCashBalanced
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : isCashSurplus
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isCashBalanced ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              مطابق
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              {isCashSurplus
                                ? `+${formatCurrency(row.cash_variance, currency)}`
                                : formatCurrency(row.cash_variance, currency)}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            isCardBalanced
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isCardBalanced ? '✓ مطابق' : formatCurrency(row.card_variance, currency)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.cash_handed_to_owner, currency)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            onSelectDate(row.reconciliation_date);
                            onClose();
                          }}
                          className="h-7 gap-1 px-2 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          <span>عرض اليومية</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
