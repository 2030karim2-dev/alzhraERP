import React from 'react';
import { cn } from '../../../core/utils';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const MobileCard: React.FC<MobileCardProps> = ({ children, className, padding = 'md' }) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-3.5',
    md: 'p-3.5 sm:p-4 md:p-5',
    lg: 'p-4 sm:p-5 md:p-6',
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm',
        paddingClasses[padding],
        className
      )}
    >
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
  title,
  value,
  icon,
  colorClass = 'text-slate-600',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm sm:p-4',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10',
            colorClass
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
          {title}
        </p>
        <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100 sm:text-base md:text-lg">
          {value}
        </p>
      </div>
    </div>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = 2,
  className,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid max-md:gap-2 sm:gap-3 md:gap-4', gridCols[cols], className)}>
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

export const MobileSectionTitle: React.FC<MobileSectionTitleProps> = ({
  title,
  subtitle,
  icon,
  action,
}) => {
  return (
    <div className="mb-3 flex items-start justify-between max-md:gap-2 sm:mb-4 sm:items-center">
      <div className="flex min-w-0 items-center max-md:gap-2">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100 sm:text-base">
            {title}
          </h3>
          {subtitle && <p className="truncate text-[10px] text-slate-400 sm:text-xs">{subtitle}</p>}
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

export const MobileEmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      {icon && (
        <div className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600 sm:h-16 sm:w-16">
          {icon}
        </div>
      )}
      <h4 className="mb-1 text-sm font-bold text-slate-600 dark:text-slate-400 sm:text-base">
        {title}
      </h4>
      {description && (
        <p className="mb-4 max-w-xs text-xs text-slate-400 dark:text-slate-500">{description}</p>
      )}
      {action}
    </div>
  );
};

interface LoadingStateProps {
  text?: string;
}

export const MobileLoadingState: React.FC<LoadingStateProps> = ({ text = 'جاري التحميل...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 max-md:gap-3 sm:py-16">
      <div className="border-3 h-8 w-8 animate-spin rounded-full border-slate-200 border-t-blue-500 sm:h-10 sm:w-10" />
      <p className="animate-pulse text-xs font-bold text-slate-400 sm:text-sm">{text}</p>
    </div>
  );
};
