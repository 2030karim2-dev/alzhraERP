import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface CashPaymentInputProps {
  received: string;
  onReceivedChange: (value: string) => void;
  total: number;
  currency: string;
  exchangeRate?: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const YER_DENOMINATIONS = [5000, 10000, 20000, 50000, 100000];
const SAR_DENOMINATIONS = [20, 50, 100, 200, 500];
const USD_DENOMINATIONS = [10, 20, 50, 100];

export const CashPaymentInput: React.FC<CashPaymentInputProps> = ({
  received,
  onReceivedChange,
  total,
  currency,
  exchangeRate,
  inputRef,
}) => {
  const { t } = useTranslation();
  const receivedNum = parseFloat(received) || 0;
  const change = receivedNum - total;

  const quickChips = React.useMemo(() => {
    if (currency === 'YER') return YER_DENOMINATIONS;
    if (currency === 'USD') return USD_DENOMINATIONS;
    return SAR_DENOMINATIONS;
  }, [currency]);

  const formatChipText = (amt: number) => {
    if (currency === 'YER') {
      if (amt >= 1000) return `${amt / 1000}K`;
      return String(amt);
    }
    return String(amt);
  };

  // Secondary change display in other currency
  const secondaryChangeText = React.useMemo(() => {
    if (!exchangeRate || exchangeRate <= 0 || change <= 0) return null;
    if (currency === 'YER') {
      const sarEquivalent = change / exchangeRate;
      return `(~ ${sarEquivalent.toFixed(2)} ر.س)`;
    }
    if (currency === 'SAR') {
      const yerEquivalent = Math.round(change * exchangeRate);
      return `(~ ${yerEquivalent.toLocaleString('en-US')} ر.ي)`;
    }
    return null;
  }, [change, currency, exchangeRate]);

  return (
    <div className="space-y-3 px-4 pb-1 pt-3 max-md:px-3">
      <div>
        <label className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span>{t('amount_received_from_customer')}</span>
          <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
            {currency === 'YER' ? 'ر.ي (يمني)' : currency === 'SAR' ? 'ر.س (سعودي)' : currency}
          </span>
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

      {/* Quick Amount Chips with Exact button */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            onReceivedChange(String(total));
          }}
          className={cn(
            'flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-black transition-all active:scale-95',
            receivedNum === total && total > 0
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
          )}
        >
          <CheckCircle2 size={13} />
          <span>المبلغ بالضبط ({total.toLocaleString('en-US')})</span>
        </button>

        {quickChips.map(amt => (
          <button
            key={amt}
            type="button"
            onClick={() => {
              onReceivedChange(String(amt));
            }}
            className={cn(
              'rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold transition-all active:scale-95',
              receivedNum === amt
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            {formatChipText(amt)}
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
            <div className="flex items-baseline gap-2">
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
              {secondaryChangeText && (
                <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                  {secondaryChangeText}
                </span>
              )}
            </div>
          </div>
          {change < 0 && <AlertCircle size={20} className="text-rose-400" />}
        </div>
      )}
    </div>
  );
};

export default CashPaymentInput;
