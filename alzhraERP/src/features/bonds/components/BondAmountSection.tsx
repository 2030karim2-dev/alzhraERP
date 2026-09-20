import React from 'react';
import { DollarSign, Tag, Calculator, Coins } from 'lucide-react';
import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { cn, formatCurrency, formatNumber } from '../../../core/utils';
import type { BondType, BondFormData } from '../types';

interface CurrencyOption {
  code: string;
}

interface BondAmountSectionProps {
  type: BondType;
  register: UseFormRegister<BondFormData>;
  watch: UseFormWatch<BondFormData>;
  currencies: { data: CurrencyOption[] | undefined };

  selectedCurrency: string;
  amountInputStr: string;
  rateInputStr: string;
  equivalentSarInputStr: string;
  isDivide: boolean;
  enteredAmount: number;
  tafqeetText: string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleEquivalentSarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCalculateRateFromEquivalent: () => void;
  handleCurrencyQuickSwitch: (code: string) => void;
  handleQuickAmount: (amount: number) => void;
  handleClearAmount: () => void;
}

const QUICK_AMOUNTS_YER = [10000, 50000, 100000, 500000, 1000000, 5000000];
const QUICK_AMOUNTS_DEFAULT = [100, 500, 1000, 5000, 10000];

const CURRENCY_TABS: Array<{ code: string; label: string }> = [
  { code: 'SAR', label: 'SAR (سعودي)' },
  { code: 'YER', label: 'YER (ريال يمني)' },
  { code: 'USD', label: 'USD' },
];

/** Compact label for a quick-amount preset (e.g. 1000000 renders as 1M). */
const formatPresetValue = (val: number): string => {
  if (val >= 1000000) return `+${String(val / 1000000)}M`;
  if (val >= 1000) return `+${String(val / 1000)}K`;
  return `+${String(val)}`;
};

