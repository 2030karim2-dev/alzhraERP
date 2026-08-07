import React from 'react';
import { cn } from '../../core/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  icon?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className, icon }) => {
  const variants = {
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    warning: "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    danger: "bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    info: "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    neutral: "bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] border border-[var(--app-border)]",
    outline: "bg-transparent text-[var(--app-text-secondary)] border border-[var(--app-border)]",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap",
      variants[variant],
      className
    )}>
      {icon && <span className="w-3 h-3">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;