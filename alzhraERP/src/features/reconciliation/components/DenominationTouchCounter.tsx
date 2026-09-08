import React from 'react';
import { Banknote, RotateCcw, Calculator, Hash } from 'lucide-react';
import { STANDARD_DENOMINATIONS, reconciliationService } from '../services/reconciliationService';
import { formatCurrency } from '../../../core/utils';
import type { CashDenominationCounts } from '../types';

interface DenominationTouchCounterProps {
  counts: CashDenominationCounts;
  onChange: (counts: CashDenominationCounts) => void;
  manualTotal: number;
  onManualTotalChange: (val: number) => void;
  countMode: 'denominations' | 'quick';
  onCountModeChange: (mode: 'denominations' | 'quick') => void;
  currency?: string | undefined;
  disabled?: boolean | undefined;
}

export const DenominationTouchCounter: React.FC<DenominationTouchCounterProps> = ({
  counts,
  onChange,
  manualTotal,
  onManualTotalChange,
  countMode,
  onCountModeChange,
  currency = 'SAR',
  disabled = false,
}) => {
  const denomTotal = reconciliationService.calculateDenominationsTotal(counts);
  const activeTotal = countMode === 'denominations' ? denomTotal : manualTotal;

  const handleCountChange = (denomKey: string, newCount: number) => {
    const val = Math.max(0, Math.floor(newCount || 0));
    const nextCounts = {
      ...counts,
      [denomKey]: val,
    };
    onChange(nextCounts);
    // Keep manual total in sync
    onManualTotalChange(reconciliationService.calculateDenominationsTotal(nextCounts));
  };

  const handleIncrement = (denomKey: string, step: number) => {
    const current = Number(counts[denomKey]) || 0;
    handleCountChange(denomKey, current + step);
  };

  const handleReset = () => {
    onChange({});
    onManualTotalChange(0);
  };

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-4 shadow-sm transition-all">
      {/* Header & Mode Switcher */}
      <div className="mb-4 flex flex-col gap-3 border-b border-[var(--app-border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--app-text)]">جرد الكاش والنقدية بالدرج</h3>
            <p className="text-[11px] text-[var(--app-text-secondary)]">
              اختر طريقة الجرد: إدخال سريع للمجموع أو تفقيط تفصيلي للفئات
            </p>
          </div>
        </div>

        {/* Mode Toggle & Reset */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onCountModeChange('quick')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${
                countMode === 'quick'
                  ? 'bg-[var(--app-card-bg)] font-bold text-emerald-600 shadow-sm dark:text-emerald-400'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              }`}
            >
              <Hash className="h-3.5 w-3.5" />
              <span>إدخال إجمالي سريع</span>
            </button>
            <button
              type="button"
              onClick={() => onCountModeChange('denominations')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${
                countMode === 'denominations'
                  ? 'bg-[var(--app-card-bg)] font-bold text-emerald-600 shadow-sm dark:text-emerald-400'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>تفقيط الفئات والأوراق</span>
            </button>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleReset}
              title="تصفير الجرد"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-hover)] hover:text-red-500"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode A: Quick Total Input */}
      {countMode === 'quick' ? (
        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-4">
            <label className="mb-1.5 block text-xs font-bold text-[var(--app-text)]">
              إجمالي الكاش الفعلي المعدود بالدرج:
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                disabled={disabled}
                value={manualTotal === 0 ? '' : manualTotal}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  onManualTotalChange(val);
                }}
                placeholder="0.00"
                className="h-12 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-card-bg)] px-4 text-xl font-black text-[var(--app-text)] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--app-text-secondary)]">
                {currency}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-[var(--app-text-secondary)]">
              أدخل القيمة الإجمالية مباشرة إذا تم عد الكاش عبر آلة عد النقود أو تم فرزه مسبقاً.
            </p>
          </div>

          {/* Quick Presets / Visual indicator */}
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold">الكاش الفعلي المعتمد للجرد:</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(activeTotal, currency)}
            </span>
          </div>
        </div>
      ) : (
        /* Mode B: Detailed Denominations Counter */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {STANDARD_DENOMINATIONS.map(({ value, label }) => {
              const key = value.toString();
              const count = Number(counts[key]) || 0;
              const subtotal = value * count;

              return (
                <div
                  key={key}
                  className={`flex flex-col justify-between rounded-lg border p-2.5 transition-all ${
                    count > 0
                      ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
                      : 'border-[var(--app-border)] bg-[var(--app-bg)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--app-text)]">{label}</span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {subtotal > 0 ? formatCurrency(subtotal, currency) : '-'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-1">
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleIncrement(key, -1)}
                        disabled={count === 0}
                        className="flex h-7 w-7 items-center justify-center rounded bg-[var(--app-card-bg)] text-xs font-bold text-[var(--app-text)] shadow-sm hover:bg-[var(--app-hover)] disabled:opacity-40"
                      >
                        -
                      </button>
                    )}

                    <input
                      type="number"
                      min="0"
                      disabled={disabled}
                      value={count === 0 ? '' : count}
                      onChange={e => handleCountChange(key, parseInt(e.target.value, 10) || 0)}
                      placeholder="0"
                      className="h-7 w-full rounded border border-[var(--app-border)] bg-[var(--app-card-bg)] text-center text-xs font-bold text-[var(--app-text)] focus:border-emerald-500 focus:outline-none"
                    />

                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleIncrement(key, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-[var(--app-card-bg)] text-xs font-bold text-[var(--app-text)] shadow-sm hover:bg-[var(--app-hover)]"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold">إجمالي الفئات المحسوبة:</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(activeTotal, currency)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
