import React from 'react';
import { Banknote, Building2 } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import type { POSPaymentMethod } from './paymentTypes';

interface PaymentMethodSelectorProps {
    method: POSPaymentMethod;
    onMethodChange: (method: POSPaymentMethod) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
    method, onMethodChange
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex border-b border-slate-200 dark:border-slate-800 h-12 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
            <button
                type="button"
                onClick={() => onMethodChange('cash')}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all border-l border-slate-200 dark:border-slate-800",
                    method === 'cash'
                        ? "bg-blue-600 text-white shadow-inner shadow-blue-700"
                        : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                )}
            >
                <Banknote size={15} />
                {t('payment_method_cash')}
            </button>
            <button
                type="button"
                onClick={() => onMethodChange('exchange')}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all",
                    method === 'exchange'
                        ? "bg-emerald-600 text-white shadow-inner shadow-emerald-700"
                        : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                )}
            >
                <Building2 size={15} />
                شركة صرافة
            </button>
        </div>
    );
};

export default PaymentMethodSelector;