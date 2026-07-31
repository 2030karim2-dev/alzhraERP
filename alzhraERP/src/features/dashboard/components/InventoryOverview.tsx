import React from 'react';
import { Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '../../../core/utils';

interface InventoryOverviewProps {
    lowStockProducts?: any[];
    className?: string;
}

const InventoryOverview: React.FC<InventoryOverviewProps> = ({ lowStockProducts, className }) => {
    const lowStockCount = lowStockProducts?.length || 0;

    const metrics = [
        {
            label: 'مخزون منخفض',
            value: lowStockCount.toString(),
            icon: AlertTriangle,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20'
        },
        {
            label: 'يحتاج إعادة طلب',
            value: lowStockCount > 0 ? `${lowStockCount} صنف` : 'لا يوجد',
            icon: Package,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20'
        },
    ];

    return (
        <div className={cn(
            "bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] rounded-2xl p-4 relative overflow-hidden group",
            className
        )}>
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-[60px] group-hover:bg-cyan-400/20 transition-all duration-700 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                    <Package size={16} className="text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-[var(--app-text)]">نظرة عامة على المخزون</h3>
                    <p className="text-[9px] text-[var(--app-text-secondary)]">Inventory Snapshot</p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 relative z-10">
                {metrics.map((m) => (
                    <div key={m.label} className={cn(
                        "p-3 rounded-xl border bg-white/5 hover:bg-white/10 transition-all duration-300",
                        "border-[var(--app-border)]"
                    )}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={cn("p-1.5 rounded-lg border", m.bg)}>
                                <m.icon size={12} className={m.color} />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">{m.label}</span>
                        </div>
                        <p className="text-lg font-bold text-[var(--app-text)] font-mono">{m.value}</p>
                    </div>
                ))}
            </div>

            {lowStockCount === 0 && (
                <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl relative z-10">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400">المخزون في حالة جيدة</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryOverview;

