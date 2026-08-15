import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  BarChart3, Scale, Wallet, History,
  ShoppingCart, TrendingDown, Clock,
  LayoutGrid, Activity, Layers,
  Landmark, TrendingUp, ArrowRightLeft, DollarSign, Receipt
} from 'lucide-react';
import MicroHeader from '../../ui/base/MicroHeader';
import FullscreenContainer from '../../ui/base/FullscreenContainer';
import { ReportTab } from './types';
import DebtReportView from './components/DebtReportView';
import TrialBalanceView from './components/TrialBalanceView';
import BalanceSheetView from './components/BalanceSheetView';
import CurrencyDiffView from './components/CurrencyDiffView';
import ReturnsReportView from './components/ReturnsReportView';
import DailySalesReport from './components/DailySalesReport';
import OperationalExpensesReport from './components/OperationalExpensesReport';
import DebtAgingReport from './components/DebtAgingReport';
import ReportErrorBoundary from './components/ReportErrorBoundary';
import { useTranslation } from '../../lib/hooks/useTranslation';
import './reportStyles.css';

// Lazy-loaded heavy chart components for code splitting
const ProfitLossView = lazy(() => import('./components/ProfitLossView'));
const InventoryMovementView = lazy(() => import('./components/InventoryMovementView'));
const CashFlowView = lazy(() => import('./components/CashFlowView'));

type ReportCategory = 'all' | 'sales' | 'financial' | 'accounting';

/** Mapping from tab ID -> translation key for error boundary report name */
const reportLabelKeys: Record<ReportTab, string> = {
  daily_sales: 'daily_sales_report',
  returns_report: 'returns_report',
  debt_report: 'debt_report',
  debt_aging: 'debt_aging',
  operational_expenses: 'operational_expenses',
  trial_balance: 'trial_balance',
  p_and_l: 'profit_and_loss',
  balance_sheet: 'balance_sheet',
  currency_diff: 'currency_differences',
  item_movement: 'item_movement',
  cash_flow: 'cash_flow',
};


