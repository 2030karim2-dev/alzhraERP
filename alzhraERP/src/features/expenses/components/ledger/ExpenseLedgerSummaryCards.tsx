/* eslint-disable max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';
import { formatCurrency } from '@/core/utils';
import type { LedgerMetrics } from './types';

interface ExpenseLedgerSummaryCardsProps {
  selectedAccount?:
    | {
        name: string;
        code: string;
        currency_code?: string | null | undefined;
      }
    | null
    | undefined;
  ledgerMetrics: LedgerMetrics;
}

export const ExpenseLedgerSummaryCards: React.FC<ExpenseLedgerSummaryCardsProps> = ({
  selectedAccount,
  ledgerMetrics,
}) => {
  if (!selectedAccount) return null;

  const code = selectedAccount.code || '';
  const name = selectedAccount.name || '';
  const isEmployeeOrCustody =
    code.startsWith('140') ||
    name.includes('راتب') ||
    name.includes('عهدة') ||
    name.includes('سلفة');
  const isCashbox = code.startsWith('101') || code.startsWith('102') || name.includes('صندوق');

  const debitLabel = isEmployeeOrCustody
    ? 'إجمالي ما عليه (صرف عهدة)'
    : isCashbox
      ? 'إجمالي الوارد (إيداع)'
      : 'إجمالي ما عليه (صرف)';

  const debitBadge = isCashbox ? 'وارد (+)' : 'عليه (+)';

  const creditLabel = isEmployeeOrCustody
    ? 'إجمالي ما له (سداد فواتير)'
    : isCashbox
      ? 'إجمالي المنصرف (دفع)'
      : 'إجمالي ما له (سداد)';

  const creditBadge = isCashbox ? 'منصرف (-)' : 'له (-)';

  const isZero = Math.abs(ledgerMetrics.closingBalance) < 0.001;
  const isOwed = ledgerMetrics.closingBalance > 0; // عليه

  let balanceStatusText = '';
  let balanceBadgeText = '';
  let badgeColorClass = '';

  if (isZero) {
    balanceStatusText = isEmployeeOrCustody ? 'خالص الذمة' : 'رصيد متزن';
    balanceBadgeText = 'متزن (خالص)';
    badgeColorClass = 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
  } else if (isOwed) {
    balanceStatusText = isEmployeeOrCustody
      ? 'متبقي في ذمته لم يُسدد'
      : isCashbox
        ? 'رصيد متوفر بالصندوق'
        : 'رصيد منصرف مستحق';
    balanceBadgeText = isCashbox ? 'رصيد الصندوق' : 'متبقي عليه';
    badgeColorClass =
      'border border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-300';
  } else {
    balanceStatusText = isEmployeeOrCustody
      ? 'مستحق للموظف بذمة المنشأة'
      : isCashbox
        ? 'عجز بالسحب'
        : 'رصيد دائن مستحق له';
    balanceBadgeText = isCashbox ? 'عجز' : 'مستحق له';
    badgeColorClass =
      'border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-3.5 shadow-xs dark:border-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]">
          الحساب المحدد
        </p>
        <h4 className="truncate text-sm font-black text-[var(--app-text)]">
          {selectedAccount.name}
        </h4>
        <p dir="ltr" className="font-mono text-xs font-bold text-blue-600">
          {selectedAccount.code} • {selectedAccount.currency_code || 'SAR'}
        </p>
      </div>

      <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5 shadow-xs dark:border-rose-900/30 dark:bg-rose-950/20">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
            {debitLabel}
          </p>
          <span className="rounded bg-rose-100 px-1 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
            {debitBadge}
          </span>
        </div>
        <h4 dir="ltr" className="font-mono text-base font-black text-rose-700 dark:text-rose-400">
          {formatCurrency(ledgerMetrics.totalDebit)}
        </h4>
        <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
          {ledgerMetrics.count} حركة مقيدة
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 shadow-xs dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {creditLabel}
          </p>
          <span className="rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
            {creditBadge}
          </span>
        </div>
        <h4
          dir="ltr"
          className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400"
        >
          {formatCurrency(ledgerMetrics.totalCredit)}
        </h4>
        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
          تسويات وسدادات
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5 shadow-xs dark:border-blue-900/30 dark:bg-blue-950/20">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
            صافي الرصيد الختامي
          </p>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${badgeColorClass}`}>
            {balanceBadgeText}
          </span>
        </div>
        <h4 dir="ltr" className="font-mono text-base font-black text-blue-700 dark:text-blue-400">
          {formatCurrency(Math.abs(ledgerMetrics.closingBalance))}
        </h4>
        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
          {balanceStatusText}
        </p>
      </div>
    </div>
  );
};
