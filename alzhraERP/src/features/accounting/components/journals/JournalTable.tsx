import React, { useState, useMemo } from 'react';
import { Search, Calendar, RotateCcw, X, Filter } from 'lucide-react';
import { useJournals } from '../../hooks/useJournals';
import JournalEntryRow, { TRANSACTION_TYPE_LABELS } from './JournalEntryRow';
import { formatNumberDisplay } from '../../../../core/utils';
import MobileCardList, { MobileCardRow } from '../../../../ui/base/MobileCardList';
import type { UIJournalEntry, UIJournalLine } from '../../types/models';
import type { DatePreset } from '../../../../core/types/invoiceSearch';
import { getDateRangeForPreset } from '../../../../core/utils/dateUtils';

const JOURNAL_DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'today', label: 'اليوم' },
  { id: 'this_week', label: 'آخر 7 أيام' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر الماضي' },
  { id: 'custom', label: 'مخصص' },
];

const JournalTable: React.FC = () => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useJournals();
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const journals: UIJournalEntry[] = useMemo(() => data?.pages?.flat() || [], [data]);

  const getEntryTotal = (j: UIJournalEntry): number => {
    return (j.journal_entry_lines || []).reduce(
      (sum: number, l: UIJournalLine) => sum + (l.debit_amount || 0),
      0
    );
  };

  // Filter & Sort Logic
  const filteredJournals = useMemo(() => {
    if (!journals.length) return [];

    let result = [...journals];

    // 1. Search
    if (searchTerm && searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        j =>
          j.description?.toLowerCase().includes(lowerTerm) ||
          j.entry_number?.toString().includes(lowerTerm) ||
          j.journal_entry_lines?.some(
            (l: UIJournalLine) =>
              l.description?.toLowerCase().includes(lowerTerm) ||
              l.account?.name?.toLowerCase().includes(lowerTerm) ||
              l.account?.name_ar?.toLowerCase().includes(lowerTerm) ||
              l.account?.code?.toLowerCase().includes(lowerTerm)
          )
      );
    }

    // 2. Transaction Type filter
    if (typeFilter !== 'all') {
      result = result.filter(j => {
        const t = j.reference_type || '';
        if (typeFilter === 'sale') return t === 'sale' || t === 'invoice' || t === 'sale_return';
        if (typeFilter === 'purchase')
          return t === 'purchase' || t === 'bill' || t === 'purchase_return';
        if (typeFilter === 'receipt')
          return t === 'receipt' || t === 'receipt_voucher' || t === 'receipt_bond';
        if (typeFilter === 'payment')
          return t === 'payment' || t === 'payment_voucher' || t === 'payment_bond';
        if (typeFilter === 'expense') return t === 'expense' || t === 'expenses';
        if (typeFilter === 'manual') return t === 'manual' || t === 'journal' || !t;
        return t === typeFilter;
      });
    }

    // 3. Date Range
    if (dateFrom) {
      result = result.filter(j => (j.entry_date || '') >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(j => (j.entry_date || '') <= dateTo);
    }

    // 4. Multi-field Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'amount') {
        cmp = getEntryTotal(a) - getEntryTotal(b);
      } else if (sortBy === 'number') {
        const numA = String(a.entry_number || '');
        const numB = String(b.entry_number || '');
        cmp = numA.localeCompare(numB, undefined, { numeric: true });
      } else {
        const dateA = new Date(a.entry_date).getTime() || 0;
        const dateB = new Date(b.entry_date).getTime() || 0;
        cmp = dateA - dateB;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [journals, searchTerm, typeFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const hasActiveFilters = Boolean(
    (searchTerm && searchTerm.trim() !== '') ||
    typeFilter !== 'all' ||
    datePreset !== 'all' ||
    dateFrom ||
    dateTo ||
    sortBy !== 'date' ||
    sortOrder !== 'desc'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setDatePreset('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortBy('date');
    setSortOrder('desc');
  };

  if (isLoading)
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-24 animate-pulse border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm"
          />
        ))}
      </div>
    );

  return (
    <div className="animate-in fade-in space-y-4 pb-20 duration-500">
      {/* Controls Bar */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs">
        {/* Row 1: Search & Controls */}
        <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
          <div className="relative w-full md:flex-1">
            <Search
              className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)]"
              size={16}
            />
            <input
              type="text"
              placeholder="بحث برقم القيد، الوصف، أو اسم الحساب..."
              className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] pe-9 ps-3 text-xs font-semibold text-[var(--app-text)] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                }}
                className="absolute inset-y-0 end-8 flex items-center pe-1 text-[var(--app-text-secondary)] hover:text-rose-500"
                title="مسح البحث"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            {/* Transaction Type Filter */}
            <select
              value={typeFilter}
              onChange={e => {
                setTypeFilter(e.target.value);
              }}
              aria-label="تصفية حسب نوع القيد"
              className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 text-xs font-bold text-[var(--app-text)] outline-none focus:border-blue-500"
            >
              <option value="all">كل المعاملات</option>
              <option value="manual">قيود يدوية / عامة</option>
              <option value="sale">مبيعات ومردوداتها</option>
              <option value="purchase">مشتريات ومردوداتها</option>
              <option value="receipt">سندات قبض</option>
              <option value="payment">سندات صرف</option>
              <option value="expense">مصروفات</option>
            </select>

            {/* Sort Selector */}
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={e => {
                const [by, order] = e.target.value.split('_');
                setSortBy(by as 'date' | 'amount' | 'number');
                setSortOrder(order as 'asc' | 'desc');
              }}
              aria-label="ترتيب وفرز القيود"
              className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 text-xs font-bold text-[var(--app-text)] outline-none focus:border-blue-500"
            >
              <option value="date_desc">الأحدث تاريخاً / وقتاً</option>
              <option value="date_asc">الأقدم تاريخاً</option>
              <option value="amount_desc">الأعلى مبلغاً</option>
              <option value="amount_asc">الأقل مبلغاً</option>
              <option value="number_desc">رقم القيد (تنازلي)</option>
              <option value="number_asc">رقم القيد (تصاعدي)</option>
            </select>

            <div className="flex h-9 items-center rounded-lg bg-blue-50 px-2.5 font-mono text-xs font-bold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              {filteredJournals.length} قيود
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex h-9 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                title="إعادة تعيين الفلاتر"
              >
                <RotateCcw size={13} />
                <span>مسح</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Date Presets */}
        <div className="border-[var(--app-border)]/60 flex flex-wrap items-center gap-1 border-t pt-2">
          <span className="me-1 flex items-center gap-1 text-[11px] font-bold text-[var(--app-text-secondary)]">
            <Calendar size={12} />
            <span>الفترة:</span>
          </span>
          {JOURNAL_DATE_PRESETS.map(preset => {
            const isActive = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDatePreset(preset.id);
                  const range = getDateRangeForPreset(preset.id);
                  setDateFrom(range.from);
                  setDateTo(range.to);
                }}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Row 3: Custom Date Range (if selected) */}
        {datePreset === 'custom' && (
          <div className="border-[var(--app-border)]/60 flex flex-wrap items-center gap-2 border-t pt-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-[var(--app-text-secondary)]">
                من تاريخ:
              </label>
              <input
                type="date"
                value={dateFrom || ''}
                onChange={e => {
                  setDateFrom(e.target.value);
                }}
                className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-[var(--app-text-secondary)]">
                إلى تاريخ:
              </label>
              <input
                type="date"
                value={dateTo || ''}
                onChange={e => {
                  setDateTo(e.target.value);
                }}
                className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Journals Table */}
      <div className="overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <div className="scroll-x-hint-surface hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--app-surface-hover)] font-bold text-[var(--app-text)] shadow-sm">
              <tr>
                <th className="w-10 border border-[var(--app-border)] px-2 py-3 text-center">#</th>
                <th className="w-24 border border-[var(--app-border)] px-3 py-3 text-center">
                  رقم القيد
                </th>
                <th className="w-32 border border-[var(--app-border)] px-3 py-3 text-center">
                  التاريخ
                </th>
                <th className="w-24 border border-[var(--app-border)] px-3 py-3 text-center">
                  نوع المعاملة
                </th>
                <th className="w-32 border border-[var(--app-border)] px-3 py-3 text-center">
                  المستخدم
                </th>
                <th className="min-w-[200px] border border-[var(--app-border)] px-3 py-3 text-right">
                  البيان / الشرح
                </th>
                <th className="w-32 border border-[var(--app-border)] px-3 py-3 text-center">
                  إجمالي مدين
                </th>
                <th className="w-32 border border-[var(--app-border)] px-3 py-3 text-center">
                  إجمالي دائن
                </th>
                <th className="w-24 border border-[var(--app-border)] px-3 py-3 text-center">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {filteredJournals.length > 0 ? (
                filteredJournals.map((journal: UIJournalEntry) => (
                  <JournalEntryRow key={journal.id} entry={journal} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-[var(--app-text-secondary)] max-md:p-4"
                  >
                    <Filter
                      className="mx-auto mb-2 text-[var(--app-text-secondary)] opacity-40"
                      size={32}
                    />
                    <p>لا توجد قيود تطابق البحث</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards — بديل الجدول على الهاتف (مكوّن موحّد) */}
        <MobileCardList
          isEmpty={filteredJournals.length === 0}
          emptyMessage="لا توجد قيود تطابق البحث"
        >
          {filteredJournals.map((journal: UIJournalEntry) => {
            const totalDebit = (journal.journal_entry_lines || []).reduce(
              (s: number, l: UIJournalLine) => s + (l.debit_amount || 0),
              0
            );
            const totalCredit = (journal.journal_entry_lines || []).reduce(
              (s: number, l: UIJournalLine) => s + (l.credit_amount || 0),
              0
            );
            const statusMeta =
              journal.status === 'posted'
                ? { label: 'مرحل', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' }
                : journal.status === 'void'
                  ? { label: 'ملغى', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' }
                  : { label: 'مسودة', cls: 'bg-slate-500/10 text-[var(--app-text-secondary)]' };
            return (
              <MobileCardRow
                key={journal.id}
                id={journal.id}
                title={journal.description}
                subtitle={journal.entry_number ? `#${journal.entry_number}` : undefined}
                badge={
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.cls}`}
                  >
                    {statusMeta.label}
                  </span>
                }
                meta={
                  <>
                    <span>{journal.entry_date}</span>
                    <span className="font-bold text-[var(--app-text)]">
                      {journal.reference_type
                        ? TRANSACTION_TYPE_LABELS[journal.reference_type] || journal.reference_type
                        : 'يدوي'}
                    </span>
                    <span
                      className="max-w-[120px] truncate"
                      title={journal.created_by_profile?.full_name || 'System'}
                    >
                      {journal.created_by_profile?.full_name || 'System'}
                    </span>
                    <span>{(journal.journal_entry_lines || []).length} سطور</span>
                  </>
                }
                body={
                  journal.party_name ? (
                    <span className="block text-[11px] text-[var(--app-text-secondary)]">
                      {journal.party_name}
                    </span>
                  ) : undefined
                }
                actions={
                  <>
                    <div className="flex-1 rounded-lg bg-emerald-500/5 px-2 py-1.5">
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        مدين
                      </p>
                      <p
                        className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400"
                        dir="ltr"
                      >
                        {formatNumberDisplay(totalDebit)}
                      </p>
                    </div>
                    <div className="flex-1 rounded-lg bg-rose-500/5 px-2 py-1.5">
                      <p className="text-[10px] font-bold text-red-700 dark:text-red-400">دائن</p>
                      <p
                        className="font-mono text-xs font-bold text-red-700 dark:text-red-400"
                        dir="ltr"
                      >
                        {formatNumberDisplay(totalCredit)}
                      </p>
                    </div>
                  </>
                }
              />
            );
          })}
        </MobileCardList>

        {hasNextPage && (
          <div className="border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] p-4 text-center max-md:p-3">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="rounded-[var(--radius)] bg-blue-100 px-6 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60 max-md:px-3"
            >
              {isFetchingNextPage ? 'جاري التحميل...' : 'تحميل المزيد'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalTable;
