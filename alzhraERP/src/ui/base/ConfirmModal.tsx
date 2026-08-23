import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Info, Trash2, HelpCircle } from 'lucide-react';
import { cn } from '../../core/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info' | 'warning' | 'primary';
  isLoading?: boolean;
}

function getModalIcon(variant: ConfirmModalProps['variant']): React.ReactNode {
  switch (variant) {
    case 'danger':
      return <Trash2 className="text-rose-500" size={24} />;
    case 'info':
      return <Info className="text-blue-500" size={24} />;
    case 'warning':
      return <AlertTriangle className="text-amber-500" size={24} />;
    default:
      return <HelpCircle className="text-indigo-500" size={24} />;
  }
}

function getButtonColor(variant: ConfirmModalProps['variant']): string {
  switch (variant) {
    case 'danger':
      return 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20';
    case 'info':
      return 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20';
    case 'warning':
      return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';
    default:
      return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20';
  }
}

function getBgColor(variant: ConfirmModalProps['variant']): string {
  switch (variant) {
    case 'danger':
      return 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40';
    case 'info':
      return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40';
    case 'warning':
      return 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40';
    default:
      return 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200/60 dark:border-indigo-800/40';
  }
}

function getHeaderStripColor(variant: ConfirmModalProps['variant']): string {
  switch (variant) {
    case 'danger':
      return 'bg-rose-500';
    case 'warning':
      return 'bg-amber-500';
    case 'info':
      return 'bg-blue-500';
    default:
      return 'bg-indigo-500';
  }
}

/* eslint-disable max-lines-per-function -- نافذة تأكيد الإجراءات العامة المنبثقة عبر Portal */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'primary',
  isLoading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="animate-in fade-in fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm duration-200"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape' && !isLoading) {
          onClose();
        }
      }}
    >
      {/* Backdrop click area */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={isLoading ? undefined : onClose}
      />

      <div className="animate-in zoom-in-95 relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl duration-200">
        {/* Header Strip */}
        <div className={cn('h-1.5 w-full', getHeaderStripColor(variant))} />

        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className={cn('shrink-0 rounded-xl p-3.5', getBgColor(variant))}>
              {getModalIcon(variant)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 text-lg font-bold leading-tight text-[var(--app-text)] sm:text-xl">
                {title}
              </h3>
              <p className="text-xs font-normal leading-relaxed text-[var(--app-text-secondary)] sm:text-sm">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 sm:mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2.5 text-xs font-bold text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-surface-hover)] active:scale-95 disabled:opacity-50 sm:py-3 sm:text-sm"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
              }}
              disabled={isLoading}
              className={cn(
                'flex flex-[1.5] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 sm:py-3 sm:text-sm',
                getButtonColor(variant)
              )}
            >
              {isLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="pointer-events-none absolute right-0 top-0 p-4 opacity-5">
          <X size={120} className="text-slate-400" />
        </div>
      </div>
    </div>,
    document.body
  );
};
