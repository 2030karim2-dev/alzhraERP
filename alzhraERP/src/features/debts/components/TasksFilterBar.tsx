import React from 'react';
import { RefreshCw } from 'lucide-react';
import {
  COLLECTOR_ALL,
  COLLECTOR_MINE,
  COLLECTOR_NONE,
  SELECT_CLASS,
  TYPE_FILTERS,
  WINDOW_OPTIONS,
} from './tasksFilterOptions';
import type { DebtCollector } from '../types';

interface TasksFilterBarProps {
  windowDays: number;
  onWindowChange: (value: number) => void;
  collectorFilter: string;
  onCollectorChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  collectors: DebtCollector[];
  onRefresh: () => void;
}

const FilterSelect: React.FC<{
  value: string;
  title: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ value, title, onChange, children }) => (
  <select
    value={value}
    title={title}
    onChange={e => {
      onChange(e.target.value);
    }}
    className={SELECT_CLASS}
  >
    {children}
  </select>
);

const RefreshButton: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <button
    type="button"
    onClick={onRefresh}
    title="تحديث الطابور"
    className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-2.5 text-xs font-bold text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface)]"
  >
    <RefreshCw size={13} />
    تحديث
  </button>
);

/** شريط فلاتر الطابور: النافذة الزمنية + المحصّل + نوع المهمة + تحديث. */
const TasksFilterBar: React.FC<TasksFilterBarProps> = ({
  windowDays,
  onWindowChange,
  collectorFilter,
  onCollectorChange,
  typeFilter,
  onTypeChange,
  collectors,
  onRefresh,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <FilterSelect
      value={String(windowDays)}
      title="نافذة الاستحقاق"
      onChange={value => {
        onWindowChange(Number(value));
      }}
    >
      {WINDOW_OPTIONS.map(option => (
        <option key={option.value} value={String(option.value)}>
          {option.label}
        </option>
      ))}
    </FilterSelect>

    <FilterSelect value={collectorFilter} title="تصفية بالمحصّل" onChange={onCollectorChange}>
      <option value={COLLECTOR_ALL}>كل المحصّلين</option>
      <option value={COLLECTOR_MINE}>عملائي</option>
      <option value={COLLECTOR_NONE}>غير مُسند</option>
      {collectors.map(collector => (
        <option key={collector.collector_id} value={collector.collector_id}>
          {collector.full_name}
        </option>
      ))}
    </FilterSelect>

    <FilterSelect value={typeFilter} title="نوع المهمة" onChange={onTypeChange}>
      {TYPE_FILTERS.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </FilterSelect>

    <RefreshButton onRefresh={onRefresh} />
  </div>
);

export default TasksFilterBar;
