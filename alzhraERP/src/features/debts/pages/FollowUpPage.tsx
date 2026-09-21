import React, { useState, useMemo } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { useDebtDashboard } from '../hooks/useDebtQueries';
import { debtsService } from '../services/debtService';
import { usePermission } from '../../../core/hooks/usePermission';
import FollowUpTabs from '../components/FollowUpTabs';
import FollowUpTable from '../components/FollowUpTable';
import type { FollowUpTab } from '../types';

const FollowUpPage: React.FC = () => {
  const { data: rows, isLoading } = useDebtDashboard();
  const [tab, setTab] = useState<FollowUpTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'amount' | 'overdue' | 'name'>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Reminders require debts:remind, payment promises require debts:manage.
  const { hasPermission: canManage, isLoading: manageLoading } = usePermission('debts:manage');
  const { hasPermission: canRemind, isLoading: remindLoading } = usePermission('debts:remind');
  const showManage = manageLoading || canManage;
  const showRemind = remindLoading || canRemind;

  // 1. Tab filtering
  const tabFiltered = useMemo(() => debtsService.filterByTab(rows ?? [], tab), [rows, tab]);

  // 2. Deep filtering & sorting
  const finalRows = useMemo(() => {
    let result = [...tabFiltered];

    // Search filter
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        r =>
          (r.party_name || '').toLowerCase().includes(term) ||
          (r.party_phone || '').toLowerCase().includes(term)
      );
    }

    // Currency filter
    if (currencyFilter !== 'all') {
      result = result.filter(
        r => (r.currency_code || '').toUpperCase() === currencyFilter.toUpperCase()
      );
    }

    // Multi-field Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'overdue') {
        const daysA = Number(a.days_overdue ?? 0);
        const daysB = Number(b.days_overdue ?? 0);
        cmp = daysA - daysB;
      } else if (sortBy === 'name') {
        cmp = (a.party_name || '').localeCompare(b.party_name || '', 'ar');
      } else {
        // default: amount (outstanding_balance)
        const dueA = Number(a.outstanding_balance ?? 0);
        const dueB = Number(b.outstanding_balance ?? 0);
        cmp = dueA - dueB;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [tabFiltered, searchTerm, currencyFilter, sortBy, sortOrder]);

  const hasActiveFilters = Boolean(
    (searchTerm && searchTerm.trim() !== '') ||
    currencyFilter !== 'all' ||
    sortBy !== 'amount' ||
    sortOrder !== 'desc'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setCurrencyFilter('all');
    setSortBy('amount');
    setSortOrder('desc');
  };

  const counts = useMemo(() => {
    const all = rows ?? [];
    return {
      all: all.length,
      needs_reminder: debtsService.filterByTab(all, 'needs_reminder').length,
      reminded: debtsService.filterByTab(all, 'reminded').length,
      overdue: debtsService.filterByTab(all, 'overdue').length,
      today: debtsService.filterByTab(all, 'today').length,
    };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-20 max-md:p-8">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        <p className="animate-pulse text-[10px] font-bold uppercase text-slate-400">
          جاري تصنيف الديون من الخادم...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-md:space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FollowUpTabs active={tab} onChange={setTab} counts={counts} />
        <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
          {finalRows.length} من {rows?.length ?? 0} عميل مدين
        </span>
      </div>

      {/* Deep Filtering & Sorting Toolbar */}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs md:flex-row md:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-[var(--app-text-secondary)]">
            <Search size={15} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم العميل أو رقم الهاتف..."
            className="focus:outline-hidden h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] pe-9 ps-9 text-xs font-semibold text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 end-0 flex items-center pe-2.5 text-[var(--app-text-secondary)] hover:text-rose-500"
              title="مسح البحث"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Currency Filter */}
        <select
          value={currencyFilter}
          onChange={e => setCurrencyFilter(e.target.value)}
          aria-label="تصفية حسب العملة"
          className="focus:outline-hidden h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
        >
          <option value="all">كل العملات</option>
          <option value="SAR">ريال سعودي (SAR)</option>
          <option value="YER">ريال يمني (YER)</option>
          <option value="USD">دولار أمريكي (USD)</option>
          <option value="OMR">ريال عماني (OMR)</option>
          <option value="CNY">يوان صيني (CNY)</option>
        </select>

        {/* Sort Selector */}
        <select
          value={`${sortBy}_${sortOrder}`}
          onChange={e => {
            const [by, order] = e.target.value.split('_');
            setSortBy(by as 'amount' | 'overdue' | 'name');
            setSortOrder(order as 'asc' | 'desc');
          }}
          aria-label="ترتيب وفرز الديون"
          className="focus:outline-hidden h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
        >
          <option value="amount_desc">الأعلى مديونية</option>
          <option value="amount_asc">الأقل مديونية</option>
          <option value="overdue_desc">الأكثر تأخيراً (أيام الاستحقاق)</option>
          <option value="overdue_asc">الأقل تأخيراً</option>
          <option value="name_asc">الاسم (أبجدياً)</option>
        </select>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
            title="إعادة تعيين الفلاتر"
          >
            <RotateCcw size={13} />
            <span>مسح الفلاتر</span>
          </button>
        )}
      </div>

      <FollowUpTable rows={finalRows} canManage={showManage} canRemind={showRemind} />
    </div>
  );
};

export default FollowUpPage;
