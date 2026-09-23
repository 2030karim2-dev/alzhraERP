import React from 'react';
import ExcelTable, { type Column } from '../../../ui/common/ExcelTable';
import {
  activityIdFromTaskId,
  countOverdue,
  sumAmountByCurrency,
  totalsLabel,
} from '../lib/taskQueue';
import type { DebtTaskQueueRow } from '../types';

interface TasksGridProps {
  rows: DebtTaskQueueRow[];
  columns: Array<Column<DebtTaskQueueRow>>;
  isLoading: boolean;
  selectedRowIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onComplete: (task: DebtTaskQueueRow) => void;
}

/** شبكة المهام المعيارية (ExcelTable) في مكوّن مستقل لإبقاء الصفحة مختصرة. */
const TasksGrid: React.FC<TasksGridProps> = ({
  rows,
  columns,
  isLoading,
  selectedRowIds,
  onSelectionChange,
  onComplete,
}) => {
  const subtitle = `${String(rows.length)} مهمة · ${String(countOverdue(rows))} متأخرة · ${totalsLabel(
    sumAmountByCurrency(rows)
  )}`;

  return (
    <div className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <ExcelTable
        columns={columns}
        data={rows}
        title="طابور مهام التحصيل"
        subtitle={subtitle}
        resizeStorageKey="debts_tasks_grid_cols"
        colorTheme="blue"
        isRTL
        showSearch
        enableSelection
        enableResize
        enablePagination
        pageSize={25}
        isLoading={isLoading}
        emptyMessage="لا توجد مهام مستحقة في هذه النافذة — عمل رائع!"
        getRowId={task => task.task_id}
        selectedRowIds={selectedRowIds}
        onSelectionChange={onSelectionChange}
        onRowDoubleClick={task => {
          if (activityIdFromTaskId(task.task_id) !== null) onComplete(task);
        }}
      />
    </div>
  );
};

export default TasksGrid;
