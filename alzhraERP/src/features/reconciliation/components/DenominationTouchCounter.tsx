import React from 'react';
import { Banknote, RotateCcw } from 'lucide-react';
import { STANDARD_DENOMINATIONS, reconciliationService } from '../services/reconciliationService';
import type { CashDenominationCounts } from '../types';

interface DenominationTouchCounterProps {
  counts: CashDenominationCounts;
  onChange: (counts: CashDenominationCounts) => void;
  disabled?: boolean;
}

export const DenominationTouchCounter: React.FC<DenominationTouchCounterProps> = ({
  counts,
  onChange,
  disabled = false,
}) => {
  const total = reconciliationService.calculateDenominationsTotal(counts);

  const handleCountChange = (denomKey: string, newCount: number) => {
    const val = Math.max(0, Math.floor(newCount || 0));
    onChange({
      ...counts,
      [denomKey]: val,
    });
  };

  const handleIncrement = (denomKey: string, step: number) => {
    const current = Number(counts[denomKey]) || 0;
    handleCountChange(denomKey, current + step);
  };

  const handleReset = () => {
    onChange({});
  };

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--app-border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--app-text)]">جرد الفئات النقدية بالدرج</h3>
            <p className="text-[11px] text-[var(--app-text-secondary)]">
              أدخل عدد الأوراق النقدية لحساب الإجمالي الفعلي بدقة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left">
            <span className="text-[11px] text-[var(--app-text-secondary)]">الإجمالي المحسوب:</span>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {total.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleReset}
              title="تصفير العداد"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-hover)] hover:text-red-500"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                  {subtotal > 0 ? `${subtotal.toLocaleString('ar-SA')} ر.س` : '-'}
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
    </div>
  );
};
