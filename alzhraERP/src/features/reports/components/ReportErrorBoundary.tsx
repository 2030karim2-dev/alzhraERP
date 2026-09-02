import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { logger } from '../../../core/utils/logger';

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
    logger.error(
      'ReportErrorBoundary',
      `[ReportErrorBoundary] ${this.props.reportName || 'Unknown'} error:`,
      [error, errorInfo]
    );
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
    <div className="animate-in fade-in zoom-in flex flex-col items-center justify-center text-center duration-300 max-md:p-4 md:p-8">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 shadow-lg dark:bg-amber-900/30 max-md:rounded-xl md:h-16 md:w-16">
        <AlertTriangle size={28} className="text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="mb-1 text-base font-bold text-slate-800 dark:text-slate-100 md:text-lg">
        {t('report_error_title') || 'حدث خطأ في التقرير'}
      </h3>
      <p className="mb-2 max-w-md text-xs text-slate-500 dark:text-slate-400 md:text-sm">
        {reportName
          ? `${t('report')}: ${reportName}`
          : t('report_error_description') || 'تعذر تحميل التقرير. يرجى المحاولة مرة أخرى.'}
      </p>
      {errorMessage && (
        <p className="mb-4 max-w-md truncate rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          {errorMessage}
        </p>
      )}
      <button
        onClick={onRetry}
        className="flex min-h-[44px] items-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 hover:shadow-amber-500/30 active:scale-95 max-md:gap-2 md:text-sm"
      >
        <RefreshCw size={14} />
        {t('retry') || 'إعادة المحاولة'}
      </button>
    </div>
  );
}

const ReportErrorBoundary: React.FC<Props> = props => {
  return <ReportErrorBoundaryClass {...props} />;
};

export default ReportErrorBoundary;
