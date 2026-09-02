import React, { useMemo, Suspense, lazy } from 'react';
// Fix: Corrected import path to point to the barrel file.
import { useJournalMutation, useAccountingView } from './hooks/index';
import type { AccountingView } from './types/index';
import {
  Calculator,
  Plus,
  FileText,
  Calendar,
  BookOpen,
  Landmark,
  Layers,
  LayoutDashboard,
  RefreshCw,
  Wallet,
} from 'lucide-react';
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
    createJournal(data, {
      onSuccess: () => {
        closeJournalModal();
      },
    });
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

  const TABS: Array<{ id: AccountingView; label: string; icon: LucideIcon }> = [
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
        className="hidden uppercase tracking-tighter sm:inline-flex"
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
      <div className="animate-in slide-in-from-top-1 flex w-full items-center gap-2 rounded-[var(--radius)] border border-blue-100 bg-blue-50 px-2 py-1.5 duration-300 dark:border-blue-900/20 dark:bg-blue-900/10 max-md:gap-1 max-md:px-1.5 max-md:py-1 md:w-fit">
        <div className="rounded-md bg-blue-600 p-1.5 text-white">
          <Calendar size={14} />
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-tight text-blue-900 dark:text-blue-300 max-md:gap-0.5 max-md:text-[10px]">
          <div className="flex items-center gap-1.5">
            <span>{t('from_date')}:</span>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => {
                setDateRange(prev => ({ ...prev, from: e.target.value }));
              }}
              className="rounded border-none bg-[var(--app-surface)] p-1 font-mono text-blue-600 outline-none dark:text-blue-400 max-md:p-0.5 max-md:text-[10px]"
            />
          </div>
          <div className="mx-1 h-4 w-px bg-blue-200 dark:bg-blue-800/50"></div>
          <div className="flex items-center gap-1.5">
            <span>{t('to_date')}:</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => {
                setDateRange(prev => ({ ...prev, to: e.target.value }));
              }}
              className="rounded border-none bg-[var(--app-surface)] p-1 font-mono text-blue-600 outline-none dark:text-blue-400 max-md:p-0.5 max-md:text-[10px]"
            />
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="تحديث البيانات"
          className="p-1 text-blue-400 transition-colors hover:text-blue-600 disabled:opacity-50"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    );
  }, [activeView, dateRange, setDateRange, t, isRefreshing]);

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <AccountingOverview onNewJournal={openJournalModal} />;
      case 'journal':
        return <JournalTable />;
      case 'accounts':
        return <AccountsTable />;
      case 'treasury':
        return <TreasuryView dateRange={dateRange} />;
      case 'ledger':
        return <LedgerView dateRange={dateRange} />;
      case 'income':
        return <IncomeStatement dateRange={dateRange} />;
      case 'balance_sheet':
        return <BalanceSheet dateRange={dateRange} />;
      default:
        return <AccountingOverview />;
    }
  };

  return (
    <FullscreenContainer
      isMaximized={isMaximized}
      onToggleMaximize={() => {
        setIsMaximized(false);
        setIsZenMode(false);
      }}
      isZenMode={isZenMode}
    >
      <div className="font-cairo flex h-full flex-col bg-[var(--app-bg)]">
        <MicroHeader
          title={t('accounting_center_title')}
          icon={Calculator}
          actions={headerActions}
          tabs={TABS}
          activeTab={activeView}
          onTabChange={id => {
            setActiveView(id as AccountingView);
          }}
          extraRow={dateFilterRow}
          isMaximized={isMaximized}
          onToggleMaximize={() => {
            setIsMaximized(!isMaximized);
            if (isMaximized) setIsZenMode(false);
          }}
          isZenMode={isZenMode}
          onToggleZen={() => {
            setIsZenMode(!isZenMode);
          }}
        />

        <div
          className={cn(
            'relative z-20 flex flex-1 flex-col overflow-hidden',
            isZenMode ? 'bg-[var(--app-surface)]' : ''
          )}
        >
          <Suspense fallback={<PageLoader />}>
            <div className="custom-scrollbar print-area animate-in slide-in-from-bottom-4 flex-1 overflow-y-auto p-2 pt-3 duration-500 max-md:p-1 max-md:pt-1.5 md:p-4 md:pt-6">
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
