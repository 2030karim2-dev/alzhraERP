
import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useThemeStore } from '@/lib/themeStore';
import MicroHeader from '../../../ui/base/MicroHeader';
import Button from '../../../ui/base/Button';
import BondKpiCards from './BondKpiCards';
import BondTrendChart from './BondTrendChart';
import BondAccountDistributionChart from './BondAccountDistributionChart';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

const periodLabels: Record<PeriodType, string> = {
    today: 'اليوم',
    week: 'الأسبوع',
    month: 'الشهر',
    quarter: 'الربع',
    year: 'السنة'
};

interface Analytics {
    totalAmount: number;
    count: number;
    avgAmount: number;
    chartData: { date: string; amount: number; count: number }[];
    accountData: { name: string; amount: number; count: number }[];
}

interface Totals {
    receiptCount: number;
    receiptAmount: number;
    paymentCount: number;
    paymentAmount: number;
    netAmount: number;
}

interface Props {
    analytics: Analytics;
    totals: Totals;
    onSwitchToList: () => void;
}

const BondsAnalyticsView: React.FC<Props> = ({ analytics, totals, onSwitchToList }) => {
    const [period, setPeriod] = useState<PeriodType>('month');
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 font-cairo animate-in fade-in duration-700">
            <MicroHeader
                title="تحليلات السندات"
                icon={BarChart3}
                iconColor="text-blue-600"
                actions={
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                            {(['today', 'week', 'month', 'quarter', 'year'] as PeriodType[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${period === p
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                >
                                    {periodLabels[p]}
                                </button>
                            ))}
                        </div>
                        <Button
                            onClick={onSwitchToList}
                            variant="outline"
                            size="sm"
                            className="rounded-2xl border-slate-200 dark:border-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            للقائمة
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto p-8 pb-20 scrollbar-hide">
                <div className="max-w-none mx-auto space-y-10">
                    {/* KPI Cards */}
                    <BondKpiCards totals={totals} analytics={analytics} />

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Trend Chart */}
                        <BondTrendChart data={analytics.chartData} isDark={isDark} />

                        {/* Accounts Chart */}
                        <BondAccountDistributionChart data={analytics.accountData} isDark={isDark} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BondsAnalyticsView;
