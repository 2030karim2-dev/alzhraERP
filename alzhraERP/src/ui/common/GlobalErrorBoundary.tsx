import React from 'react';
import { ErrorBoundary } from '../../core/components/ErrorBoundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SectionErrorFallbackProps {
    title?: string | undefined;
    onRetry?: () => void;
}

/**
 * A compact, inline error fallback for sections within a page.
 * Unlike the full-page ErrorBoundary, this shows a small error card
 * so the rest of the page continues to function normally.
 */
const SectionErrorFallback: React.FC<SectionErrorFallbackProps> = ({
    title = 'حدث خطأ في تحميل هذا القسم',
    onRetry
}) => (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30 rounded-2xl min-h-[200px]">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">{title}</p>
        <p className="text-xs text-red-500/70 dark:text-red-400/50 mb-4">لم يتأثر باقي التطبيق</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
            >
                <RefreshCw size={14} />
                إعادة المحاولة
            </button>
        )}
    </div>
);

interface GlobalErrorBoundaryProps {
    children: React.ReactNode;
    sectionName?: string;
}

/**
 * GlobalErrorBoundary - حدود أخطاء ذكية للأقسام
 * 
 * Wraps individual sections/widgets so that if one crashes,
 * only that section shows an error while the rest of the page
 * continues to work normally.
 * 
 * @example
 * <GlobalErrorBoundary sectionName="لوحة المبيعات">
 *   <SalesFlowChart />
 * </GlobalErrorBoundary>
 */
export const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({
    children,
    sectionName
}) => {
    return (
        <ErrorBoundary
            fallback={
                <SectionErrorFallback
                    title={sectionName ? `خطأ في ${sectionName}` : undefined}
                />
            }
        >
            {children}
        </ErrorBoundary>
    );
};

export default GlobalErrorBoundary;
