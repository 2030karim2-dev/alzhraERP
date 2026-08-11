import React from 'react';
import { CheckCircle2, Loader2, Circle, XCircle, Lock } from 'lucide-react';
import type { TabState, TabStatus } from '../hooks/useVinTabs';
import { cn } from '../../../core/utils';

interface VinTabsBarProps {
  tabs: TabState[];
  activeTab: number;
  onTabClick: (idx: number) => void;
}

const STATUS_ICON: Record<TabStatus, React.ReactNode> = {
  idle:    <Circle size={10} className="text-slate-300 dark:text-slate-600" />,
  locked:  <Lock size={10} className="text-slate-300 dark:text-slate-600" />,
  loading: <Loader2 size={12} className="text-blue-500 animate-spin" />,
  success: <CheckCircle2 size={12} className="text-emerald-500" />,
  error:   <XCircle size={12} className="text-rose-500" />,
};

const STATUS_BG: Record<TabStatus, string> = {
  idle:    'bg-transparent',
  locked:  'bg-slate-50 dark:bg-slate-800/50 opacity-50',
  loading: 'bg-blue-50 dark:bg-blue-900/20',
  success: 'bg-emerald-50 dark:bg-emerald-900/20',
  error:   'bg-rose-50 dark:bg-rose-900/20',
};

const VinTabsBar: React.FC<VinTabsBarProps> = ({ tabs, activeTab, onTabClick }) => {
  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-sm overflow-x-auto">
      <div className="flex min-w-max p-1 gap-1">
        {tabs.map((tab, idx) => {
          const isActive = idx === activeTab;
          const isLocked = tab.status === 'locked';
          const isError = tab.status === 'error';

          return (
            <button
              key={tab.id}
              onClick={() => !isLocked && onTabClick(idx)}
              disabled={isLocked}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap',
                isActive
                  ? 'bg-[var(--app-bg)] text-[var(--app-text)] shadow-sm ring-1 ring-[var(--app-border)]'
                  : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]',
                isError && !isActive && 'text-rose-600',
                STATUS_BG[tab.status],
                isLocked && 'cursor-not-allowed'
              )}
            >
              <span className="shrink-0">{STATUS_ICON[tab.status]}</span>
              <span className="truncate max-w-[120px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VinTabsBar;
