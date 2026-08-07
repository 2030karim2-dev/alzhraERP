
import React from 'react';
import { Car } from 'lucide-react';
import { cn } from '../../core/utils';

export type PageLoaderVariant = 'default' | 'table' | 'grid' | 'form' | 'dashboard';

interface PageLoaderProps {
  variant?: PageLoaderVariant;
  className?: string;
}

const TableSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-1">
    <div className="h-10 bg-[var(--app-surface-hover)] rounded-t-lg" />
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex gap-3 p-3 border-b border-[var(--app-border)]">
        <div className="h-4 bg-[var(--app-surface-hover)] rounded w-8" />
        <div className="h-4 bg-[var(--app-surface-hover)] rounded flex-1" />
        <div className="h-4 bg-[var(--app-surface-hover)] rounded w-24" />
        <div className="h-4 bg-[var(--app-surface-hover)] rounded w-20" />
      </div>
    ))}
  </div>
);

const GridSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="bg-[var(--app-surface)] rounded-2xl p-4 border border-[var(--app-border)]">
        <div className="h-32 bg-[var(--app-surface-hover)] rounded-xl mb-3" />
        <div className="h-4 bg-[var(--app-surface-hover)] rounded w-3/4 mb-2" />
        <div className="h-3 bg-[var(--app-surface-hover)] rounded w-1/2" />
      </div>
    ))}
  </div>
);

const FormSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse max-w-lg mx-auto">
    <div className="space-y-2">
      <div className="h-4 bg-[var(--app-surface-hover)] rounded w-24" />
      <div className="h-10 bg-[var(--app-surface-hover)] rounded-lg" />
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-[var(--app-surface-hover)] rounded w-32" />
      <div className="h-10 bg-[var(--app-surface-hover)] rounded-lg" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="h-4 bg-[var(--app-surface-hover)] rounded w-16" />
        <div className="h-10 bg-[var(--app-surface-hover)] rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-[var(--app-surface-hover)] rounded w-20" />
        <div className="h-10 bg-[var(--app-surface-hover)] rounded-lg" />
      </div>
    </div>
    <div className="h-24 bg-[var(--app-surface-hover)] rounded-lg" />
    <div className="h-12 bg-[var(--app-surface-hover)] rounded-lg w-32 mt-4" />
  </div>
);

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[var(--app-surface)] rounded-2xl p-5 border border-[var(--app-border)]">
          <div className="h-4 bg-[var(--app-surface-hover)] rounded w-16 mb-3" />
          <div className="h-8 bg-[var(--app-surface-hover)] rounded w-24 mb-2" />
          <div className="h-3 bg-[var(--app-surface-hover)] rounded w-20" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-[var(--app-surface)] rounded-2xl p-5 border border-[var(--app-border)] h-64">
        <div className="h-5 bg-[var(--app-surface-hover)] rounded w-32 mb-4" />
        <div className="h-48 bg-[var(--app-surface-hover)] rounded-xl" />
      </div>
      <div className="bg-[var(--app-surface)] rounded-2xl p-5 border border-[var(--app-border)] h-64">
        <div className="h-5 bg-[var(--app-surface-hover)] rounded w-28 mb-4" />
        <div className="h-48 bg-[var(--app-surface-hover)] rounded-xl" />
      </div>
    </div>
  </div>
);

const variantMap: Record<PageLoaderVariant, React.ReactNode> = {
  default: (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-[var(--app-bg)] transition-colors">
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inset-0 border-4 border-blue-100 dark:border-blue-900/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="w-16 h-16 bg-[var(--app-surface)] rounded-full flex items-center justify-center shadow-inner">
          <Car size={28} className="text-blue-600 animate-pulse" />
        </div>
      </div>
      <p className="mt-6 text-sm font-medium text-[var(--app-text-secondary)]">جاري تحميل البيانات...</p>
    </div>
  ),
  table: <div className="p-4"><TableSkeleton /></div>,
  grid: <div className="p-4"><GridSkeleton /></div>,
  form: <div className="p-4"><FormSkeleton /></div>,
  dashboard: <div className="p-4"><DashboardSkeleton /></div>,
};

const PageLoader: React.FC<PageLoaderProps> = ({ variant = 'default', className }) => {
  return (
    <div className={cn('bg-[var(--app-bg)] transition-colors', className)}>
      {variantMap[variant]}
    </div>
  );
};

export default PageLoader;
export type { PageLoaderVariant };

