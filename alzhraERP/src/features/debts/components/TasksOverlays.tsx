import React from 'react';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';
import TaskCompleteModal from './TaskCompleteModal';
import type { DebtTaskQueueRow } from '../types';

interface TasksOverlaysProps {
  completingTask: DebtTaskQueueRow | null;
  onCloseComplete: () => void;
  confirmUnassign: boolean;
  unassignCount: number;
  isSaving: boolean;
  onCloseUnassign: () => void;
  onConfirmUnassign: () => void;
}

/** نوافذ الطابور: إتمام مهمة + تأكيد إلغاء الإسناد. */
const TasksOverlays: React.FC<TasksOverlaysProps> = ({
  completingTask,
  onCloseComplete,
  confirmUnassign,
  unassignCount,
  isSaving,
  onCloseUnassign,
  onConfirmUnassign,
}) => (
  <>
    <TaskCompleteModal
      isOpen={completingTask !== null}
      onClose={onCloseComplete}
      task={completingTask}
    />
    <ConfirmModal
      isOpen={confirmUnassign}
      onClose={onCloseUnassign}
      onConfirm={onConfirmUnassign}
      title="إلغاء الإسناد"
      message={`سيتم إلغاء إسناد ${String(unassignCount)} عميل من محصّليهم الحاليين. الاستمرار؟`}
      confirmLabel="نعم، إلغاء الإسناد"
      variant="warning"
      isLoading={isSaving}
    />
  </>
);

export default TasksOverlays;
