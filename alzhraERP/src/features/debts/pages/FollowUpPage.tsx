import React, { useState, useMemo } from 'react';
import { useDebtDashboard } from '../hooks/useDebtQueries';
import { debtsService } from '../services/debtService';
import FollowUpTabs from '../components/FollowUpTabs';
import FollowUpTable from '../components/FollowUpTable';
import type { FollowUpTab } from '../types';

const FollowUpPage: React.FC = () => {
  const { data: rows, isLoading } = useDebtDashboard();
  const [tab, setTab] = useState<FollowUpTab>('all');

  const filtered = useMemo(
    () => debtsService.filterByTab(rows ?? [], tab),
    [rows, tab]
  );

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
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="w-14 h-14 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-[10px] animate-pulse uppercase">
          جاري تصنيف الديون من الخادم...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FollowUpTabs active={tab} onChange={setTab} counts={counts} />
        <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
          {filtered.length} من {rows?.length ?? 0} عميل مدين
        </span>
      </div>

      <FollowUpTable rows={filtered} />
    </div>
  );
};

export default FollowUpPage;
