import React from 'react';
import { ArrowLeftRight, TrendingUp, Package, Warehouse as WarehouseIcon } from 'lucide-react';
import { cn } from '../../../../core/utils';

interface TransferStatsProps {
    stats: {
        total: number;
        thisMonth: number;
        totalItems: number;
        warehouseCount: number;
    };
}

const TransferStats: React.FC<TransferStatsProps> = ({ stats }) => {
    const statConfigs = [
        { label: 'إجمالي المناقلات', value: stats.total, icon: ArrowLeftRight, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
        { label: 'هذا الشهر', value: stats.thisMonth, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
        { label: 'أصناف منقولة', value: stats.totalItems, icon: Package, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
        { label: 'المستودعات', value: stats.warehouseCount, icon: WarehouseIcon, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {statConfigs.map((s, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-50 dark:border-slate-800 p-2 flex items-center gap-2 shadow-sm">
                    <div className={cn("p-1.5 rounded-md", s.color)}>
                        <s.icon size={14} />
                    </div>
                    <div>
                        <span className="text-[7px] font-black text-gray-400 uppercase block tracking-tighter">{s.label}</span>
                        <span className="text-sm font-black font-mono text-gray-800 dark:text-gray-100 leading-none">{s.value}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TransferStats;
