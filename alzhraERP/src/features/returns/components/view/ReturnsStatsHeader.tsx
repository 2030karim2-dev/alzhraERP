import React from 'react';
import { RefreshCw, RotateCcw, FileText, Truck } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

interface StatsProps {
    returnCount: number;
    totalReturns: number;
    avgReturn: number;
    pendingCount: number;
    type: 'sales' | 'purchase';
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    cardClass: string;
    iconClass: string;
    textClass: string;
}

// كلاسات Tailwind ثابتة حتى يلتقطها JIT (لا فئات ديناميكية)
const StatCard: React.FC<StatCardProps> = ({ icon, label, value, cardClass, iconClass, textClass }) => (
    <div className={cardClass}>
        <div className="flex items-center gap-2 max-md:gap-2 mb-1">
            {icon ? <span className={iconClass}>{icon}</span> : null}
            <span className={`text-xs font-bold ${textClass}`}>{label}</span>
        </div>
        <p className={`text-2xl max-md:text-lg font-bold ${textClass}`}>{value}</p>
    </div>
);

const RED_CLASS = 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-4 max-md:p-4 border border-red-200 dark:border-red-800';
const BLUE_CLASS = 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 max-md:p-4 border border-blue-200 dark:border-blue-800';
const YELLOW_CLASS = 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 max-md:p-4 border border-yellow-200 dark:border-yellow-800';
const RED_TEXT = 'text-red-600 dark:text-red-400';
const BLUE_TEXT = 'text-blue-600 dark:text-blue-400';
const YELLOW_TEXT = 'text-yellow-600 dark:text-yellow-400';

export const ReturnsStatsHeader: React.FC<StatsProps> = ({
    returnCount,
    totalReturns,
    avgReturn,
    pendingCount,
    type
}) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-md:gap-3 mb-4">
            <StatCard
                cardClass={RED_CLASS}
                icon={<RotateCcw size={18} />}
                iconClass={RED_TEXT}
                textClass={RED_TEXT}
                label="عدد المرتجعات"
                value={returnCount || 0}
            />
            <StatCard
                cardClass={RED_CLASS}
                icon={type === 'sales' ? <FileText size={18} /> : <Truck size={18} />}
                iconClass={RED_TEXT}
                textClass={RED_TEXT}
                label="إجمالي المرتجعات"
                value={type === 'sales' ? formatCurrency(totalReturns, 'SAR') : totalReturns.toFixed(2)}
            />
            <StatCard
                cardClass={BLUE_CLASS}
                icon={<FileText size={18} />}
                iconClass={BLUE_TEXT}
                textClass={BLUE_TEXT}
                label="متوسط المرتجع"
                value={type === 'sales' ? formatCurrency(avgReturn, 'SAR') : avgReturn.toFixed(2)}
            />
            <StatCard
                cardClass={YELLOW_CLASS}
                icon={<RefreshCw size={18} />}
                iconClass={YELLOW_TEXT}
                textClass={YELLOW_TEXT}
                label="قيد الانتظار"
                value={pendingCount || 0}
            />
        </div>
    );
};
