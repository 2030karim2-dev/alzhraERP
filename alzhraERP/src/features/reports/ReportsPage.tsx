import React, { useState, useMemo } from 'react';
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
import ProfitLossView from './components/ProfitLossView';
import BalanceSheetView from './components/BalanceSheetView';
import CurrencyDiffView from './components/CurrencyDiffView';
import InventoryMovementView from './components/InventoryMovementView';
import ReturnsReportView from './components/ReturnsReportView';
import CashFlowView from './components/CashFlowView';
import DailySalesReport from './components/DailySalesReport';
import OperationalExpensesReport from './components/OperationalExpensesReport';
import DebtAgingReport from './components/DebtAgingReport';
import { useTranslation } from '../../lib/hooks/useTranslation';
import './reportStyles.css';
import { cn } from '../../core/utils';

type ReportCategory = 'all' | 'ai' | 'sales' | 'financial' | 'accounting';

/** Components map — only the active tab renders (no display:none) */
const ALL_REPORT_COMPONENTS: Partial<Record<ReportTab, React.ReactNode>> = {
  daily_sales: <DailySalesReport />,
  returns_report: <ReturnsReportView />,
  debt_report: <DebtReportView />,
  debt_aging: <DebtAgingReport />,
  operational_expenses: <OperationalExpensesReport />,
  trial_balance: <TrialBalanceView />,
  p_and_l: <ProfitLossView />,
  balance_sheet: <BalanceSheetView />,
  currency_diff: <CurrencyDiffView />,
  item_movement: <InventoryMovementView />,
  cash_flow: <CashFlowView />,
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
    { id: 'balance_sheet', label: t('バランスシート'), icon: Wallet, category: 'financial' },
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
                    "flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all whitespace-nowrap text-[10px] font-bold uppercase tracking-tight",
                    activeCategory === cat.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105"
                      : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                  )}
                >
                  <cat.icon size={14} className={activeCategory === cat.id ? "text-white" : cat.color} />
                  {cat.label}
                </button>
              ))}
            </div>
          }
        />

        <div className="flex-1 overflow-hidden flex flex-col relative z-20">
          <div className="flex-1 overflow-y-auto px-2 md:px-4 pt-5 md:pt-6 pb-24 custom-scrollbar">
            <div className="max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              {ALL_REPORT_COMPONENTS[activeTab]}
            </div>
          </div>
        </div>
      </div>
    </FullscreenContainer>
  );
};

export default ReportsPage;