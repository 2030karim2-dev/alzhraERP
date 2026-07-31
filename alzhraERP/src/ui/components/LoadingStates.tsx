// ============================================
// Loading & Empty States Components
// Al-Zahra Smart ERP
// ============================================

import React from 'react';
import { Loader2, Inbox, Search, AlertCircle } from 'lucide-react';

// ============================================
// Loading Spinner
// ============================================

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    className = '',
    text
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
            <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
            {text && <p className="text-sm text-gray-500">{text}</p>}
        </div>
    );
};

// ============================================
// Table Loading Skeleton
// ============================================

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
    rows = 5,
    columns = 5,
    className = ''
}) => {
    return (
        <div className={`animate-pulse ${className}`}>
            {/* Header */}
            <div className="flex gap-4 p-4 border-b border-[var(--app-border)] bg-[var(--app-bg)]">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="flex-1 h-4 bg-gray-200 dark:bg-slate-700/50 rounded" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 p-4 border-b border-[var(--app-border)] bg-[var(--app-surface)]">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div key={colIndex} className="flex-1 h-4 bg-gray-100 dark:bg-slate-800/50 rounded" />
                    ))}
                </div>
            ))}
        </div>
    );
};

// ============================================
// Card Loading Skeleton
// ============================================

interface CardSkeletonProps {
    className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ className = '' }) => {
    return (
        <div className={`bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-6 animate-pulse ${className}`}>
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700/50 rounded-lg" />
                <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700/50 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-slate-800/50 rounded w-1/3" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-100 dark:bg-slate-800/50 rounded" />
                <div className="h-3 bg-gray-100 dark:bg-slate-800/50 rounded w-4/5" />
            </div>
        </div>
    );
};

// ============================================
// Empty State
// ============================================

interface EmptyStateProps {
    icon?: 'inbox' | 'search' | 'custom';
    customIcon?: React.ReactNode;
    title: string;
    description?: string | undefined;
    action?: {
        label: string;
        onClick: () => void;
    } | undefined;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'inbox',
    customIcon,
    title,
    description,
    action,
    className = ''
}) => {
    const icons = {
        inbox: <Inbox className="w-12 h-12 text-gray-300 dark:text-slate-600" />,
        search: <Search className="w-12 h-12 text-gray-300 dark:text-slate-600" />,
        custom: customIcon
    };

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
            <div className="w-20 h-20 rounded-full bg-[var(--app-bg)] flex items-center justify-center mb-4">
                {icons[icon]}
            </div>
            <h3 className="text-lg font-bold text-[var(--app-text)] mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-sm font-medium text-[var(--app-text-secondary)] text-center max-w-md mb-6">
                    {description}
                </p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

// ============================================
// Error State
// ============================================

interface ErrorStateProps {
    title?: string | undefined;
    message: string;
    onRetry?: (() => void) | undefined;
    className?: string | undefined;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    title = 'حدث خطأ',
    message,
    onRetry,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-[var(--app-text)] mb-2">
                {title}
            </h3>
            <p className="text-sm font-medium text-[var(--app-text-secondary)] text-center max-w-md mb-6">
                {message}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                    إعادة المحاولة
                </button>
            )}
        </div>
    );
};

// ============================================
// Page Loading
// ============================================

interface PageLoadingProps {
    text?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
    text = 'جاري التحميل...'
}) => {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" text={text} />
        </div>
    );
};

// ============================================
// Data Table with Loading/Empty States
// ============================================

interface DataTableWrapperProps {
    isLoading: boolean;
    isError: boolean;
    error?: Error | null;
    data: unknown[] | null | undefined;
    onRetry?: () => void;
    loadingComponent?: React.ReactNode;
    emptyComponent?: React.ReactNode;
    errorComponent?: React.ReactNode;
    children: React.ReactNode;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyAction?: { label: string; onClick: () => void };
}

export const DataTableWrapper: React.FC<DataTableWrapperProps> = ({
    isLoading,
    isError,
    error,
    data,
    onRetry,
    loadingComponent,
    emptyComponent,
    errorComponent,
    children,
    emptyTitle = 'لا توجد بيانات',
    emptyDescription,
    emptyAction
}) => {
    if (isLoading) {
        return loadingComponent || <TableSkeleton />;
    }

    if (isError) {
        return errorComponent || (
            <ErrorState
                message={error?.message || 'فشل في تحميل البيانات'}
                onRetry={onRetry || undefined}
            />
        );
    }

    if (!data || data.length === 0) {
        return emptyComponent || (
            <EmptyState
                title={emptyTitle}
                description={emptyDescription || undefined}
                action={emptyAction || undefined}
            />
        );
    }

    return <>{children}</>;
};
