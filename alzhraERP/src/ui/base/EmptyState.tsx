
import React from 'react';
import { LucideIcon, SearchX, Package, FileText, Users, BarChart3 } from 'lucide-react';
import { cn } from '../../core/utils';

export type EmptyStateVariant = 'default' | 'products' | 'invoices' | 'customers' | 'reports';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
}

const variantDefaults: Record<EmptyStateVariant, {
  icon: LucideIcon;
  titleFallback: string;
  descFallback: string;
  color: string;
}> = {
  default: { icon: SearchX, titleFallback: 'لا توجد بيانات', descFallback: 'لم يتم العثور على أي نتائج', color: 'text-slate-400' },
  products: { icon: Package, titleFallback: 'لا توجد منتجات', descFallback: 'ابدأ بإضافة أول منتج في المخزون', color: 'text-amber-400' },
  invoices: { icon: FileText, titleFallback: 'لا توجد فواتير', descFallback: 'لم يتم تسجيل أي فاتورة بعد', color: 'text-blue-400' },
  customers: { icon: Users, titleFallback: 'لا يوجد عملاء', descFallback: 'أضف أول عميل للبدء في إصدار الفواتير', color: 'text-emerald-400' },
  reports: { icon: BarChart3, titleFallback: 'لا توجد بيانات كافية', descFallback: 'قم بإدخال المزيد من المعاملات لعرض التقارير', color: 'text-violet-400' },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}) => {
  const def = variantDefaults[variant];
  const DisplayIcon = Icon || def.icon;
  const displayColor = variant === 'default' || Icon ? '' : def.color;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 md:p-12 text-center animate-in fade-in zoom-in duration-300",
      className
    )}>
      <div className="relative mb-5 md:mb-6">
        <div className={cn(
          "w-20 h-20 md:w-24 md:h-24 bg-[var(--app-bg)] rounded-2xl flex items-center justify-center transition-colors",
          displayColor, 'opacity-40'
        )}>
          <DisplayIcon size={44} strokeWidth={1.5} className="hidden md:block" />
          <DisplayIcon size={36} strokeWidth={1.5} className="md:hidden" />
        </div>
        <div className="absolute -right-2 -bottom-2 w-7 h-7 md:w-8 md:h-8 bg-[var(--app-surface)] rounded-full shadow-lg border border-[var(--app-border)] flex items-center justify-center">
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      <h3 className="text-base md:text-lg font-bold text-[var(--app-text)] tracking-tight mb-2">
        {title || def.titleFallback}
      </h3>
      <p className="text-xs md:text-sm font-normal text-[var(--app-text-secondary)] max-w-xs leading-relaxed mb-6 md:mb-8">
        {description || def.descFallback}
      </p>

      {action && (
        <div className="animate-in slide-in-from-bottom-2 duration-300 delay-200">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

