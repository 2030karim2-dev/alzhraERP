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
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    danger: "bg-red-50 text-red-700 border border-red-100",
    info: "bg-blue-50 text-blue-700 border border-blue-100",
    neutral: "bg-gray-100 text-gray-700 border border-gray-200",
    outline: "bg-transparent text-gray-600 border border-gray-300",
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