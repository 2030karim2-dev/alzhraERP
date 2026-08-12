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

const VinTabsBar: React.FC<VinTabsBarProps> = ({ tabs, activeTab, onTabClick }) => {
  return (
    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-slate-800/50 rounded-2xl shadow-xl shadow-gray-200/10 dark:shadow-none overflow-x-auto no-scrollbar">
      <div className="flex min-w-max p-1.5 gap-1.5">
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
                'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black transition-all whitespace-nowrap overflow-hidden',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60',
                isError && !isActive && 'text-rose-600',
                isLocked && 'opacity-40 cursor-not-allowed grayscale'
              )}
            >
              <span className={cn("shrink-0 transition-transform", isActive && "scale-110")}>
                {isActive ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> : STATUS_ICON[tab.status]}
              </span>
              <span className="truncate max-w-[140px] uppercase tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VinTabsBar;
