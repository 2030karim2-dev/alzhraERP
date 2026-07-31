import React from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../../core/utils';
import { formatCurrency } from '../../../core/utils';

interface CashFlowData {
    inflow: number;
    outflow: number;
    net: number;
    inflowChange?: number;
    outflowChange?: number;
}

interface CashFlowWidgetProps {
    data?: CashFlowData;
    className?: string;
}

const CashFlowWidget: React.FC<CashFlowWidgetProps> = ({
    data,
    className
}) => {
    const hasData = data && (data.inflow > 0 || data.outflow > 0);

    const inflow = data?.inflow || 0;
    const outflow = data?.outflow || 0;
    const net = data?.net || 0;
    const inflowChange = data?.inflowChange;
    const outflowChange = data?.outflowChange;

    const maxAmount = Math.max(inflow, outflow);
    const inflowPercent = maxAmount > 0 ? (inflow / maxAmount) * 100 : 0;
    const outflowPercent = maxAmount > 0 ? (outflow / maxAmount) * 100 : 0;

    if (!hasData) {
        return (
            <div className={cn(
                "bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] p-5 rounded-2xl",
                className
            )}>
                <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <Wallet size={16} className="text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--app-text)]">التدفق النقدي</h3>
                </div>
                <div className="text-center py-8">
                    <Wallet size={40} className="mx-auto text-[var(--app-text-secondary)] mb-3" />
                    <p className="text-xs font-bold text-[var(--app-text-secondary)]">بانتظار حركة مالية</p>
                    <p className="text-[10px] text-[var(--app-text-secondary)] mt-1 opacity-60">قم بتسجيل سندات قبض أو صرف لتفعيل مؤشر التدفق</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] p-5 rounded-2xl relative overflow-hidden group",
            className
        )}>
            {/* Ambient glow */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] group-hover:bg-blue-400/20 transition-all duration-700 pointer-events-none"></div>

            <div className="flex items-center gap-2 mb-5 relative z-10">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Wallet size={16} className="text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
                </div>
                <h3 className="text-sm font-bold text-[var(--app-text)]">التدفق النقدي</h3>
            </div>

            {/* Flow Bars */}
            <div className="space-y-4 relative z-10">
                {/* Inflow */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ArrowDownCircle size={14} className="text-emerald-500" />
                            <span className="text-xs font-bold text-[var(--app-text)]">القبض</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-emerald-400 font-mono">
                                +{formatCurrency(inflow)}
                            </span>
                            {inflowChange !== undefined && (
                                <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                    inflowChange >= 0
                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                                        : "bg-rose-50 text-rose-600 dark:bg-rose-900/20"
                                )}>
                                    {inflowChange >= 0 ? '+' : ''}{inflowChange}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-l from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                            style={{ width: `${inflowPercent}%` }}
                        />
                    </div>
                </div>

                {/* Outflow */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ArrowUpCircle size={14} className="text-rose-500" />
                            <span className="text-xs font-bold text-[var(--app-text)]">الصرف</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-rose-400 font-mono">
                                -{formatCurrency(outflow)}
                            </span>
                            {outflowChange !== undefined && (
                                <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                    outflowChange <= 0
                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                                        : "bg-rose-50 text-rose-600 dark:bg-rose-900/20"
                                )}>
                                    {outflowChange >= 0 ? '+' : ''}{outflowChange}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-l from-rose-400 to-rose-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                            style={{ width: `${outflowPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="my-4 border-t border-dashed border-white/10 relative z-10" />

            {/* Net */}
            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl relative z-10">
                <div className="flex items-center gap-2">
                    {net >= 0 ? (
                        <TrendingUp size={16} className="text-blue-500" />
                    ) : (
                        <TrendingDown size={16} className="text-rose-500" />
                    )}
                    <span className="text-xs font-bold text-[var(--app-text-secondary)]">الصافي</span>
                </div>
                <span className={cn(
                    "text-lg font-bold font-mono",
                    net >= 0 ? "text-blue-600" : "text-rose-600"
                )}>
                    {net >= 0 ? '+' : ''}{formatCurrency(net)}
                </span>
            </div>

            {/* Summary */}
            <div className="mt-3 grid grid-cols-2 gap-2 relative z-10">
                <div className="text-center p-2 bg-emerald-500/10 border border-emerald-500/10 rounded-lg">
                    <p className="text-[9px] font-bold text-emerald-400 uppercase">نسبة القبض</p>
                    <p className="text-sm font-bold text-emerald-300">
                        {inflow + outflow > 0 ? ((inflow / (inflow + outflow)) * 100).toFixed(0) : 0}%
                    </p>
                </div>
                <div className="text-center p-2 bg-rose-500/10 border border-rose-500/10 rounded-lg">
                    <p className="text-[9px] font-bold text-rose-400 uppercase">نسبة الصرف</p>
                    <p className="text-sm font-bold text-rose-300">
                        {inflow + outflow > 0 ? ((outflow / (inflow + outflow)) * 100).toFixed(0) : 0}%
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CashFlowWidget;
