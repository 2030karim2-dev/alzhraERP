import React from 'react';
import { cn } from '../../../../core/utils';

interface Props {
    icon: any;
    label: string;
    value: string | number;
    color: string;
}

const StatCard: React.FC<Props> = ({ icon: Icon, label, value, color }) => {
    const colorClasses: Record<string, string> = {
        indigo: 'text-indigo-600 dark:text-indigo-400',
        blue: 'text-blue-600 dark:text-blue-400',
        emerald: 'text-emerald-600 dark:text-emerald-400',
        rose: 'text-rose-600 dark:text-rose-400',
        slate: 'text-slate-600 dark:text-slate-400',
    };

    return (
        <div className="p-2 border-r border-slate-200 dark:border-slate-800 flex flex-col gap-1 min-w-0 bg-white dark:bg-slate-950">
            <div className="flex items-center gap-1">
                <Icon size={11} className={cn("opacity-50", colorClasses[color] || 'text-slate-400')} />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{label}</span>
            </div>
            <span dir="ltr" className={cn(
                "text-sm font-bold font-mono tracking-tight truncate",
                colorClasses[color] || 'text-slate-900 dark:text-slate-100'
            )}>{value}</span>
        </div>
    );
};

export default StatCard;
