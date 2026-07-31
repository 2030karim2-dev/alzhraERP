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
        <div className="shrink-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950/80 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-600 text-white flex items-center justify-center rounded-lg shadow-md shadow-blue-500/20">
                        <ShoppingCart size={13} />
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{t('active_cart')}</span>
                    {itemCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center shadow-sm">
                            {itemCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onSuspend}
                        disabled={itemCount === 0}
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/30 px-2 py-1 rounded-lg transition-all flex items-center gap-1 disabled:opacity-30 active:scale-95 border border-amber-100 dark:border-amber-900/20"
                    >
                        <PauseCircle size={12} />
                        <span className="hidden sm:inline">{t('suspend')}</span>
                    </button>
                    {itemCount > 0 && (
                        <button
                            onClick={() => resetCart()}
                            className="w-6 h-6 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all active:scale-95"
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
                <div className="flex-1 relative">
                    <div className="absolute top-1/2 -translate-y-1/2 right-2 text-slate-400 pointer-events-none z-10">
                        <Coins size={11} />
                    </div>
                    <select
                        value={currency}
                        onChange={(e) => setMetadata('currency', e.target.value)}
                        className="w-full h-[36px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black pr-6 pl-2 outline-none appearance-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 dark:text-white text-center cursor-pointer transition-all"
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
