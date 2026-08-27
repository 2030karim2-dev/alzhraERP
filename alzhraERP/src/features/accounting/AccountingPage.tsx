import React, {  useMemo, Suspense, lazy } from 'react';
// Fix: Corrected import path to point to the barrel file.
import { useJournalMutation, useAccountingView } from './hooks/index';
import { AccountingView } from './types/index';
import { Calculator, Plus, FileText,  Calendar, BookOpen,  Landmark, Layers, LayoutDashboard,  RefreshCw, Wallet } from 'lucide-react';
import MicroHeader from '../../ui/base/MicroHeader';
import PageLoader from '../../ui/base/PageLoader';
import { useTranslation } from '../../lib/hooks/useTranslation';
import FullscreenContainer from '../../ui/base/FullscreenContainer';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../../core/utils';
import type { LucideIcon } from 'lucide-react';
import { DOMAIN_KEYS } from '../../lib/invalidation';
import type { JournalEntryFormData } from './types/models';
import Button from '../../ui/base/Button';

// إبطال موجّه لمفاتيح صفحة المحاسبة ذاتها فقط — بدل الإبطال الشامل لكاش التطبيق كله.
// (نفس تغطية preset «journal» من lib/invalidation + مفاتيح الخزينة والتقارير المحاسبية.)
const REFRESH_KEYS: readonly string[] = [
  ...new Set<string>([
    ...DOMAIN_KEYS.accounting,
    ...DOMAIN_KEYS.dashboard,
    ...DOMAIN_KEYS.reports,
    'ledger',
    'trial_balance',
    'financials',
    'audit_journals',
    'cashboxes',
    'exchange_companies',
  ]),
];

// Lazy loading for components
const AccountingOverview = lazy(() => import('./components/layout/AccountingOverview'));
const JournalTable = lazy(() => import('./components/journals/JournalTable'));
const AccountsTable = lazy(() => import('./components/accounts/AccountsTable'));
const TreasuryView = lazy(() => import('./components/treasury/TreasuryView'));
const LedgerView = lazy(() => import('./components/reports/LedgerView'));
const IncomeStatement = lazy(() => import('./components/reports/IncomeStatement'));
const BalanceSheet = lazy(() => import('./components/reports/BalanceSheet'));
const AddJournalEntryModal = lazy(() => import('./components/journals/AddJournalEntryModal'));

const AccountingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const {
    activeView,
    setActiveView,
    isModalOpen,
    openJournalModal,
    closeJournalModal,
    dateRange,
    setDateRange,
  } = useAccountingView();
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { createJournal, isCreating } = useJournalMutation();

  const handleCreate = (data: JournalEntryFormData) => {
    createJournal(data, { onSuccess: () => closeJournalModal() });
  };

  // ينتظر اكتمال عمليات الإبطال/إعادة الجلب فعلياً — لا تأخير اصطناعي بعد الآن
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all(
        REFRESH_KEYS.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const TABS: { id: AccountingView; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: t('accounting_overview'), icon: LayoutDashboard },
    { id: 'journal', label: t('journal'), icon: BookOpen },
    { id: 'treasury', label: t('treasury'), icon: Wallet },
    { id: 'ledger', label: t('ledger'), icon: BookOpen },
    { id: 'income', label: t('income_statement'), icon: FileText },
    { id: 'balance_sheet', label: t('balance_sheet_report'), icon: Landmark },
    { id: 'accounts', label: t('chart_of_accounts'), icon: Layers },
  ];

  const headerActions = (
    <div className="flex gap-2 print:hidden">
      <Button
        onClick={openJournalModal}
        variant="primary"
        size="sm"
        leftIcon={<Plus size={14} strokeWidth={3} />}
        className="hidden sm:inline-flex uppercase tracking-tighter"
      >
        {t('new_journal_entry')}
      </Button>
      <Button
        onClick={openJournalModal}
        variant="primary"
        size="sm"
        aria-label={t('new_journal_entry')}
        leftIcon={<Plus size={14} strokeWidth={3} />}
        className="sm:hidden"
      />
    </div>
  );

  const dateFilterRow = useMemo(() => {
    const showDateFilter = ['ledger', 'income', 'balance_sheet', 'treasury'].includes(activeView);
    if (!showDateFilter) return undefined;

    return (
      <div className="flex items-center gap-2 max-md:gap-1 bg-blue-50 dark:bg-blue-900/10 px-2 py-1.5 max-md:px-1.5 max-md:py-1 rounded-[var(--radius)] border border-blue-100 dark:border-blue-900/20 w-full md:w-fit animate-in slide-in-from-top-1 duration-300">
        <div className="p-1.5 bg-blue-600 text-white rounded-md">
          <Calendar size={14} />
        </div>
        <div className="flex items-center gap-1 max-md:gap-0.5 text-[10px] max-md:text-[9px] font-bold text-blue-900 dark:text-blue-300 whitespace-nowrap uppercase tracking-tight">
          <div className="flex items-center gap-1.5">
            <span>{t('from_date')}:</span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="bg-[var(--app-surface)] border-none rounded p-1 max-md:p-0.5 outline-none font-mono text-blue-600 dark:text-blue-400 max-md:text-[10px]"
            />
          </div>
          <div className="w-px h-4 bg-blue-200 dark:bg-blue-800/50 mx-1"></div>
          <div className="flex items-center gap-1.5">
            <span>{t('to_date')}:</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="bg-[var(--app-surface)] border-none rounded p-1 max-md:p-0.5 outline-none font-mono text-blue-600 dark:text-blue-400 max-md:text-[10px]"
            />
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="تحديث البيانات"
          className="p-1 text-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>
    );
  }, [activeView, dateRange, setDateRange, t, isRefreshing]);

  const renderContent = () => {
    switch (activeView) {
      case 'overview': return <AccountingOverview onNewJournal={openJournalModal} />;
      case 'journal': return <JournalTable />;
      case 'accounts': return <AccountsTable />;
      case 'treasury': return <TreasuryView dateRange={dateRange} />;
      case 'ledger': return <LedgerView dateRange={dateRange} />;
      case 'income': return <IncomeStatement dateRange={dateRange} />;
      case 'balance_sheet': return <BalanceSheet dateRange={dateRange} />;
      default: return <AccountingOverview />;
    }
  };

  return (
    <FullscreenContainer isMaximized={isMaximized} onToggleMaximize={() => { setIsMaximized(false); setIsZenMode(false); }} isZenMode={isZenMode}>
      <div className="flex flex-col h-full bg-[var(--app-bg)] font-cairo">
        <MicroHeader
          title={t('accounting_center_title')}
          icon={Calculator}
          actions={headerActions}
          tabs={TABS}
          activeTab={activeView}
          onTabChange={(id) => setActiveView(id as AccountingView)}
          extraRow={dateFilterRow}
          isMaximized={isMaximized}
          onToggleMaximize={() => {
            setIsMaximized(!isMaximized);
            if (isMaximized) setIsZenMode(false);
          }}
          isZenMode={isZenMode}
          onToggleZen={() => setIsZenMode(!isZenMode)}
        />

      <div className={cn(
        "flex-1 overflow-hidden flex flex-col relative z-20",
        isZenMode ? "bg-white dark:bg-slate-900" : ""
      )}>
        <Suspense fallback={<PageLoader />}>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 max-md:p-1 md:p-4 pt-3 max-md:pt-1.5 md:pt-6 print-area animate-in slide-in-from-bottom-4 duration-500">
             {renderContent()}
          </div>
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <AddJournalEntryModal
          isOpen={isModalOpen}
          onClose={closeJournalModal}
          onSubmit={handleCreate}
          isSubmitting={isCreating}
        />
      </Suspense>
    </div>
    </FullscreenContainer>
  );
};

export default AccountingPage;
