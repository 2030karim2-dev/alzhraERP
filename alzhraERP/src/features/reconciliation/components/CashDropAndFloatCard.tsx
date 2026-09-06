import React from 'react';
import { Coins, Briefcase } from 'lucide-react';

interface CashDropAndFloatCardProps {
  actualCash: number;
  floatRetained: number;
  onFloatRetainedChange: (val: number) => void;
  cashToOwner?: number;
  disabled?: boolean;
}

export const CashDropAndFloatCard: React.FC<CashDropAndFloatCardProps> = ({
  actualCash,
  floatRetained,
  onFloatRetainedChange,
  cashToOwner: cashToOwnerProp,
  disabled = false,
}) => {
  const cashToOwner =
    cashToOwnerProp ?? Math.max(0, Math.round((actualCash - floatRetained) * 100) / 100);

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--app-text)]">فكة الغد وتوريد كاش المالك</h3>
            <p className="text-[11px] text-[var(--app-text-secondary)]">
              تحديد المبلغ المتروك بالدرج لافتتاح الغد وحساب الصافي المسلم للمالك
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Float Retained */}
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--app-text)]">
              المتبقي بالدرج لصباح الغد (فكة)
            </label>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400">يرحّل تلقائياً</span>
          </div>

          <div className="relative mt-2">
            <input
              type="number"
              min="0"
              step="any"
              disabled={disabled}
              value={floatRetained === 0 ? '' : floatRetained}
              onChange={e => onFloatRetainedChange(parseFloat(e.target.value) || 0)}
              placeholder="مثال: 300"
              className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-card-bg)] px-3 text-base font-bold text-[var(--app-text)] focus:border-indigo-500 focus:outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--app-text-secondary)]">
              ر.س
            </span>
          </div>

          {/* Quick presets */}
          {!disabled && (
            <div className="mt-2 flex items-center gap-1.5">
              {[200, 300, 500].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onFloatRetainedChange(amt)}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                    floatRetained === amt
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[var(--app-card-bg)] text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)]'
                  }`}
                >
                  {amt} ر.س
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Handed to Owner */}
        <div className="flex flex-col justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 dark:bg-emerald-950/20">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>الصافي المسلم للمالك / الخزينة:</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--app-text-secondary)]">
              (الكاش الفعلي الموجود - فكة الغد)
            </p>
          </div>

          <div className="mt-3 text-left">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {cashToOwner.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
