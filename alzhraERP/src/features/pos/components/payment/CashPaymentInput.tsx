import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { QUICK_AMOUNTS } from './categorizeAccounts';

interface CashPaymentInputProps {
    received: string;
    onReceivedChange: (value: string) => void;
    total: number;
    currency: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

export const CashPaymentInput: React.FC<CashPaymentInputProps> = ({
    received, onReceivedChange, total, currency, inputRef
}) => {
    const { t } = useTranslation();
    const receivedNum = parseFloat(received) || 0;
    const change = receivedNum - total;

    return (
        <div className="px-4 pt-3 pb-1 space-y-3">
            <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    {t('amount_received_from_customer')}
                </label>
                <input
                    ref={inputRef}
                    type="number"
                    value={received}
                    onChange={e => onReceivedChange(e.target.value)}
                    className="w-full text-center text-3xl font-black py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl outline-none font-mono text-slate-800 dark:text-white focus:bg-blue-50/20 dark:focus:bg-blue-900/10 border border-slate-200 dark:border-slate-700 focus:border-blue-400 transition-all"
                    dir="ltr"
                    placeholder="0"
                    min={0}
                />
            </div>

            <div className="grid grid-cols-6 gap-1.5">
                {QUICK_AMOUNTS.map(amt => (
                    <button
                        key={amt}
                        type="button"
                        onClick={() => onReceivedChange(String(amt))}
                        className={cn(
                            "py-1.5 text-[10px] font-bold rounded-lg border transition-all active:scale-95",
                            receivedNum === amt
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600"
                        )}
                    >
                        {(amt / 1000)}K
                    </button>
                ))}
            </div>

            {receivedNum > 0 && (
                <div className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3 border",
                    change >= 0
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30"
                        : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30"
                )}>
                    <div>
                        <p className={cn("text-[10px] font-bold uppercase tracking-wider",
                            change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                        )}>
                            {change >= 0 ? t('change_due') : "المبلغ المتبقي"}
                        </p>
                        <p dir="ltr" className={cn("text-2xl font-black font-mono mt-0.5",
                            change >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"
                        )}>
                            {change >= 0 && change.toLocaleString()} {change < 0 && '-' + Math.abs(change).toLocaleString()} {currency}
                        </p>
                    </div>
                    {change < 0 && (
                        <AlertCircle size={20} className="text-rose-400" />
                    )}
                </div>
            )}
        </div>
    );
};

export default CashPaymentInput;