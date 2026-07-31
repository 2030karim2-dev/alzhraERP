import React from 'react';
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

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'تأكيد',
    cancelLabel = 'إلغاء',
    variant = 'primary',
    isLoading = false
}) => {
    if (!isOpen) return null;

    const icons = {
        danger: <Trash2 className="text-rose-500" size={24} />,
        info: <Info className="text-blue-500" size={24} />,
        warning: <AlertTriangle className="text-amber-500" size={24} />,
        primary: <HelpCircle className="text-indigo-500" size={24} />,
    };

    const colors = {
        danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20',
        info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
        warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
        primary: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20',
    };

    const bgColors = {
        danger: 'bg-rose-50 dark:bg-rose-900/10',
        info: 'bg-blue-50 dark:bg-blue-900/10',
        warning: 'bg-amber-50 dark:bg-amber-900/10',
        primary: 'bg-indigo-50 dark:bg-indigo-900/10',
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--app-surface)] w-full max-w-md rounded-xl shadow-2xl border border-[var(--app-border)] overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header Strip */}
                <div className={cn("h-1.5 w-full",
                    variant === 'danger' ? 'bg-rose-500' :
                        variant === 'warning' ? 'bg-amber-500' :
                            variant === 'info' ? 'bg-blue-500' : 'bg-indigo-500'
                )} />

                <div className="p-8">
                    <div className="flex items-start gap-4">
                        <div className={cn("p-4 rounded-xl shrink-0", bgColors[variant])}>
                            {icons[variant]}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-[var(--app-text)] mb-2 leading-tight">
                                {title}
                            </h3>
                            <p className="text-sm text-[var(--app-text-secondary)] font-normal leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3.5 rounded-lg text-sm font-semibold text-[var(--app-text-secondary)] bg-[var(--app-bg)] hover:bg-[var(--app-surface-hover)] transition-all active:scale-95 disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                            }}
                            disabled={isLoading}
                            className={cn(
                                "flex-[1.5] px-6 py-3.5 rounded-lg text-sm font-semibold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50",
                                colors[variant]
                            )}
                        >
                            {isLoading && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            {confirmLabel}
                        </button>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <X size={120} className="text-slate-400" />
                </div>
            </div>
        </div>
    );
};
