import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface Props {
    children: ReactNode;
    reportName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

interface FallbackProps {
    reportName?: string | undefined;
    errorMessage?: string | undefined;
    onRetry: () => void;
}

class ReportErrorBoundaryClass extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[ReportErrorBoundary] ${this.props.reportName || 'Unknown'} error:`, error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <ErrorFallback
                    reportName={this.props.reportName}
                    errorMessage={this.state.error?.message}
                    onRetry={this.handleRetry}
                />
            );
        }
        return this.props.children;
    }
}

function ErrorFallback({ reportName, errorMessage, onRetry }: FallbackProps) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center   max-md:p-4 md:p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl max-md:rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 shadow-lg">
                <AlertTriangle size={28} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                {t('report_error_title') || 'حدث خطأ في التقرير'}
            </h3>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-2">
                {reportName ? `${t('report')}: ${reportName}` : t('report_error_description') || 'تعذر تحميل التقرير. يرجى المحاولة مرة أخرى.'}
            </p>
            {errorMessage && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg max-w-md truncate">
                    {errorMessage}
                </p>
            )}
            <button
                onClick={onRetry}
                className="flex items-center   max-md:gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs md:text-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95 min-h-[44px]"
            >
                <RefreshCw size={14} />
                {t('retry') || 'إعادة المحاولة'}
            </button>
        </div>
    );
}

const ReportErrorBoundary: React.FC<Props> = (props) => {
    return <ReportErrorBoundaryClass {...props} />;
};

export default ReportErrorBoundary;