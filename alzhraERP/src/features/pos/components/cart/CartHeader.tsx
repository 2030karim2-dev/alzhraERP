import React from 'react';
import { ShoppingCart, PauseCircle, RotateCcw, Coins } from 'lucide-react';
import CustomerSelector from '../../../sales/components/create/CustomerSelector';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { useSalesStore } from '../../../sales/store';

interface CartHeaderProps {
  itemCount: number;
  onSuspend: () => void;
}

export const CartHeader: React.FC<CartHeaderProps> = React.memo(({ itemCount, onSuspend }) => {
  const { t } = useTranslation();
  const { currency, setMetadata, resetCart } = useSalesStore();

  return (
    <div className="shrink-0 space-y-2.5 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 dark:border-slate-800 dark:from-slate-950/80 dark:to-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <ShoppingCart size={13} />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
            {t('active_cart')}
          </span>
          {itemCount > 0 && (
            <span className="min-w-[18px] rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-black text-white shadow-sm">
              {itemCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSuspend}
            disabled={itemCount === 0}
            className="flex items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600 transition-all hover:bg-amber-100 active:scale-95 disabled:opacity-30 dark:border-amber-900/20 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-900/30"
          >
            <PauseCircle size={12} />
            <span className="hidden sm:inline">{t('suspend')}</span>
          </button>
          {itemCount > 0 && (
            <button
              onClick={() => {
                resetCart();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-rose-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:hover:bg-rose-950/30"
              title={t('clear_cart')}
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Customer + Currency row */}
      <div className="flex gap-2">
        <div className="flex-[3]">
          <CustomerSelector compact />
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 text-slate-400">
            <Coins size={11} />
          </div>
          <select
            value={currency}
            onChange={e => {
              setMetadata('currency', e.target.value);
            }}
            className="h-[36px] w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-2 pr-6 text-center text-[10px] font-black outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="YER">YER</option>
            <option value="SAR">SAR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
    </div>
  );
});

CartHeader.displayName = 'CartHeader';
