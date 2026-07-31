import React from 'react';
import { CreditCard } from 'lucide-react';
import { useSalesStore } from '../../../sales/store';
import { useDiscountStore } from '../../../settings/taxDiscountStore';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { formatCurrency } from '../../../../core/utils';

interface CartTotalsProps {
    onPay: () => void;
    canPay: boolean;
}

export const CartTotals: React.FC<CartTotalsProps> = React.memo(({ onPay, canPay }) => {
    const { t } = useTranslation();
    const { summary, currency } = useSalesStore();

    return (
        <div className="shrink-0 bg-slate-950 dark:bg-slate-950 text-white border-t border-slate-800 px-4 pt-3 pb-4 space-y-2">
            {/* Subtotal row */}
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>{t('subtotal')}</span>
                <span dir="ltr" className="font-mono">{formatCurrency(summary.subtotal)} {currency}</span>
            </div>

            {/* Discount row */}
            {useDiscountStore.getState().discountEnabled && summary.discountAmount > 0 && (
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    <span>خصم</span>
                    <span dir="ltr" className="font-mono">-{formatCurrency(summary.discountAmount)} {currency}</span>
                </div>
            )}

            {/* Grand total */}
            <div className="flex justify-between items-end pt-2 border-t border-white/10">
                <span className="text-xs font-black uppercase tracking-wider text-blue-400">{t('net_payable')}</span>
                <div className="text-right">
                    <span dir="ltr" className="font-black text-3xl text-white font-mono tracking-tighter leading-none block">
                        {formatCurrency(summary.totalAmount)}
                    </span>
                    <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest">{currency}</span>
                </div>
            </div>

            {/* Pay button */}
            <button
                onClick={onPay}
                disabled={!canPay}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 py-4 font-black text-base uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-xl shadow-blue-500/20 rounded-xl group mt-2"
            >
                <CreditCard size={20} className="group-hover:rotate-12 transition-transform" />
                {t('complete_and_pay')}
            </button>
        </div>
    );
});

CartTotals.displayName = 'CartTotals';