/** Amount, currency switcher, exchange-rate controls and quick presets. */
/* eslint-disable max-lines-per-function, complexity -- single amount/currency workspace: currency tabs + amount + FX controls + presets share one formatting contract; the per-row JSX is simple markup. */
export const BondAmountSection: React.FC<BondAmountSectionProps> = ({
  type,
  register,
  watch,
  currencies,
  selectedCurrency,
  amountInputStr,
  rateInputStr,
  equivalentSarInputStr,
  isDivide,
  enteredAmount,
  tafqeetText,
  handleAmountChange,
  handleRateChange,
  handleEquivalentSarChange,
  handleCalculateRateFromEquivalent,
  handleCurrencyQuickSwitch,
  handleQuickAmount,
  handleClearAmount,
}) => {
  const otherCurrencyOptions = (currencies.data ?? []).filter(
    c => c.code !== 'SAR' && c.code !== 'YER'
  );
  const quickAmounts = selectedCurrency === 'YER' ? QUICK_AMOUNTS_YER : QUICK_AMOUNTS_DEFAULT;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border-2 p-4 shadow-sm transition-all sm:rounded-3xl sm:p-6',
        type === 'receipt'
          ? 'border-emerald-100 bg-emerald-50/40 dark:border-emerald-800/20 dark:bg-emerald-900/10'
          : type === 'transfer'
            ? 'border-blue-100 bg-blue-50/40 dark:border-blue-800/20 dark:bg-blue-900/10'
            : 'border-rose-100 bg-rose-50/40 dark:border-rose-800/20 dark:bg-rose-900/10'
      )}
    >
      {/* Currency quick switcher tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <Coins size={15} className="text-slate-500 dark:text-slate-400" />
          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
            عملة السند:
          </span>
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {CURRENCY_TABS.map(tab => (
              <button
                key={tab.code}
                type="button"
                onClick={() => {
                  handleCurrencyQuickSwitch(tab.code);
                }}
                className="rounded-lg px-2.5 py-1 font-mono text-[11px] font-black transition-all"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">عملات أخرى:</span>
          <div className="relative">
            <select
              {...register('currency_code')}
              onChange={e => {
                handleCurrencyQuickSwitch(e.target.value);
              }}
              className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1 pr-6 text-xs font-bold text-slate-800 outline-none hover:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="SAR">SAR</option>
              <option value="YER">YER</option>
              {otherCurrencyOptions.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <Tag
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={11}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center">
        {/* Primary Amount Input */}
        <div className="relative w-full flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span
              className={cn(
                'inline-block rounded-t-xl px-3 py-0.5 text-xs font-black uppercase tracking-widest text-white',
                type === 'receipt'
                  ? 'bg-emerald-600'
                  : type === 'transfer'
                    ? 'bg-blue-600'
                    : 'bg-rose-600'
              )}
            >
              المبلغ المطلوب ({selectedCurrency})
            </span>
            {selectedCurrency === 'YER' && (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                ⚡ دعم مبالغ الريال اليمني الكبيرة
              </span>
            )}
          </div>
          <div className="group relative">
            <input
              type="text"
              inputMode="decimal"
              value={amountInputStr}
              onChange={handleAmountChange}
              placeholder="0.00"
              className={cn(
                'w-full rounded-2xl border-2 bg-white px-4 py-3 font-mono text-2xl font-black outline-none transition-all dark:bg-slate-950 sm:px-5 sm:py-3.5 sm:text-3xl',
                type === 'receipt'
                  ? 'border-emerald-200 text-emerald-600 focus:border-emerald-500 dark:border-emerald-800/50'
                  : type === 'transfer'
                    ? 'border-blue-200 text-blue-600 focus:border-blue-500 dark:border-blue-800/50'
                    : 'border-rose-200 text-rose-600 focus:border-rose-500 dark:border-rose-800/50'
              )}
            />
            <DollarSign
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 opacity-20 sm:left-5',
                type === 'receipt'
                  ? 'text-emerald-600'
                  : type === 'transfer'
                    ? 'text-blue-600'
                    : 'text-rose-600'
              )}
              size={26}
            />
          </div>

          {/* Instant Tafqeet & Digit Formatting */}
          {enteredAmount > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100">
                {formatNumber(enteredAmount)} {selectedCurrency}
              </span>
              {tafqeetText !== '' && (
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  ({tafqeetText})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Foreign Currency & Auto Exchange Rate Controls */}
        {selectedCurrency !== 'SAR' && (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-850 sm:w-auto sm:flex-row">
            {/* Exchange Rate Input */}
            <div className="w-full sm:w-36">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  سعر الصرف {isDivide ? '(÷)' : '(×)'}
                </span>
                {selectedCurrency === 'YER' && (
                  <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                    YER
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={rateInputStr}
                onChange={handleRateChange}
                placeholder="1.0"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-2 py-1.5 text-center font-mono text-xs font-black text-slate-800 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {selectedCurrency === 'YER' && (
                <div className="mt-0.5 text-center font-mono text-[10px] font-bold text-slate-400">
                  1 ر.س = {rateInputStr !== '' ? rateInputStr : '410'} ر.ي
                </div>
              )}
            </div>

            {/* Equivalent in Base Currency (SAR) with Auto-Rate Button */}
            <div className="w-full sm:w-44">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  المقابل (SAR)
                </span>
                <button
                  type="button"
                  onClick={handleCalculateRateFromEquivalent}
                  title="حساب سعر الصرف تلقائياً من المقابل"
                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                >
                  <Calculator size={11} />
                  <span>احسب الصرف</span>
                </button>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={equivalentSarInputStr}
                onChange={handleEquivalentSarChange}
                placeholder="0.00"
                className="w-full rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 px-2 py-1.5 text-center font-mono text-xs font-black text-blue-700 outline-none transition-colors focus:border-blue-500 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-300"
              />
              <div className="mt-0.5 text-center text-[10px] text-slate-400">
                {formatCurrency(watch('amount') || 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Presets row adaptive to currency */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/50 pt-2 dark:border-slate-800/50">
        <span className="ml-1 text-[10px] font-bold text-slate-400">
          إضافة سريعة ({selectedCurrency}):
        </span>
        {quickAmounts.map(val => (
          <button
            key={val}
            type="button"
            onClick={() => {
              handleQuickAmount(val);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-600 transition-all hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {formatPresetValue(val)}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClearAmount}
          className="mr-auto rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 transition-all hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
        >
          تصفير
        </button>
      </div>
    </div>
  );
};

export default BondAmountSection;
