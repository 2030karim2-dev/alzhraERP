import React from 'react';
import { CreditCard } from 'lucide-react';
import { useSalesStore } from '../../../sales/store';
import { useDiscountStore } from '../../../settings/taxDiscountStore';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { formatCurrency } from '../../../../core/utils';

interface CartTotalsProps {
  onPay: () => void;
  canPay: boolean;
  isProcessing?: boolean | undefined;
}

export const CartTotals: React.FC<CartTotalsProps> = React.memo(
  ({ onPay, canPay, isProcessing }) => {
    const { t } = useTranslation();
    const { summary, currency } = useSalesStore();
    // [FIX] اشتراك تفاعلي بدل getState() داخل الرندر — القراءة غير المشتركة
    // كانت تعرض صف الخصم حسب قيمة قديمة إن غيّر المتجر دون إعادة رندر.
    const discountEnabled = useDiscountStore(state => state.discountEnabled);

    return (
      <div className="shrink-0 space-y-2 border-t border-slate-800 bg-slate-950 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-white dark:bg-slate-950">
        {/* Subtotal row */}
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>{t('subtotal')}</span>
          <span dir="ltr" className="font-mono">
            {formatCurrency(summary.subtotal)} {currency}
          </span>
        </div>

        {/* Discount row */}
        {discountEnabled && summary.discountAmount > 0 && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-rose-400">
            <span>خصم</span>
            <span dir="ltr" className="font-mono">
              -{formatCurrency(summary.discountAmount)} {currency}
            </span>
          </div>
        )}

        {/* Grand total */}
        <div className="flex items-end justify-between border-t border-white/10 pt-2">
          <span className="text-xs font-black uppercase tracking-wider text-blue-400">
            {t('net_payable')}
          </span>
          <div className="text-right">
            <span
              dir="ltr"
              className="block font-mono text-3xl font-black leading-none tracking-tighter text-white max-md:text-xl"
            >
              {formatCurrency(summary.totalAmount)}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80">
              {currency}
            </span>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={onPay}
          disabled={!canPay || isProcessing}
          className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-base font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:from-blue-700 hover:to-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 max-md:gap-2"
        >
          {isProcessing ? (
            <>
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>جاري إتمام البيع...</span>
            </>
          ) : (
            <>
              <CreditCard size={20} className="transition-transform group-hover:rotate-12" />
              {t('complete_and_pay')}
            </>
          )}
        </button>
      </div>
    );
  }
);

CartTotals.displayName = 'CartTotals';