/** Skeleton loader matching report layout */
const ReportSkeleton: React.FC<{ type?: 'financial' | 'default' }> = ({ type = 'default' }) => (
  <div className="space-y-4 animate-in fade-in duration-300">
    <div className="flex items-center justify-between">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
      <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
    </div>
    <div className={`grid gap-3 ${type === 'financial' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
      {Array.from({ length: type === 'financial' ? 4 : 3 }).map((_, i) => (
        <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-2xl max-md:rounded-xl animate-pulse" />
      ))}
    </div>
    <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl max-md:rounded-xl animate-pulse" />
  </div>
);

/** Lazy render map */
const renderReportComponent = (tab: ReportTab): React.ReactNode => {
  const loadingFallback = <ReportSkeleton type={tab === 'p_and_l' || tab === 'balance_sheet' ? 'financial' : 'default'} />;

  switch (tab) {
    case 'daily_sales': return <DailySalesReport />;
    case 'returns_report': return <ReturnsReportView />;
    case 'debt_report': return <DebtReportView />;
    case 'debt_aging': return <DebtAgingReport />;
    case 'operational_expenses': return <OperationalExpensesReport />;
    case 'trial_balance': return <TrialBalanceView />;
    case 'p_and_l': return <Suspense fallback={loadingFallback}><ProfitLossView /></Suspense>;
    case 'balance_sheet': return <BalanceSheetView />;
    case 'currency_diff': return <CurrencyDiffView />;
    case 'item_movement': return <Suspense fallback={loadingFallback}><InventoryMovementView /></Suspense>;
    case 'cash_flow': return <Suspense fallback={loadingFallback}><CashFlowView /></Suspense>;
    default: return null;
  }
};

/** Persist last active tab to localStorage */
const TAB_STORAGE_KEY = 'reports_activeTab';
const CAT_STORAGE_KEY = 'reports_activeCategory';

const getStoredTab = (): ReportTab => {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return (stored as ReportTab) || 'daily_sales';
  } catch { return 'daily_sales'; }
};
const getStoredCategory = (): ReportCategory => {
  try {
    const stored = localStorage.getItem(CAT_STORAGE_KEY);
    return (stored as ReportCategory) || 'all';
  } catch { return 'all'; }
};

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>(getStoredTab);
  const [activeCategory, setActiveCategory] = useState<ReportCategory>(getStoredCategory);
  const [isMaximized, setIsMaximized] = useState(false);
  const { t } = useTranslation();

  const handleTabChange = useCallback((id: string) => {
    const tabId = id as ReportTab;
    setActiveTab(tabId);
    try { localStorage.setItem(TAB_STORAGE_KEY, tabId); } catch { /* noop */ }
  }, []);

  const handleCategoryChange = useCallback((catId: ReportCategory) => {
    setActiveCategory(catId);
    try { localStorage.setItem(CAT_STORAGE_KEY, catId); } catch { /* noop */ }
  }, []);

  const categories: { id: ReportCategory; label: string; icon: any; colorClass: string; activeClass: string }[] = [
    { id: 'all', label: t('reports_all'), icon: LayoutGrid, colorClass: 'text-slate-500', activeClass: 'bg-slate-600 text-white border-slate-600 shadow-lg shadow-slate-500/25' },
    { id: 'sales', label: t('reports_sales_inventory'), icon: Activity, colorClass: 'text-emerald-500', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/25' },
    { id: 'financial', label: t('reports_financial'), icon: Landmark, colorClass: 'text-blue-500', activeClass: 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25' },
    { id: 'accounting', label: t('reports_accounting'), icon: Layers, colorClass: 'text-amber-500', activeClass: 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-500/25' },
  ];

  const allTabs: { id: ReportTab; label: string; icon: any; category: ReportCategory }[] = [
    { id: 'daily_sales', label: t('daily_sales_report'), icon: ShoppingCart, category: 'sales' },
    { id: 'returns_report', label: t('returns_report'), icon: History, category: 'sales' },
    { id: 'item_movement', label: t('item_movement'), icon: ArrowRightLeft, category: 'sales' },
    { id: 'balance_sheet', label: t('balance_sheet'), icon: Landmark, category: 'financial' },
    { id: 'p_and_l', label: t('profit_and_loss'), icon: TrendingUp, category: 'financial' },
    { id: 'cash_flow', label: t('cash_flow'), icon: DollarSign, category: 'financial' },
    { id: 'trial_balance', label: t('trial_balance'), icon: Scale, category: 'financial' },
    { id: 'debt_report', label: t('debt_report'), icon: Wallet, category: 'accounting' },
    { id: 'debt_aging', label: t('debt_aging'), icon: Clock, category: 'accounting' },
    { id: 'operational_expenses', label: t('operational_expenses'), icon: TrendingDown, category: 'accounting' },
    { id: 'currency_diff', label: t('currency_differences'), icon: Receipt, category: 'accounting' },
  ];

  const filteredTabs = useMemo(() => {
    if (activeCategory === 'all') return allTabs;
    return allTabs.filter(tab => tab.category === activeCategory);
  }, [activeCategory, allTabs]);

  return (
    <FullscreenContainer isMaximized={isMaximized} onToggleMaximize={() => { setIsMaximized(false); }} isZenMode={false}>
      <div className="flex flex-col h-full bg-[var(--app-bg)] transition-colors duration-300">
        <MicroHeader
          title={t('reports_center_title')}
          icon={BarChart3}
          tabs={filteredTabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          enableKeyboardNav={true}
          isMaximized={isMaximized}
          onToggleMaximize={() => {
            setIsMaximized(!isMaximized);
          }}
          isZenMode={false}
          onToggleZen={() => { }}
          extraRow={
            <div className="flex items-center gap-1 max-md:gap-0.5 overflow-x-auto pb-1 max-md:pb-0 no-scrollbar">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                const pillClass = isActive
                  ? cat.activeClass + " scale-105"
                  : "bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:border-[var(--app-text-secondary)]/40 active:scale-95";
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`flex items-center gap-2 max-md:gap-1 px-4 max-md:px-2 py-2 max-md:py-1.5 rounded-full border transition-all whitespace-nowrap text-xs max-md:text-[10px] font-bold uppercase tracking-tight min-h-[40px] sm:min-h-[36px] max-md:min-h-[32px] ${pillClass}`}
                  >
                    <cat.icon size={14} className={isActive ? "text-white" : cat.colorClass} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          }
        />

        {import.meta.env.DEV && (
          <div className="text-center py-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50">
            {activeTab} ({filteredTabs.length}/{allTabs.length})
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col relative z-20">
          <div className="flex-1 overflow-y-auto px-4 max-md:px-2 md:px-6 pt-3 max-md:pt-2 md:pt-5 pb-4 max-md:pb-3 md:pb-8 custom-scrollbar">
            <div className="max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ReportErrorBoundary reportName={t(reportLabelKeys[activeTab])}>
                {renderReportComponent(activeTab)}
              </ReportErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </FullscreenContainer>
  );
};

export default ReportsPage;
