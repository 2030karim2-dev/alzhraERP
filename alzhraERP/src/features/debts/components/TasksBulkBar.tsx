import React from 'react';
import { UserCheck, UserX } from 'lucide-react';
import { SELECT_CLASS } from './tasksFilterOptions';
import type { DebtCollector } from '../types';

interface TasksBulkBarProps {
  selectedTasks: number;
  selectedParties: number;
  collectors: DebtCollector[];
  value: string;
  onChange: (value: string) => void;
  onAssign: () => void;
  onUnassign: () => void;
  isSaving: boolean;
}

/** شريط الإجراءات الجماعية — يعمل على تحديد الشبكة الحالي. */
const TasksBulkBar: React.FC<TasksBulkBarProps> = ({
  selectedTasks,
  selectedParties,
  collectors,
  value,
  onChange,
  onAssign,
  onUnassign,
  isSaving,
}) => (
  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 dark:border-blue-900/40 dark:bg-blue-950/20">
    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
      محدد: {selectedTasks} مهمة ({selectedParties} عميل)
    </span>
    <select
      value={value}
      title="محصّل الإسناد الجماعي"
      onChange={e => {
        onChange(e.target.value);
      }}
      className={SELECT_CLASS}
    >
      <option value="">اختر محصّلاً للإسناد...</option>
      {collectors.map(collector => (
        <option key={collector.collector_id} value={collector.collector_id}>
          {collector.full_name}
        </option>
      ))}
    </select>
    <button
      type="button"
      onClick={onAssign}
      disabled={value === '' || isSaving}
      className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <UserCheck size={13} />
      إسناد المحدد
    </button>
    <button
      type="button"
      onClick={onUnassign}
      disabled={isSaving}
      className="flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:bg-slate-800"
    >
      <UserX size={13} />
      إلغاء الإسناد
    </button>
  </div>
);

export default TasksBulkBar;
