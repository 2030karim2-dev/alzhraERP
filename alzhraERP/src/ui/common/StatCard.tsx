import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../core/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  colorClass: string;
  iconBgClass: string;
  variant?: 'default' | 'compact';
  trend?:
    | {
        value: number;
        isPositive: boolean;
      }
    | undefined;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
  iconBgClass,
  variant = 'default',
  trend,
  className,
}) => {
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'stat-card group flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm transition-all duration-300 hover:border-blue-500/20 hover:shadow-md',
        isCompact ? 'p-3 lg:p-4' : 'p-3 max-md:p-2.5 md:p-4 lg:rounded-2xl lg:p-5 xl:p-6',
        className
      )}
    >
      <div className={cn('flex items-start justify-between', isCompact ? 'mb-1' : 'mb-2')}>
        <div className="flex flex-col">
          <span
            className={cn(
              'truncate font-medium leading-none text-[var(--app-text-secondary)]',
              isCompact ? 'mb-1 text-[10px]' : 'mb-1.5 text-xs'
            )}
          >
            {title}
          </span>
          <h3
            className={cn(
              'truncate font-mono font-bold leading-none tracking-tight',
              isCompact ? 'text-lg lg:text-xl' : 'text-xl max-md:text-lg md:text-2xl lg:text-3xl',
              colorClass
            )}
          >
            {value}
          </h3>
        </div>
        <div
          className={cn(
            'flex items-center justify-center rounded-lg transition-transform group-hover:scale-110',
            isCompact ? 'p-1.5 lg:p-2' : 'p-2 max-md:p-1.5 lg:rounded-xl lg:p-3',
            iconBgClass + ' bg-opacity-10'
          )}
        >
          <Icon
            className={cn(
              colorClass,
              isCompact
                ? 'h-3.5 w-3.5 lg:h-4 lg:w-4'
                : 'h-4 w-4 max-md:h-3.5 max-md:w-3.5 md:h-5 md:w-5 lg:h-6 lg:w-6'
            )}
          />
        </div>
      </div>

      {(subtext || trend) && (
        <div className="mt-3 flex items-center justify-between border-t border-[var(--app-border)] pt-2">
          <span className="max-w-[60%] truncate text-[10px] font-medium text-[var(--app-text-secondary)]">
            {subtext}
          </span>
          {trend && (
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                trend.isPositive
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/20'
                  : 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-900/20'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value.toFixed(0)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
