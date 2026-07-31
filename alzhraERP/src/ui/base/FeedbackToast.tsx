
import React, { useState } from 'react';
import { useFeedbackStore, ToastType } from '../../features/feedback/store';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle, ChevronDown, Terminal } from 'lucide-react';
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
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-sm px-4">
      {toasts.map((toast) => {
        const isExpanded = expandedId === toast.id;

        return (
          <div
            key={toast.id}
            className={cn(
              "group flex flex-col bg-[var(--app-surface)] rounded-xl shadow-2xl border transition-all duration-500 animate-in slide-in-from-bottom-5",
              "backdrop-blur-xl",
              toast.type === 'error' ? "border-rose-200 dark:border-rose-900/30 shadow-rose-500/10" : "border-[var(--app-border)]"
            )}
          >
            <div className="flex items-center gap-3 p-4">
              <div className="flex-shrink-0">{icons[toast.type]}</div>
              <p className="flex-1 text-xs font-semibold text-[var(--app-text)] leading-tight">
                {toast.message}
              </p>

              <div className="flex items-center gap-1">
                {toast.details && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : toast.id)}
                    className="p-1 hover:bg-[var(--app-surface-hover)] rounded-lg text-[var(--app-text-secondary)] transition-all"
                  >
                    <ChevronDown size={14} className={cn("transition-transform", isExpanded ? "rotate-180" : "")} />
                  </button>
                )}
                <button
                  onClick={() => hideToast(toast.id)}
                  className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-[var(--app-text-secondary)] hover:text-rose-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Expanded Tech Details */}
            {isExpanded && toast.details && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                <div className="bg-[var(--app-bg)] p-3 rounded-lg border border-[var(--app-border)] flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-500">
                    <Terminal size={10} /> التفاصيل التقنية للدعم
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-medium text-[var(--app-text-secondary)] block">Error Code</span>
                      <span className="text-xs font-mono font-medium text-[var(--app-text)]">{toast.details.code}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-[var(--app-text-secondary)] block">Severity</span>
                      <span className={cn(
                        "text-xs font-semibold",
                        toast.details.severity === 'critical' ? "text-rose-500" : "text-amber-500"
                      )}>{toast.details.severity}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar for Auto-hide */}
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--app-border)] rounded-full overflow-hidden">
              <div
                className={cn("h-full animate-toast-progress",
                  toast.type === 'error' ? "bg-rose-500" : "bg-emerald-500"
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
