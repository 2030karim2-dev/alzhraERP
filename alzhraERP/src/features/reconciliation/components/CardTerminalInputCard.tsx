import React from 'react';
import { CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CardTerminalInputCardProps {
  expectedCard: number;
  actualCard: number;
  onActualCardChange: (val: number) => void;
  terminalRef: string;
  onTerminalRefChange: (val: string) => void;
  disabled?: boolean;
}

export const CardTerminalInputCard: React.FC<CardTerminalInputCardProps> = ({
  expectedCard,
  actualCard,
  onActualCardChange,
  terminalRef,
  onTerminalRefChange,
  disabled = false,
}) => {
  const variance = Math.round((actualCard - expectedCard) * 100) / 100;
  const isMatch = Math.abs(variance) === 0;

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--app-text)]">مطابقة ماكينة الشبكة (مدى)</h3>
            <p className="text-[11px] text-[var(--app-text-secondary)]">
              أدخل إجمالي تقرير الموازنة (Z-Report) المستخرج من ماكينة البنك
            </p>
          </div>
        </div>

        <div className="text-left">
          <span className="text-[11px] text-[var(--app-text-secondary)]">المتوقع بالنظام:</span>
          <div className="text-sm font-bold text-[var(--app-text)]">
            {expectedCard.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
            إجمالي تقرير الماكينة الفعلي *
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              disabled={disabled}
              value={actualCard}
              onChange={e => {
                const val = e.target.value;
                onActualCardChange(val === '' ? 0 : parseFloat(val) || 0);
              }}
              placeholder="0.00"
              className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-base font-bold text-[var(--app-text)] focus:border-cyan-500 focus:outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--app-text-secondary)]">
              ر.س
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--app-text-secondary)]">
            رقم تقرير الماكينة / مرجع الإيصال (اختياري)
          </label>
          <input
            type="text"
            disabled={disabled}
            value={terminalRef}
            onChange={e => onTerminalRefChange(e.target.value)}
            placeholder="مثال: BATCH-4921"
            className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-xs text-[var(--app-text)] focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Variance indicator */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--app-bg)] p-2.5 text-xs">
        <span className="font-semibold text-[var(--app-text-secondary)]">حالة مطابقة الشبكة:</span>
        {isMatch ? (
          <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>متطابق 100% مع فواتير النظام</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span>
              يوجد فارق {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)} ر.س
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
