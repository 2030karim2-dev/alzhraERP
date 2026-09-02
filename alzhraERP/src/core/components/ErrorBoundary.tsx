// ============================================
// Error Boundary - حدود الأخطاء المخصصة
// Al-Zahra Smart ERP
// ============================================

import { Component, type ReactNode } from 'react';
import { AppError, ErrorCode, type UnknownRecord } from '../types/common';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError, errorInfo: UnknownRecord) => void;
  resetKeys?: unknown[];
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

/**
 * Error Boundary Component
 * catches React errors and displays fallback UI
 *
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const appError =
      error instanceof AppError ? error : new AppError(error.message, ErrorCode.UNKNOWN, 500);

    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: UnknownRecord) {
    const appError =
      error instanceof AppError ? error : new AppError(error.message, ErrorCode.UNKNOWN, 500);

    logger.error('ErrorBoundary', 'Caught error', { appError, errorInfo });

    // Handle dynamic import / chunk load failures (common after new deployments)
    const isChunkError =
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('MIME type') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      logger.warn(
        'ErrorBoundary',
        'Detected chunk load error. Attempting to recover by reloading...'
      );

      // Try to auto-reload once per session to fix the version mismatch
      const lastReload = sessionStorage.getItem('last_chunk_error_reload');
      const now = Date.now();

      // If we haven't reloaded for a chunk error in the last 10 seconds, do it once
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem('last_chunk_error_reload', now.toString());
        window.location.reload();
        return;
      }
    }

    this.props.onError?.(appError, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when resetKeys change
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged && this.state.hasError) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMsg = this.state.error?.message || '';
      const isVersionMismatch =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('MIME type');

      const { inline } = this.props;

      return (
        <div
          className={
            inline
              ? 'flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900'
              : 'flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950'
          }
        >
          <div
            className={
              inline
                ? 'w-full max-w-sm'
                : 'w-full max-w-md rounded-3xl border border-slate-200 bg-[var(--app-surface)] p-8 text-center shadow-2xl dark:border-slate-800'
            }
          >
            <div
              className={
                inline
                  ? 'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30'
                  : 'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30'
              }
            >
              <svg
                className={
                  inline
                    ? 'h-6 w-6 text-rose-600 dark:text-rose-400'
                    : 'h-10 w-10 text-rose-600 dark:text-rose-400'
                }
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2
              className={
                inline
                  ? 'mb-2 text-lg font-bold text-slate-900 dark:text-white'
                  : 'mb-3 text-2xl font-bold text-slate-900 dark:text-white'
              }
            >
              {isVersionMismatch ? 'تحديث متوفر' : 'حدث خطأ غير متوقع'}
            </h2>

            <p
              className={
                inline
                  ? 'mb-6 text-sm text-slate-600 dark:text-slate-400'
                  : 'mb-8 leading-relaxed text-slate-600 dark:text-slate-400'
              }
            >
              {isVersionMismatch
                ? 'يبدو أن هناك نسخة جديدة من النظام متوفرة. يرجى التحديث.'
                : 'نعتذر عن هذا الخلل الموضعي. يرجى المحاولة مرة أخرى.'}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
              >
                {isVersionMismatch ? 'تحديث الآن' : 'إعادة تحميل الصفحة'}
              </button>

              {!isVersionMismatch && (
                <button
                  onClick={this.handleReset}
                  className="w-full rounded-2xl bg-slate-100 px-6 py-4 font-bold text-slate-700 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  حاول مرة أخرى
                </button>
              )}
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 max-h-32 overflow-auto rounded-xl bg-slate-50 p-4 text-left font-mono text-[10px] text-slate-500 dark:bg-black/20">
                {this.state.error.message}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for using Error Boundary functionality in functional components
 */
import { useState, useCallback } from 'react';

export const useErrorBoundary = () => {
  const [error, setError] = useState<AppError | null>(null);

  const showError = useCallback((appError: AppError) => {
    setError(appError);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, showError, clearError };
};

export default ErrorBoundary;
