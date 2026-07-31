
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../core/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  colorClass: string;
  iconBgClass: string;
  variant?: 'default' | 'compact';
  trend?: {
    value: number;
    isPositive: boolean;
  } | undefined;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
  iconBgClass,
  variant = 'default',
  trend
}) => {
  const isCompact = variant === 'compact';

  return (
    <div className={cn(
      "bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] shadow-sm transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:shadow-md hover:border-blue-500/20 stat-card",
      isCompact ? "p-3 lg:p-4" : "p-3 md:p-4 lg:p-5 xl:p-6 lg:rounded-2xl"
    )}>
      <div className={cn("flex justify-between items-start", isCompact ? "mb-1" : "mb-2")}>
        <div className="flex flex-col">
          <span className={cn(
            "font-medium text-[var(--app-text-secondary)] leading-none truncate",
            isCompact ? "text-[10px] mb-1" : "text-xs mb-1.5"
          )}>
            {title}
          </span>
          <h3 className={cn(
            "font-bold font-mono leading-none tracking-tight truncate",
            isCompact ? "text-lg lg:text-xl" : "text-xl md:text-2xl lg:text-3xl",
            colorClass
          )}>
            {value}
          </h3>
        </div>
        <div className={cn(
          "rounded-lg transition-transform group-hover:scale-110 flex items-center justify-center",
          isCompact ? "p-1.5 lg:p-2" : "p-2 lg:p-3 lg:rounded-xl",
          iconBgClass + " bg-opacity-10"
        )}>
          <Icon className={cn(
            colorClass,
            isCompact ? "w-3.5 h-3.5 lg:w-4 lg:h-4" : "w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6"
          )} />
        </div>
      </div>

      {(subtext || trend) && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--app-border)]">
          <span className="text-[10px] font-medium text-[var(--app-text-secondary)] truncate max-w-[60%]">
            {subtext}
          </span>
          {trend && (
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              trend.isPositive ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800"
            )}>
              {trend.isPositive ? '↑' : '↓'} {trend.value.toFixed(0)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
