import React from 'react';
import { type LucideIcon, SearchX, Package, FileText, Users, BarChart3 } from 'lucide-react';
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

const variantDefaults: Record<
  EmptyStateVariant,
  {
    icon: LucideIcon;
    titleFallback: string;
    descFallback: string;
    color: string;
  }
> = {
  default: {
    icon: SearchX,
    titleFallback: 'لا توجد بيانات',
    descFallback: 'لم يتم العثور على أي نتائج',
    color: 'text-slate-400',
  },
  products: {
    icon: Package,
    titleFallback: 'لا توجد منتجات',
    descFallback: 'ابدأ بإضافة أول منتج في المخزون',
    color: 'text-amber-400',
  },
  invoices: {
    icon: FileText,
    titleFallback: 'لا توجد فواتير',
    descFallback: 'لم يتم تسجيل أي فاتورة بعد',
    color: 'text-blue-400',
  },
  customers: {
    icon: Users,
    titleFallback: 'لا يوجد عملاء',
    descFallback: 'أضف أول عميل للبدء في إصدار الفواتير',
    color: 'text-emerald-400',
  },
  reports: {
    icon: BarChart3,
    titleFallback: 'لا توجد بيانات كافية',
    descFallback: 'قم بإدخال المزيد من المعاملات لعرض التقارير',
    color: 'text-violet-400',
  },
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
    <div
      className={cn(
        'animate-in fade-in zoom-in flex flex-col items-center justify-center p-8 text-center duration-300 md:p-12',
        className
      )}
    >
      <div className="relative mb-5 md:mb-6">
        <div
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--app-bg)] transition-colors md:h-24 md:w-24',
            displayColor,
            'opacity-40'
          )}
        >
          <DisplayIcon size={44} strokeWidth={1.5} className="hidden md:block" />
          <DisplayIcon size={36} strokeWidth={1.5} className="md:hidden" />
        </div>
        <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] shadow-lg md:h-8 md:w-8">
          <div className="h-2 w-2 animate-pulse rounded-full bg-rose-500"></div>
        </div>
      </div>

      <h3 className="mb-2 text-base font-bold tracking-tight text-[var(--app-text)] md:text-lg">
        {title || def.titleFallback}
      </h3>
      <p className="mb-6 max-w-xs text-xs font-normal leading-relaxed text-[var(--app-text-secondary)] md:mb-8 md:text-sm">
        {description || def.descFallback}
      </p>

      {action && (
        <div className="animate-in slide-in-from-bottom-2 delay-200 duration-300">{action}</div>
      )}
    </div>
  );
};

export default EmptyState;
