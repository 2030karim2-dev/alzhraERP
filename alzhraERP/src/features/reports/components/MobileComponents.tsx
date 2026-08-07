import React from 'react';
import { cn } from '../../../core/utils';

interface MobileCardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
}

export const MobileCard: React.FC<MobileCardProps> = ({ children, className, padding = 'md' }) => {
    const paddingClasses = {
        sm: 'p-3 sm:p-4',
        md: 'p-4 sm:p-6',
        lg: 'p-4 sm:p-6 md:p-8',
    };

    return (
        <div className={cn(
            "bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm",
            paddingClasses[padding],
            className
        )}>
            {children}
        </div>
    );
};

interface MobileStatCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    colorClass?: string;
    className?: string;
}

export const MobileStatCard: React.FC<MobileStatCardProps> = ({
    title, value, icon, colorClass = 'text-slate-600', className
}) => {
    return (
        <div className={cn(
            "bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-3 sm:p-4 flex items-center gap-3",
            className
        )}>
            {icon && (
                <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0", colorClass)}>
                    {icon}
                </div>
            )}
            <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{title}</p>
                <p className="text-sm sm:text-base md:text-lg font-black text-slate-800 dark:text-slate-100 truncate">{value}</p>
            </div>
        </div>
    );
};

interface ResponsiveGridProps {
    children: React.ReactNode;
    cols?: 1 | 2 | 3 | 4;
    className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ children, cols = 2, className }) => {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-2 sm:grid-cols-3',
        4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={cn("grid gap-2 sm:gap-3 md:gap-4", gridCols[cols], className)}>
            {children}
        </div>
    );
};

interface MobileSectionTitleProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}

export const MobileSectionTitle: React.FC<MobileSectionTitleProps> = ({ title, subtitle, icon, action }) => {
    return (
        <div className="flex items-start sm:items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 min-w-0">
                {icon && <span className="flex-shrink-0">{icon}</span>}
                <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h3>
                    {subtitle && <p className="text-[10px] sm:text-xs text-slate-400 truncate">{subtitle}</p>}
                </div>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
};

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const MobileEmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
            {icon && <div className="w-12 h-12 sm:w-16 sm:h-16 mb-4 text-slate-300 dark:text-slate-600">{icon}</div>}
            <h4 className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-400 mb-1">{title}</h4>
            {description && <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mb-4">{description}</p>}
            {action}
        </div>
    );
};

interface LoadingStateProps {
    text?: string;
}

export const MobileLoadingState: React.FC<LoadingStateProps> = ({ text = 'جاري التحميل...' }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs sm:text-sm font-bold text-slate-400 animate-pulse">{text}</p>
        </div>
    );
};
