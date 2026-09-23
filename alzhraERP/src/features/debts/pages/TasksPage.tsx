import React, { useMemo, useState } from 'react';
import { usePermission } from '../../../core/hooks/usePermission';
import TasksGrid from '../components/TasksGrid';
import TasksOverlays from '../components/TasksOverlays';
import TaskToolbar from '../components/TaskToolbar';
import { buildTaskColumns } from '../components/tasksGridColumns';
import { useDebtTaskBulk } from '../hooks/useDebtTaskBulk';
import { useDebtTaskQueueState } from '../hooks/useDebtTaskQueueState';
import type { DebtTaskQueueRow } from '../types';

/** S2: طابور مهام التحصيل — شبكة إكسل معيارية + إسناد جماعي من التحديد. */
const TasksPage: React.FC = () => {
  const { hasPermission: canManage, isLoading: permissionLoading } = usePermission('debts:manage');
  const showManage = permissionLoading || canManage;
  const state = useDebtTaskQueueState();
  const bulk = useDebtTaskBulk(state.rows);
  const [completingTask, setCompletingTask] = useState<DebtTaskQueueRow | null>(null);
  const columns = useMemo(
    () => buildTaskColumns({ showManage, onComplete: setCompletingTask }),
    [showManage]
  );

  return (
    <div className="space-y-3">
      <TaskToolbar state={state} bulk={bulk} showManage={showManage} />

      <TasksGrid
        rows={state.rows}
        columns={columns}
        isLoading={state.isLoading}
        selectedRowIds={bulk.selectedRowIds}
        onSelectionChange={bulk.setSelectedRowIds}
        onComplete={setCompletingTask}
      />

      <TasksOverlays
        completingTask={completingTask}
        onCloseComplete={() => {
          setCompletingTask(null);
        }}
        confirmUnassign={bulk.confirmUnassign}
        unassignCount={bulk.partyIds.length}
        isSaving={bulk.isSaving}
        onCloseUnassign={() => {
          bulk.setConfirmUnassign(false);
        }}
        onConfirmUnassign={bulk.unassign}
      />
    </div>
  );
};

export default TasksPage;
