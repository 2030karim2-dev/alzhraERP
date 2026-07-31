import React from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import type { POSPaymentMethod } from './paymentTypes';

interface PaymentModalFooterProps {
    isProcessing: boolean;
    canConfirm: boolean;
    method: POSPaymentMethod;
    onClose: () => void;
    onConfirm: () => void;
}

export const PaymentModalFooter: React.FC<PaymentModalFooterProps> = ({
    isProcessing, canConfirm, method, onClose, onConfirm
}) => {
    const { t } = useTranslation();

    return (
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex gap-2">
            <button
                onClick={onClose}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl transition-all uppercase tracking-wider active:scale-95"
            >
                {t('cancel')} (ESC)
            </button>
            <button
                onClick={onConfirm}
                disabled={!canConfirm}
                className={cn(
                    "flex-[2] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider active:scale-[0.98] shadow-lg",
                    canConfirm
                        ? method === 'exchange'
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none"
                )}
            >
                {isProcessing
                    ? <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />جارٍ الحفظ...</>
                    : <><CheckCircle size={15} />{t('confirm_operation')} (Enter)</>
                }
            </button>
        </div>
    );
};

export default PaymentModalFooter;