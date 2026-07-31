import React from 'react';
import { RefreshCw, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

interface Props {
    stats: {
        totalCount: number;
        totalAmount: number;
        salesCount: number;
        salesTotal: number;
        purchaseCount: number;
        purchaseTotal: number;
    };
}

const ReturnsStatsGrid: React.FC<Props> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card bento-item p-8 group hover:scale-[1.02] transition-all duration-500 border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                        <RefreshCw size={24} className="text-blue-600 dark:text-blue-400 group-hover:rotate-180 transition-transform duration-700" />
                    </div>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Gross Volume</span>
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{stats.totalCount}</h3>
                    <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                        إجمالي عمليات الإرجاع
                    </p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(stats.totalAmount)}</span>
                </div>
            </div>

            <div className="glass-card bento-item p-8 group hover:scale-[1.02] transition-all duration-500 border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-rose-500/10 rounded-2xl group-hover:bg-rose-500/20 transition-colors">
                        <TrendingDown size={24} className="text-rose-600 dark:text-rose-400 group-hover:-translate-y-1 transition-transform" />
                    </div>
                    <span className="text-[10px] font-black text-rose-600 bg-rose-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Outbound</span>
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{stats.salesCount}</h3>
                    <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                        مرتجعات المبيعات
                    </p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(stats.salesTotal)}</span>
                </div>
            </div>

            <div className="glass-card bento-item p-8 group hover:scale-[1.02] transition-all duration-500 border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                        <TrendingUp size={24} className="text-emerald-600 dark:text-emerald-400 group-hover:translate-y-1 transition-transform" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Inbound</span>
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{stats.purchaseCount}</h3>
                    <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                        مرتجعات المشتريات
                    </p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(stats.purchaseTotal)}</span>
                </div>
            </div>

            <div className="glass-card bento-item p-8 group hover:scale-[1.02] transition-all duration-500 border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-purple-500/10 rounded-2xl group-hover:bg-purple-500/20 transition-colors">
                        <BarChart3 size={24} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-[10px] font-black text-purple-600 bg-purple-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Avg Value</span>
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                        {formatCurrency(stats.totalCount > 0 ? stats.totalAmount / stats.totalCount : 0).split(' ')[0]}
                    </h3>
                    <p className="text-sm font-bold text-slate-500">متوسط قيمة المرتجع</p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Per Return Transaction</span>
                </div>
            </div>
        </div>
    );
};

export default ReturnsStatsGrid;
