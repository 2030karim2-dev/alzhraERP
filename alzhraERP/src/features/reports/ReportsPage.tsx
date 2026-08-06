import React, { useState, useMemo, lazy, Suspense } from 'react';
import {
  BarChart3, Scale, PieChart, Wallet, History,
  Droplets, ShoppingCart, TrendingDown, Clock,
  LayoutGrid, FileText, Activity, Layers
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
import { cn } from '../../core/utils';

// Lazy-loaded heavy chart components for code splitting
const ProfitLossView = lazy(() => import('./components/ProfitLossView'));
const InventoryMovementView = lazy(() => import('./components/InventoryMovementView'));
const CashFlowView = lazy(() => import('./components/CashFlowView'));

type ReportCategory = 'all' | 'sales' | 'financial' | 'accounting';

const reportLabels: Record<ReportTab, string> = {
  daily_sales: 'المبيعات اليومي',
  returns_report: 'تقرير المرتجعات',
  debt_report: 'debt_report',
  debt_aging: 'أعمار الديون',
  operational_expenses: 'المصاريف التشغيلية',
  trial_balance: 'trial_balance',
  p_and_l: 'profit_and_loss',
  balance_sheet: 'balance_sheet',
  currency_diff: 'currency_differences',
  item_movement: 'item_movement',
  cash_flow: 'cash_flow',
};

/** Lazy render map — components are only created when the tab becomes active */
const renderReportComponent = (tab: ReportTab): React.ReactNode => {
  const loadingFallback = <div className="p-10 text-center animate-pulse text-slate-400 text-sm">جاري تحميل التقرير...</div>;

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

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily_sales');
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('all');
  const [isMaximized, setIsMaximized] = useState(false);
  const { t } = useTranslation();

  const categories: { id: ReportCategory; label: string; icon: any; color: string }[] = [
    { id: 'all', label: 'الكل', icon: LayoutGrid, color: 'text-slate-500' },
    { id: 'sales', label: 'المبيعات والمخزون', icon: Activity, color: 'text-emerald-500' },
    { id: 'financial', label: 'القوائم المالية', icon: FileText, color: 'text-amber-500' },
    { id: 'accounting', label: 'المحاسبة والديون', icon: Layers, color: 'text-purple-500' },
  ];

  const allTabs: { id: ReportTab; label: string; icon: any; category: ReportCategory }[] = [
    { id: 'daily_sales', label: 'المبيعات اليومي', icon: ShoppingCart, category: 'sales' },
    { id: 'returns_report', label: 'تقرير المرتجعات', icon: History, category: 'sales' },
    { id: 'trial_balance', label: t('trial_balance'), icon: Scale, category: 'financial' },
    { id: 'item_movement', label: t('item_movement'), icon: History, category: 'sales' },
    { id: 'debt_report', label: t('debt_report'), icon: Wallet, category: 'accounting' },
    { id: 'debt_aging', label: 'أعمار الديون', icon: Clock, category: 'accounting' },
    { id: 'operational_expenses', label: 'المصاريف التشغيلية', icon: TrendingDown, category: 'accounting' },
    { id: 'cash_flow', label: t('cash_flow'), icon: Droplets, category: 'financial' },
    { id: 'currency_diff', label: t('currency_differences'), icon: PieChart, category: 'accounting' },
    { id: 'p_and_l', label: t('profit_and_loss'), icon: PieChart, category: 'financial' },
    { id: 'balance_sheet', label: t('balance_sheet'), icon: Wallet, category: 'financial' },
  ];

  const filteredTabs = useMemo(() => {
    if (activeCategory === 'all') return allTabs;
    return allTabs.filter(tab => tab.category === activeCategory);
  }, [activeCategory, allTabs]);

  return (
    <FullscreenContainer isMaximized={isMaximized} onToggleMaximize={() => { setIsMaximized(false); }} isZenMode={false}>
      <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300">
        <MicroHeader
          title={t('reports_center_title')}
          icon={BarChart3}
          tabs={filteredTabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as ReportTab)}
          isMaximized={isMaximized}
          onToggleMaximize={() => {
            setIsMaximized(!isMaximized);
          }}
          isZenMode={false}
          onToggleZen={() => { }}
          extraRow={
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap text-xs font-bold uppercase tracking-tight min-h-[40px] sm:min-h-[36px]",
                    activeCategory === cat.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105"
                      : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-400 active:scale-95"
                  )}
                >
                  <cat.icon size={14} className={activeCategory === cat.id ? "text-white" : cat.color} />
                  {cat.label}
                </button>
              ))}
            </div>
          }
        />

        {/* Visible tab count indicator */}
        <div className="text-center py-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50">
          {activeTab} ({filteredTabs.length}/{allTabs.length})
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative z-20">
          <div className="flex-1 overflow-y-auto px-2 md:px-4 pt-4 md:pt-5 pb-24 md:pb-28 custom-scrollbar">
            <div className="max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ReportErrorBoundary reportName={t(reportLabels[activeTab])}>
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