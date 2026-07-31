import React, {  useMemo, Suspense, lazy } from 'react';
// Fix: Corrected import path to point to the barrel file.
import { useJournalMutation, useAccountingView } from './hooks/index';
import { AccountingView } from './types/index';
import { Calculator, Plus, FileText,  Calendar, BookOpen,  Landmark, Layers, LayoutDashboard,  RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import MicroHeader from '../../ui/base/MicroHeader';
import PageLoader from '../../ui/base/PageLoader';
// import { cn } from '../../core/utils';
import { useTranslation } from '../../lib/hooks/useTranslation';
import FullscreenContainer from '../../ui/base/FullscreenContainer';
import { useState } from 'react';
import { cn } from '../../core/utils';

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

  const { createJournal, isCreating } = useJournalMutation();

  const handleCreate = (data: any) => {
    createJournal(data, { onSuccess: () => closeJournalModal() });
  };

  const TABS: { id: AccountingView; label: string; icon: any }[] = [
    { id: 'overview', label: t('accounting_overview'), icon: LayoutDashboard },
    { id: 'journal', label: t('journal'), icon: BookOpen },
    { id: 'treasury', label: t('treasury'), icon: Wallet },
    { id: 'ledger', label: t('ledger'), icon: BookOpen },
    { id: 'income', label: t('income_statement'), icon: FileText },
    { id: 'balance_sheet', label: t('balance_sheet_report'), icon: Landmark },
    { id: 'accounts', label: t('chart_of_accounts'), icon: Layers },
  ];

  const headerActions = (
    <div className="flex gap-1.5 print:hidden">
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
        <ShieldCheck size={14} className="text-emerald-600" />
        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Financial Core Active</span>
      </div>
      <button
        onClick={openJournalModal}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95 shadow-lg shadow-blue-500/20 transition-all"
      >
        <Plus size={14} strokeWidth={3} />
        <span className="hidden sm:inline uppercase tracking-tighter">{t('new_journal_entry')}</span>
      </button>
    </div>
  );

  const dateFilterRow = useMemo(() => {
    const showDateFilter = ['ledger', 'income', 'balance_sheet', 'treasury'].includes(activeView);
    if (!showDateFilter) return undefined;

    return (
      <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 px-3 py-2 rounded-xl border border-blue-100 dark:border-blue-900/20 w-full md:w-fit animate-in slide-in-from-top-1 duration-300">
        <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
          <Calendar size={14} />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-900 dark:text-blue-300 whitespace-nowrap uppercase tracking-tighter">
          <div className="flex items-center gap-1.5">
            <span>{t('from_date')}:</span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="bg-white dark:bg-slate-800 border-none rounded p-1 outline-none font-mono text-blue-600 dark:text-blue-400"
            />
          </div>
          <div className="w-px h-4 bg-blue-200 dark:bg-blue-800/50 mx-1"></div>
          <div className="flex items-center gap-1.5">
            <span>{t('to_date')}:</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="bg-white dark:bg-slate-800 border-none rounded p-1 outline-none font-mono text-blue-600 dark:text-blue-400"
            />
          </div>
        </div>
        <button className="p-1 text-blue-400 hover:text-blue-600 transition-colors">
          <RefreshCw size={12} />
        </button>
      </div>
    );
  }, [activeView, dateRange, setDateRange, t]);

  const renderContent = () => {
    switch (activeView) {
      case 'overview': return <AccountingOverview />;
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
      <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 font-cairo">
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
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-4 pt-5 md:pt-6 print-area animate-in slide-in-from-bottom-4 duration-500">
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
