import React from 'react';
import TasksBulkBar from './TasksBulkBar';
import TasksFilterBar from './TasksFilterBar';
import type { DebtTaskBulkState } from '../hooks/useDebtTaskBulk';
import type { DebtTaskQueueState } from '../hooks/useDebtTaskQueueState';

interface TaskToolbarProps {
  state: DebtTaskQueueState;
  bulk: DebtTaskBulkState;
  showManage: boolean;
}

/** شريطا الطابور: الفلاتر + الإجراءات الجماعية (تظهر عند وجود تحديد). */
const TaskToolbar: React.FC<TaskToolbarProps> = ({ state, bulk, showManage }) => (
  <>
    <TasksFilterBar
      windowDays={state.windowDays}
      onWindowChange={state.setWindowDays}
      collectorFilter={state.collectorFilter}
      onCollectorChange={state.setCollectorFilter}
      typeFilter={state.typeFilter}
      onTypeChange={state.setTypeFilter}
      collectors={state.collectors}
      onRefresh={state.refresh}
    />

    {showManage && bulk.selectedRows.length > 0 && (
      <TasksBulkBar
        selectedTasks={bulk.selectedRows.length}
        selectedParties={bulk.partyIds.length}
        collectors={state.collectors}
        value={bulk.bulkCollector}
        onChange={bulk.setBulkCollector}
        onAssign={bulk.assign}
        onUnassign={() => {
          bulk.setConfirmUnassign(true);
        }}
        isSaving={bulk.isSaving}
      />
    )}
  </>
);

export default TaskToolbar;
