import React, { useState } from 'react';
import { useFeedbackStore, type ToastType } from '../../features/feedback/store';
import {
  CheckCircle,
  AlertCircle,
  Info,
  X,
  AlertTriangle,
  ChevronDown,
  Terminal,
} from 'lucide-react';
import { cn } from '../../core/utils';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-emerald-500" />,
  error: <AlertCircle size={18} className="text-rose-500" />,
  warning: <AlertTriangle size={18} className="text-amber-500" />,
  info: <Info size={18} className="text-blue-500" />,
};

const FeedbackToast: React.FC = () => {
  const { toasts, hideToast } = useFeedbackStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="fixed bottom-20 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-3 px-4 md:bottom-6">
      {toasts.map(toast => {
        const isExpanded = expandedId === toast.id;

        return (
          <div
            key={toast.id}
            className={cn(
              'animate-in slide-in-from-bottom-5 group flex flex-col rounded-xl border bg-[var(--app-surface)] shadow-2xl transition-all duration-500',
              'backdrop-blur-xl',
              toast.type === 'error'
                ? 'border-rose-200 shadow-rose-500/10 dark:border-rose-900/30'
                : 'border-[var(--app-border)]'
            )}
          >
            <div className="flex items-center gap-3 p-4">
              <div className="flex-shrink-0">{icons[toast.type]}</div>
              <p className="flex-1 text-xs font-semibold leading-tight text-[var(--app-text)]">
                {toast.message}
              </p>

              <div className="flex items-center gap-1">
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action!.onClick();
                    }}
                    className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                  >
                    {toast.action.label}
                  </button>
                )}
                {toast.details && (
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : toast.id);
                    }}
                    className="rounded-lg p-1 text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-surface-hover)]"
                  >
                    <ChevronDown
                      size={14}
                      className={cn('transition-transform', isExpanded ? 'rotate-180' : '')}
                    />
                  </button>
                )}
                <button
                  onClick={() => {
                    hideToast(toast.id);
                  }}
                  className="rounded-lg p-1 text-[var(--app-text-secondary)] transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Expanded Tech Details */}
            {isExpanded && toast.details && (
              <div className="animate-in slide-in-from-top-2 px-4 pb-4 duration-300">
                <div className="flex flex-col gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-500">
                    <Terminal size={10} /> التفاصيل التقنية للدعم
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-medium text-[var(--app-text-secondary)]">
                        Error Code
                      </span>
                      <span className="font-mono text-xs font-medium text-[var(--app-text)]">
                        {toast.details.code}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-medium text-[var(--app-text-secondary)]">
                        Severity
                      </span>
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          toast.details.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'
                        )}
                      >
                        {toast.details.severity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar for Auto-hide */}
            <div className="absolute bottom-0 left-4 right-4 h-0.5 overflow-hidden rounded-full bg-[var(--app-border)]">
              <div
                className={cn(
                  'animate-toast-progress h-full',
                  toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
                )}
              ></div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-progress {
          animation: toast-progress 5s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default FeedbackToast;
