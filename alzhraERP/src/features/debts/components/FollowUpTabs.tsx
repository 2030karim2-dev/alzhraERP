import React from 'react';
import { cn } from '../../../core/utils';
import type { FollowUpTab } from '../types';

interface FollowUpTabsProps {
  active: FollowUpTab;
  onChange: (tab: FollowUpTab) => void;
  counts?: Partial<Record<FollowUpTab, number>>;
}

const TABS: Array<{ id: FollowUpTab; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'needs_reminder', label: 'بحاجة تذكير' },
  { id: 'reminded', label: 'تم تذكيرهم' },
  { id: 'overdue', label: 'متأخر' },
  { id: 'today', label: 'اليوم' },
];

const renderCount = (count: number | undefined, isActive: boolean): React.ReactNode =>
  count !== undefined && count > 0 ? (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded-md text-[10px] font-extrabold',
        isActive ? 'bg-white/20 text-white' : 'bg-[var(--app-surface-hover)] text-blue-600'
      )}
    >
      {count}
    </span>
  ) : null;

/** Sub-tabs for the follow-up service page. */
const FollowUpTabs: React.FC<FollowUpTabsProps> = ({ active, onChange, counts }) => (
  <div className="flex flex-wrap gap-1.5">
    {TABS.map((tab) => {
      const isActive = active === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => {
            onChange(tab.id);
          }}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
            isActive
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
          )}
        >
          {tab.label}
          {renderCount(counts?.[tab.id], isActive)}
        </button>
      );
    })}
  </div>
);

export default FollowUpTabs;

