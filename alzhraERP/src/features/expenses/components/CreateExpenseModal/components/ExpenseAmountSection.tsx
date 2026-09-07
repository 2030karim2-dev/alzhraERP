import React from 'react';
import { DollarSign, Sparkles, Edit3 } from 'lucide-react';
import type { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import type { ExpenseFormData } from '../../../types';
import { convertToBaseCurrency, cn } from '../../../../../core/utils';

interface ExpenseAmountSectionProps {
  register: UseFormRegister<ExpenseFormData>;
  currenciesData: any[];
  watch: UseFormWatch<ExpenseFormData>;
  setValue: UseFormSetValue<ExpenseFormData>;
  isManualRate?: boolean;
  onToggleManualRate?: () => void;
}

export const ExpenseAmountSection: React.FC<ExpenseAmountSectionProps> = ({
  register,
  currenciesData,
  watch,
  setValue,
  isManualRate = false,
  onToggleManualRate,
}) => {
  const selectedCurrency = watch('currency_code');
  const amount = watch('amount') || 0;
  const exchangeRate = watch('exchange_rate') || 1;

  const currencyObj = currenciesData?.find((c: any) => c.code === selectedCurrency);
  const isDivide = currencyObj?.exchange_operator === 'divide' || selectedCurrency === 'YER';

  return (
    <div className="flex flex-col gap-4 border-b bg-[var(--app-surface)] p-5 dark:border-slate-800">
      <div className="flex flex-row items-end gap-4">
        <div className="flex-1">
          <label className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">
            المبلغ المطلوب صرفه
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              {...register('amount', { required: true, min: 0.01, valueAsNumber: true })}
              className="w-full rounded-xl border-2 border-rose-100 bg-white px-4 py-3 font-mono text-2xl font-bold text-rose-600 outline-none transition-all focus:border-rose-500 dark:border-rose-900/30 dark:bg-slate-950 dark:text-rose-400"
              placeholder="0.00"
            />
            <DollarSign
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-300"
              size={20}
            />
          </div>
        </div>

        {selectedCurrency !== 'SAR' && (
          <div className="flex w-36 shrink-0 flex-col justify-end">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <label className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                سعر الصرف {isDivide ? '(÷)' : '(×)'}
              </label>
              {onToggleManualRate && (
                <button
                  type="button"
                  onClick={onToggleManualRate}
                  className={cn(
                    'flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                    isManualRate
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                  )}
                  title={isManualRate ? 'انقر للرجوع للسعر التلقائي' : 'انقر لتعديل السعر يدوياً'}
                >
                  {isManualRate ? (
                    <>
                      <Edit3 size={11} />
                      <span>يدوي</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={11} />
                      <span>تلقائي</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.000001"
                readOnly={!isManualRate}
                value={exchangeRate || ''}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setValue('exchange_rate', val || 1, { shouldValidate: true });
                }}
                className={cn(
                  'w-full rounded-xl px-3 py-3 text-center font-mono text-sm font-bold outline-none transition-all',
                  isManualRate
                    ? 'border-2 border-amber-400 bg-white text-amber-700 shadow-xs focus:ring-2 focus:ring-amber-500/20 dark:border-amber-500 dark:bg-slate-950 dark:text-amber-300'
                    : 'cursor-default select-all border-2 border-dashed border-gray-200 bg-gray-100/90 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                )}
              />
            </div>
          </div>
        )}

        <div className="w-24 shrink-0 space-y-1.5">
          <label className="block text-center text-[10px] font-bold uppercase text-gray-400">
            العملة
          </label>
          <select
            {...register('currency_code')}
            className="w-full appearance-none rounded-xl border-2 border-gray-100 bg-gray-50 p-3 text-center text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-800"
          >
            {currenciesData?.map((c: any) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCurrency !== 'SAR' && amount > 0 && exchangeRate > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-500">
            المعادل بالعملة المرجعية (SAR)
          </span>
          <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-500">
            {convertToBaseCurrency({
              amount,
              currencyCode: selectedCurrency || 'SAR',
              exchangeRate,
              exchangeOperator: isDivide ? 'divide' : 'multiply',
            }).toFixed(2)}{' '}
            SAR
          </span>
        </div>
      )}
    </div>
  );
};
