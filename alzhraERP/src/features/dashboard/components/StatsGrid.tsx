import React from 'react';
import { useDashboardData } from '../hooks';
import { TrendingUp, ShoppingCart, DollarSign, Receipt, LucideIcon } from 'lucide-react';
// import { formatCurrency } from '../../../core/utils';
import StatCard from '../../../ui/common/StatCard';

interface StatItem {
    title: string;
    value: string;
    icon: LucideIcon;
    colorClass: string;
    iconBgClass: string;
    trend?: { value: number; isPositive: boolean } | undefined;
}

const StatsGrid: React.FC = () => {
    const { stats, isLoading } = useDashboardData();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-[var(--app-surface-hover)] rounded-3xl"></div>
                ))}
            </div>
        );
    }

    // If no data, show empty state
    const hasData = stats && stats.sales && stats.sales !== '0 ر.س';

    if (!hasData) {
        return null; // Let the main StatsGrid in ui/dashboard show the data
    }

    const statItems: StatItem[] = [
        {
            title: 'إجمالي المبيعات',
            value: stats.sales || '0',
            icon: TrendingUp,
            colorClass: "text-blue-600",
            iconBgClass: "bg-blue-600",
            trend: stats.salesTrend ? { value: Math.abs(stats.salesTrend), isPositive: stats.salesTrend >= 0 } : undefined
        },
        {
            title: 'صافي الربح',
            value: stats.profit || '0',
            icon: DollarSign,
            colorClass: "text-emerald-600",
            iconBgClass: "bg-emerald-600",
            trend: stats.profitTrend ? { value: Math.abs(stats.profitTrend), isPositive: stats.profitTrend >= 0 } : undefined
        },
        {
            title: 'المصروفات',
            value: stats.expenses || '0',
            icon: Receipt,
            colorClass: "text-rose-600",
            iconBgClass: "bg-rose-600",
        },
        {
            title: 'المشتريات',
            value: stats.purchases || '0',
            icon: ShoppingCart,
            colorClass: "text-violet-600",
            iconBgClass: "bg-violet-600",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statItems.map((item, index) => (
                <StatCard
                    key={index}
                    title={item.title}
                    value={item.value}
                    icon={item.icon}
                    colorClass={item.colorClass}
                    iconBgClass={item.iconBgClass}
                    trend={item.trend}
                />
            ))}
        </div>
    );
};

export default StatsGrid;
