/**
 * S2: تحديد شبكة المهام والإجراءات الجماعية (إسناد/إلغاء إسناد).
 */
import { useMemo, useState } from 'react';
import { useDebtMutations } from './useDebtMutations';
import type { DebtTaskQueueRow } from '../types';

export interface DebtTaskBulkState {
  selectedRowIds: Set<string>;
  setSelectedRowIds: (ids: Set<string>) => void;
  selectedRows: DebtTaskQueueRow[];
  partyIds: string[];
  bulkCollector: string;
  setBulkCollector: (value: string) => void;
  assign: () => void;
  unassign: () => void;
  isSaving: boolean;
  confirmUnassign: boolean;
  setConfirmUnassign: (value: boolean) => void;
}

export const useDebtTaskBulk = (rows: DebtTaskQueueRow[]): DebtTaskBulkState => {
  const { assignParties, isSaving } = useDebtMutations();
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set<string>());
  const [bulkCollector, setBulkCollector] = useState('');
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const selectedRows = useMemo(
    () => rows.filter(task => selectedRowIds.has(task.task_id)),
    [rows, selectedRowIds]
  );
  const partyIds = useMemo(
    () => Array.from(new Set(selectedRows.map(task => task.party_id))),
    [selectedRows]
  );
  const clearSelection = (): void => {
    setSelectedRowIds(new Set<string>());
  };
  const assign = (): void => {
    if (partyIds.length === 0 || bulkCollector === '') return;
    assignParties(
      { partyIds, collectorId: bulkCollector, priority: 'medium' },
      { onSuccess: clearSelection }
    );
  };
  const unassign = (): void => {
    if (partyIds.length === 0) return;
    assignParties(
      { partyIds, collectorId: null },
      {
        onSuccess: () => {
          clearSelection();
          setConfirmUnassign(false);
        },
      }
    );
  };
  return {
    selectedRowIds,
    setSelectedRowIds,
    selectedRows,
    partyIds,
    bulkCollector,
    setBulkCollector,
    assign,
    unassign,
    isSaving,
    confirmUnassign,
    setConfirmUnassign,
  };
};
