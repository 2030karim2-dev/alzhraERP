/**
 * أعمدة شبكة طابور المهام — بناة صغيرة (حد المشروع: 50 سطراً للدالة).
 */
import { CheckCircle2 } from 'lucide-react';
import type { Column } from '../../../ui/common/ExcelTable';
import { escalationLabel } from '../lib/constants';
import {
  activityIdFromTaskId,
  assignmentPriorityLabel,
  sumAmountByCurrency,
  taskTypeLabel,
  totalsLabel,
  urgencyClasses,
} from '../lib/taskQueue';
import type { DebtTaskQueueRow } from '../types';

export interface TaskColumnOptions {
  showManage: boolean;
  onComplete: (task: DebtTaskQueueRow) => void;
}

const partyColumn = (): Column<DebtTaskQueueRow> => ({
  header: 'العميل',
  accessorKey: 'party_name',
  sortKey: 'party_name',
  width: '200px',
  accessor: task => (
    <div className="min-w-0">
      <span className="block truncate text-xs font-bold text-[var(--app-text)]">
        {task.party_name}
      </span>
      <span className="block font-mono text-[10px] text-[var(--app-text-secondary)]" dir="ltr">
        {task.party_phone ?? '—'}
      </span>
    </div>
  ),
});

const typeColumn = (): Column<DebtTaskQueueRow> => ({
  header: 'نوع المهمة',
  accessorKey: 'task_type',
  sortKey: 'task_type',
  width: '140px',
  accessor: task => (
    <span
      className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold ${urgencyClasses(task.urgency)}`}
    >
      {taskTypeLabel(task.task_type)}
    </span>
  ),
});

const priorityColumn = (): Column<DebtTaskQueueRow> => ({
  header: 'الأولوية',
  accessorKey: 'priority',
  width: '90px',
  align: 'center',
  accessor: task => (
    <span className="text-xs font-bold text-[var(--app-text)]">
      {assignmentPriorityLabel(task.priority)}
    </span>
  ),
});

const stageColumn = (): Column<DebtTaskQueueRow> => ({
  header: 'مرحلة التصعيد',
  accessorKey: 'escalation_stage',
  width: '110px',
  align: 'center',
  accessor: task => (
    <span className="text-xs font-bold text-[var(--app-text-secondary)]">
      {escalationLabel(task.escalation_stage)}
    </span>
  ),
});

const referenceColumn = (): Column<DebtTaskQueueRow> => ({
  header: 'المرجع',
  accessorKey: 'reference_info',
  width: '150px',
  accessor: task => (
    <span className="text-xs text-[var(--app-text-secondary)]">{task.reference_info ?? '—'}</span>
  ),
});

export const buildTaskColumns = (options: TaskColumnOptions): Array<Column<DebtTaskQueueRow>> => [
  partyColumn(),
  typeColumn(),
  priorityColumn(),
  stageColumn(),
  referenceColumn(),
  dueColumn(),
  amountColumn(),
  ownerColumn(),
  actionsColumn(options),
];
const dueColumn = (): Column<DebtTaskQueueRow> => ({
  header: 'الاستحقاق',
  accessorKey: 'due_at',
  width: '110px',
  align: 'center',
  accessor: task => (
    <span
      className={`font-mono text-xs font-bold ${task.is_overdue ? 'text-rose-600' : 'text-[var(--app-text-secondary)]'}`}
      dir="ltr"
    >
      {task.due_at !== null ? task.due_at.slice(0, 10) : '—'}
    </span>
  ),
});

const amountColumn = (): Column<DebtTaskQueueRow> => ({
  header: 'المبلغ',
  accessorKey: 'amount',
  sortKey: 'amount',
  width: '130px',
  align: 'left',
  accessor: task =>
    task.amount === null ? (
      <span className="text-xs text-[var(--app-text-secondary)]">—</span>
    ) : (
      <span className="font-mono text-xs font-bold text-[var(--app-text)]" dir="ltr">
        {task.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
        {task.currency_code ?? ''}
      </span>
    ),
  footer: data => (
    <span className="font-mono text-[10px] font-bold text-[var(--app-text)]" dir="ltr">
      {totalsLabel(sumAmountByCurrency(data))}
    </span>
  ),
});

const ownerColumn = (): Column<DebtTaskQueueRow> => ({
  header: 'المسؤول',
  accessorKey: 'assigned_name',
  width: '130px',
  accessor: task =>
    task.assigned_name !== null ? (
      <span className="text-xs font-bold text-emerald-600">{task.assigned_name}</span>
    ) : (
      <span className="text-[10px] font-bold text-amber-600">غير مُسند</span>
    ),
});

const actionsColumn = (options: TaskColumnOptions): Column<DebtTaskQueueRow> => ({
  header: 'إجراءات',
  width: '100px',
  align: 'center',
  accessor: task => {
    if (!options.showManage || activityIdFromTaskId(task.task_id) === null) {
      return <span className="text-[10px] text-[var(--app-text-secondary)]">—</span>;
    }
    return (
      <button
        type="button"
        onClick={() => {
          options.onComplete(task);
        }}
        title="إتمام الإجراء المجدول وجدولة التالي"
        className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white"
      >
        <CheckCircle2 size={12} />
        إتمام
      </button>
    );
  },
});
