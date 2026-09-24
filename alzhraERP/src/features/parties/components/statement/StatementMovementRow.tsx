/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Palette,
  Printer,
  Square,
} from 'lucide-react';
import { cn, formatCurrency } from '../../../../core/utils';
import type { StatementMovement } from '../../service';
import { StatementTransactionDetailRow } from './StatementTransactionDetailRow';

interface StatementMovementRowProps {
  row: StatementMovement;
  idx: number;
  isSelected: boolean;
  isExpanded: boolean;
  customColor: string | undefined;
  activeColorPickerRowId: string | null;
  isPrintingSelectedOnly: boolean;
  partyName: string;
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  onToggleExpand: (id: string, e?: React.MouseEvent) => void;
  onOpenColorPicker: (id: string | null) => void;
  onApplyColor: (row: StatementMovement, color: string | null) => void;
  onPrintSingleTransaction: (row: StatementMovement) => void;
  onOpenInvoiceModal: (id: string) => void;
  onOpenBondModal: (bondId: string, movement: StatementMovement) => void;
}

export const StatementMovementRow: React.FC<StatementMovementRowProps> = ({
  row,
  idx,
  isSelected,
  isExpanded,
  customColor,
  activeColorPickerRowId,
  isPrintingSelectedOnly,
  partyName,
  onToggleSelect,
  onToggleExpand,
  onOpenColorPicker,
  onApplyColor,
  onPrintSingleTransaction,
  onOpenInvoiceModal,
  onOpenBondModal,
}) => {
  // Highlighting styling
  const highlightClass =
    customColor === 'emerald'
      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-r-4 border-r-emerald-500 row-colored-emerald'
      : customColor === 'rose'
        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-r-4 border-r-rose-500 row-colored-rose'
        : customColor === 'amber'
          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-r-4 border-r-amber-500 row-colored-amber'
          : customColor === 'blue'
            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-r-4 border-r-blue-500 row-colored-blue'
            : isSelected
              ? 'bg-blue-50/40 dark:bg-blue-950/20'
              : idx % 2 === 0
                ? 'bg-transparent'
                : 'bg-slate-50/40 dark:bg-slate-900/30';

  // Payment Status Meta
  const statusBadge =
    row.payment_status === 'paid' ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        <CheckCircle2 size={10} />
        خالص
      </span>
    ) : row.payment_status === 'partially_paid' ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        <Clock size={10} />
        جزئي
      </span>
    ) : row.payment_status === 'unpaid' ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
        <AlertCircle size={10} />
        غير مسدد
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        تسوية
      </span>
    );

  const isRowHiddenInPrint = isPrintingSelectedOnly && !isSelected;

  return (
    <React.Fragment>
      <tr
        className={cn(
          'cursor-pointer transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/50',
          highlightClass,
          isRowHiddenInPrint && 'print:hidden'
        )}
        onClick={() => onToggleExpand(row.id)}
      >
        {/* Selection Checkbox */}
        <td
          className="no-print border-l border-[var(--app-border)] p-3 text-center"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={e => onToggleSelect(row.id, e)}
            className="text-slate-400 transition-colors hover:text-blue-600"
          >
            {isSelected ? (
              <CheckSquare size={16} className="text-blue-600" />
            ) : (
              <Square size={16} />
            )}
          </button>
        </td>

        {/* Expander Chevron */}
        <td className="no-print border-l border-[var(--app-border)] p-3 text-center text-slate-400">
          {row.reference_id ? (
            <button
              type="button"
              onClick={e => onToggleExpand(row.id, e)}
              className="rounded p-1 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-blue-600" />
              ) : (
                <ChevronRight size={14} className="rotate-180 text-slate-400" />
              )}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
        </td>

        {/* Date */}
        <td
          className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300"
          dir="ltr"
        >
          {row.date}
        </td>

        {/* Reference No */}
        <td
          className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono font-bold text-blue-600"
          dir="ltr"
        >
          {row.ref}
        </td>

        {/* Operation Type & Currency */}
        <td className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center">
          <div className="flex flex-col items-center">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {row.operation_type}
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-400">{row.currency}</span>
          </div>
        </td>

        {/* Description */}
        <td className="border-l border-[var(--app-border)] p-3 text-slate-600 dark:text-slate-300">
          <span className="line-clamp-1" title={row.desc}>
            {row.desc}
          </span>
        </td>

        {/* Status Badge */}
        <td className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center">
          {statusBadge}
        </td>

        {/* Debit */}
        <td
          className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono font-bold text-emerald-600"
          dir="ltr"
        >
          {row.debit > 0 ? formatCurrency(row.debit, row.currency) : '-'}
        </td>

        {/* Credit */}
        <td
          className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono font-bold text-rose-600"
          dir="ltr"
        >
          {row.credit > 0 ? formatCurrency(row.credit, row.currency) : '-'}
        </td>

        {/* Balance */}
        <td
          className={cn(
            'whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono font-bold',
            (row.balance || 0) >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
          )}
          dir="ltr"
        >
          {formatCurrency(row.balance || 0, row.currency)}
        </td>

        {/* Individual Row Actions */}
        <td className="no-print p-3 text-center" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            {/* Quick Palette Button */}
            <div className="relative">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenColorPicker(activeColorPickerRowId === row.id ? null : row.id);
                }}
                title={
                  customColor
                    ? 'تغيير أو إزالة اللون الثابت لهذه المعاملة'
                    : 'تلوين وتمييز المعاملة بلون دائم'
                }
                className={cn(
                  'rounded p-1 transition-colors',
                  customColor === 'emerald'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : customColor === 'rose'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                      : customColor === 'amber'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                        : customColor === 'blue'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800'
                )}
              >
                <Palette size={13} />
              </button>

              {activeColorPickerRowId === row.id && (
                <div
                  className="absolute bottom-full left-0 z-50 mb-1 flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl backdrop-blur"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onApplyColor(row, 'emerald')}
                    className="h-4 w-4 rounded-full border border-white/40 bg-emerald-500 transition-transform hover:scale-125"
                    title="أخضر (خالص / مسدد)"
                  />
                  <button
                    type="button"
                    onClick={() => onApplyColor(row, 'rose')}
                    className="h-4 w-4 rounded-full border border-white/40 bg-rose-500 transition-transform hover:scale-125"
                    title="أحمر (مستحق / غير مسدد)"
                  />
                  <button
                    type="button"
                    onClick={() => onApplyColor(row, 'amber')}
                    className="h-4 w-4 rounded-full border border-white/40 bg-amber-500 transition-transform hover:scale-125"
                    title="كهرماني (جزئي)"
                  />
                  <button
                    type="button"
                    onClick={() => onApplyColor(row, 'blue')}
                    className="h-4 w-4 rounded-full border border-white/40 bg-blue-500 transition-transform hover:scale-125"
                    title="أزرق (هام)"
                  />
                  {customColor && (
                    <button
                      type="button"
                      onClick={() => onApplyColor(row, null)}
                      className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 hover:bg-rose-900/60 hover:text-white"
                      title="إزالة اللون نهائياً"
                    >
                      مسح
                    </button>
                  )}
                </div>
              )}
            </div>

            {row.reference_id && (
              <button
                type="button"
                onClick={() => onPrintSingleTransaction(row)}
                title="عرض المستند والطباعة"
                className="rounded p-1 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40"
              >
                <Printer size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={e => onToggleExpand(row.id, e)}
              title="عرض تفاصيل البنود"
              className="rounded p-1 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40"
            >
              <Eye size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* Expandable Line Items Details */}
      {isExpanded && !isRowHiddenInPrint && (
        <tr className="bg-slate-50/80 dark:bg-slate-900/60 print:hidden">
          <td colSpan={11} className="p-3 pr-10">
            <StatementTransactionDetailRow
              movement={row}
              partyName={partyName}
              onOpenInvoiceModal={onOpenInvoiceModal}
              onOpenBondModal={onOpenBondModal}
            />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};
