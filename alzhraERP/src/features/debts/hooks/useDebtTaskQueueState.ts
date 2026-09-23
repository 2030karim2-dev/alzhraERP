/**
 * S2: حالة طابور المهام — الفلاتر والاستعلام والمحصّلون.
 * مفصولة عن الصفحة لإبقاء الدوال داخل حد المشروع (50 سطراً).
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { useDebtCollectors, useDebtTaskQueue } from './useDebtQueries';
import { COLLECTOR_MINE, COLLECTOR_NONE } from '../components/tasksFilterOptions';
import { sortTasks } from '../lib/taskQueue';
import type { DebtCollector, DebtTaskQueueRow } from '../types';

export interface DebtTaskQueueState {
  windowDays: number;
  setWindowDays: (value: number) => void;
  collectorFilter: string;
  setCollectorFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  rows: DebtTaskQueueRow[];
  isLoading: boolean;
  collectors: DebtCollector[];
  isFetching: boolean;
  refresh: () => void;
}

export const useDebtTaskQueueState = (): DebtTaskQueueState => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [windowDays, setWindowDays] = useState(7);
  const [collectorFilter, setCollectorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // 'none' (غير مُسند) تُصفّى في الواجهة: الخادم يقبل uuid أو NULL فقط.
  const collectorId =
    collectorFilter === 'all' || collectorFilter === COLLECTOR_NONE
      ? null
      : collectorFilter === COLLECTOR_MINE
        ? (user?.id ?? null)
        : collectorFilter;

  const { data: tasks, isLoading, isFetching } = useDebtTaskQueue({ collectorId, windowDays });
  const { data: collectors } = useDebtCollectors();

  const rows = useMemo(() => {
    const list = tasks ?? [];
    const typed = typeFilter === 'all' ? list : list.filter(task => task.task_type === typeFilter);
    const byOwner =
      collectorFilter === COLLECTOR_NONE ? typed.filter(task => task.assigned_to === null) : typed;
    return sortTasks(byOwner);
  }, [tasks, typeFilter, collectorFilter]);

  return {
    windowDays,
    setWindowDays,
    collectorFilter,
    setCollectorFilter,
    typeFilter,
    setTypeFilter,
    rows,
    isLoading,
    isFetching,
    collectors: collectors ?? [],
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  };
};
