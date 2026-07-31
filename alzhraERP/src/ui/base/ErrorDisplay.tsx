
import React from 'react';
import { AlertCircle, RotateCcw, ShieldAlert, ChevronRight } from 'lucide-react';
import { cn } from '../../core/utils';
import { AppError, parseError } from '../../core/utils/errorUtils';

interface Props {
  error: AppError | string | null;
  onRetry?: () => void;
  variant?: 'full' | 'inline' | 'mini';
}

const ErrorDisplay: React.FC<Props> = ({ error, onRetry, variant = 'inline' }) => {
  if (!error) return null;
  const errorObj = typeof error === 'string' ? parseError(error) : error;

  if (variant === 'mini') {
    return (
      <div className="flex items-center gap-2 p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl animate-in fade-in zoom-in">
        <AlertCircle size={14} className="text-rose-500" />
        <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400">{errorObj.message}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden transition-all duration-500",
      variant === 'full' ? "p-12 text-center flex flex-col items-center justify-center min-h-[400px]" : "p-6 rounded-[2rem] border-2",
      errorObj.severity === 'critical' || errorObj.severity === 'high'
        ? "bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30"
        : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30"
    )}>
      <div className={cn(
        "p-4 rounded-[1.5rem] mb-4 shadow-lg animate-bounce duration-[2000ms]",
        errorObj.severity === 'critical' ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-amber-500 text-white shadow-amber-500/20"
      )}>
        <ShieldAlert size={variant === 'full' ? 48 : 24} />
      </div>

      <div className="space-y-2 relative z-10">
        <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tight">تنبيه النظام الذكي</h3>
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">{errorObj.message}</p>

        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="bg-white/50 dark:bg-slate-800 px-3 py-1 rounded-lg border dark:border-slate-700">
            <span className="text-[8px] font-semibold text-gray-400 uppercase mr-1">Code:</span>
            <span className="text-[9px] font-mono font-bold text-blue-600">{errorObj.code}</span>
          </div>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-[10px] font-bold active:scale-95 transition-all shadow-xl"
        >
          <RotateCcw size={14} />
          {errorObj.actionLabel || "إعادة المحاولة"}
          <ChevronRight size={14} className="opacity-30" />
        </button>
      )}

      {/* Background Graphic */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl"></div>
    </div>
  );
};

export default ErrorDisplay;
