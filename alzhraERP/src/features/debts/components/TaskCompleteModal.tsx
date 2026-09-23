import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DebtsModalShell } from './DebtsModalShell';
import { useDebtMutations } from '../hooks/useDebtMutations';
import { formatLocalDate } from '../../../core/utils/dateUtils';
import { activityIdFromTaskId } from '../lib/taskQueue';
import type { DebtTaskQueueRow } from '../types';

interface TaskCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DebtTaskQueueRow | null;
}

/** نتائج التحصيل القياسية. */
const OUTCOMES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'paid', label: 'تم السداد' },
  { value: 'promise', label: 'وعد سداد' },
  { value: 'partial', label: 'وعد جزئي' },
  { value: 'refused', label: 'رفض السداد' },
  { value: 'no_answer', label: 'لا يوجد رد' },
  { value: 'wrong_number', label: 'رقم غير صحيح' },
  { value: 'dispute', label: 'نزاع على المبلغ' },
];

const FIELD_LABEL = 'block text-[10px] font-extrabold uppercase tracking-wider text-gray-400';
const FIELD_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800';

/** تاريخ الإجراء التالي الافتراضي (3 أيام) — محلي بلا انزياح توقيت. */
const defaultNextDate = (): string => formatLocalDate(new Date(Date.now() + 3 * 86400000));

const OutcomeField: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value,
  onChange,
}) => (
  <div className="space-y-1.5">
    <label htmlFor="task-outcome" className={FIELD_LABEL}>
      نتيجة التواصل
    </label>
    <select
      id="task-outcome"
      value={value}
      onChange={e => {
        onChange(e.target.value);
      }}
      className={FIELD_CLASS}
    >
      {OUTCOMES.map(item => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  </div>
);

const NotesField: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value,
  onChange,
}) => (
  <div className="space-y-1.5">
    <label htmlFor="task-notes" className={FIELD_LABEL}>
      ملاحظات
    </label>
    <textarea
      id="task-notes"
      value={value}
      rows={3}
      onChange={e => {
        onChange(e.target.value);
      }}
      className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800/60"
    />
  </div>
);

interface ScheduleRowProps {
  enabled: boolean;
  date: string;
  onToggle: (enabled: boolean) => void;
  onDateChange: (date: string) => void;
}

const ScheduleRow: React.FC<ScheduleRowProps> = ({ enabled, date, onToggle, onDateChange }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3">
    <label className="flex items-center gap-2 text-xs font-bold text-[var(--app-text)]">
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => {
          onToggle(e.target.checked);
        }}
        className="h-4 w-4 rounded border-gray-300"
      />
      جدولة إجراء متابعة تالٍ
    </label>
    <input
      type="date"
      value={date}
      disabled={!enabled}
      onChange={e => {
        onDateChange(e.target.value);
      }}
      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
    />
  </div>
);

interface TaskFormPayload {
  outcome: string;
  notes: string;
  nextActionDate: string | null;
}

/** نموذج النتيجة + الإجراء التالي (حالة محلية تُصفَّر بإغلاق النافذة). */
const TaskForm: React.FC<{
  isSubmitting: boolean;
  onSubmit: (payload: TaskFormPayload) => void;
}> = ({ isSubmitting, onSubmit }) => {
  const [outcome, setOutcome] = useState('promise');
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState(defaultNextDate());
  const [scheduleNext, setScheduleNext] = useState(true);

  return (
    <div className="space-y-4">
      <OutcomeField value={outcome} onChange={setOutcome} />
      <NotesField value={notes} onChange={setNotes} />
      <ScheduleRow
        enabled={scheduleNext}
        date={nextDate}
        onToggle={setScheduleNext}
        onDateChange={setNextDate}
      />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            onSubmit({
              outcome,
              notes: notes.trim(),
              nextActionDate: scheduleNext ? nextDate : null,
            });
          }}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'جارٍ الحفظ...' : 'إتمام المهمة'}
        </button>
      </div>
    </div>
  );
};

/** S2: إتمام مهمة مجدولة (+ جدولة التالي) — الإتمام idempotent على الخادم. */
const TaskCompleteModal: React.FC<TaskCompleteModalProps> = ({ isOpen, onClose, task }) => {
  const { completeTask, isSaving } = useDebtMutations();

  if (!isOpen || task === null) return null;
  const activityId = activityIdFromTaskId(task.task_id);

  const submit = (payload: TaskFormPayload): void => {
    if (activityId === null) return;
    completeTask(
      {
        activityId,
        outcome: payload.outcome,
        ...(payload.notes !== '' ? { notes: payload.notes } : {}),
        ...(payload.nextActionDate !== null ? { nextActionDate: payload.nextActionDate } : {}),
      },
      { onSuccess: onClose }
    );
  };

  return (
    <DebtsModalShell
      isOpen
      onClose={onClose}
      icon={<CheckCircle2 size={20} />}
      iconClassName="bg-emerald-600 shadow-emerald-500/20"
      title={`إتمام مهمة: ${task.party_name}`}
      description={task.reference_info ?? ''}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          إغلاق
        </button>
      }
    >
      {activityId === null ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          هذا النوع من المهام يُغلق تلقائياً عند سداد العميل أو إخلاف الوعد — وهو للعرض والمتابعة
          فقط.
        </div>
      ) : (
        <TaskForm isSubmitting={isSaving} onSubmit={submit} />
      )}
    </DebtsModalShell>
  );
};

export default TaskCompleteModal;
