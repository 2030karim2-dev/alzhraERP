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
  received,
  onReceivedChange,
  total,
  currency,
  inputRef,
}) => {
  const { t } = useTranslation();
  const receivedNum = parseFloat(received) || 0;
  const change = receivedNum - total;

  return (
    <div className="space-y-3 px-4 pb-1 pt-3 max-md:px-3">
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('amount_received_from_customer')}
        </label>
        <input
          ref={inputRef}
          type="number"
          step="any"
          value={received}
          onChange={e => {
            onReceivedChange(e.target.value);
          }}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 text-center font-mono text-3xl font-black text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-blue-50/20 dark:border-slate-700 dark:bg-slate-800/40 dark:text-white dark:focus:bg-blue-900/10 max-md:py-3 max-md:text-2xl"
          dir="ltr"
          placeholder="0"
          min={0}
        />
      </div>

      <div className="grid grid-cols-6 gap-1.5 max-md:gap-1">
        {QUICK_AMOUNTS.map(amt => (
          <button
            key={amt}
            type="button"
            onClick={() => {
              onReceivedChange(String(amt));
            }}
            className={cn(
              'rounded-lg border py-1.5 text-[10px] font-bold transition-all active:scale-95',
              receivedNum === amt
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            {amt / 1000}K
          </button>
        ))}
      </div>

      {receivedNum > 0 && (
        <div
          className={cn(
            'flex items-center justify-between rounded-xl border px-4 py-3 max-md:px-3 max-md:py-2',
            change >= 0
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20'
              : 'border-rose-200 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/20'
          )}
        >
          <div>
            <p
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider',
                change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              )}
            >
              {change >= 0 ? t('change_due') : 'المبلغ المتبقي'}
            </p>
            <p
              dir="ltr"
              className={cn(
                'mt-0.5 font-mono text-2xl font-black max-md:text-xl',
                change >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
              )}
            >
              {change >= 0 && change.toLocaleString('en-US')}{' '}
              {change < 0 && '-' + Math.abs(change).toLocaleString('en-US')} {currency}
            </p>
          </div>
          {change < 0 && <AlertCircle size={20} className="text-rose-400" />}
        </div>
      )}
    </div>
  );
};

export default CashPaymentInput;
