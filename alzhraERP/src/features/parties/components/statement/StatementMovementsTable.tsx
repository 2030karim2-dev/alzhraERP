/* eslint-disable max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import type { StatementMovement } from '../../service';
import { StatementMovementRow } from './StatementMovementRow';

interface StatementMovementsTableProps {
  filteredMovements: StatementMovement[];
  selectedRowIds: Set<string>;
  expandedRowIds: Set<string>;
  rowColors: Map<string, string>;
  activeColorPickerRowId: string | null;
  isPrintingSelectedOnly: boolean;
  partyName: string;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleRowSelection: (id: string, e?: React.MouseEvent) => void;
  onToggleRowExpand: (id: string, e?: React.MouseEvent) => void;
  onOpenColorPicker: (id: string | null) => void;
  onApplyColorToSingleRow: (row: StatementMovement, color: string | null) => void;
  onPrintSingleTransaction: (row: StatementMovement) => void;
  onOpenInvoiceModal: (id: string) => void;
  onOpenBondModal: (bondId: string, movement: StatementMovement) => void;
}

export const StatementMovementsTable: React.FC<StatementMovementsTableProps> = ({
  filteredMovements,
  selectedRowIds,
  expandedRowIds,
  rowColors,
  activeColorPickerRowId,
  isPrintingSelectedOnly,
  partyName,
  isAllSelected,
  onToggleSelectAll,
  onToggleRowSelection,
  onToggleRowExpand,
  onOpenColorPicker,
  onApplyColorToSingleRow,
  onPrintSingleTransaction,
  onOpenInvoiceModal,
  onOpenBondModal,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-[var(--app-border)] text-right">
          <thead>
            <tr className="border-b border-[var(--app-border)] bg-slate-100/90 text-[11px] font-bold text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
              {/* Checkbox All */}
              <th className="no-print w-10 border-l border-[var(--app-border)] p-3 text-center">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className="text-slate-500 transition-colors hover:text-blue-600"
                  title="تحديد / إلغاء تحديد الكل"
                >
                  {isAllSelected ? (
                    <CheckSquare size={16} className="text-blue-600" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              {/* Expander Column */}
              <th className="no-print w-8 border-l border-[var(--app-border)] p-3 text-center" />
              <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">التاريخ</th>
              <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">المرجع</th>
              <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                نوع العملية
              </th>
              <th className="border-l border-[var(--app-border)] p-3">البيان والتفاصيل</th>
              <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                حالة السداد
              </th>
              <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                مدين (عليه +)
              </th>
              <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                دائن (له -)
              </th>
              <th className="w-36 border-l border-[var(--app-border)] p-3 text-center">
                الرصيد المتراكم
              </th>
              <th className="no-print w-20 p-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)] text-xs">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-12 text-center italic text-slate-400">
                  لا توجد حركات مسجلة لهذا الحساب وفق المعايير المحددة.
                </td>
              </tr>
            ) : (
              filteredMovements.map((row, idx) => {
                const isExpanded = expandedRowIds.has(row.id);
                const isSelected = selectedRowIds.has(row.id);
                const customColor =
                  rowColors.get(row.id) ||
                  (row.reference_id ? rowColors.get(row.reference_id) : undefined) ||
                  (row.ref ? rowColors.get(row.ref) : undefined);

                return (
                  <StatementMovementRow
                    key={row.id}
                    row={row}
                    idx={idx}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    customColor={customColor}
                    activeColorPickerRowId={activeColorPickerRowId}
                    isPrintingSelectedOnly={isPrintingSelectedOnly}
                    partyName={partyName}
                    onToggleSelect={onToggleRowSelection}
                    onToggleExpand={onToggleRowExpand}
                    onOpenColorPicker={onOpenColorPicker}
                    onApplyColor={onApplyColorToSingleRow}
                    onPrintSingleTransaction={onPrintSingleTransaction}
                    onOpenInvoiceModal={onOpenInvoiceModal}
                    onOpenBondModal={onOpenBondModal}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
