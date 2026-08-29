
import React from 'react';
import { type LucideIcon, ChevronLeft } from 'lucide-react';
import { cn } from '../../core/utils';

interface Tag {
  label: string;
  color: 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';
}

interface Props {
  icon: LucideIcon;
  iconColorClass: string;
  title: string;
  subtitle: string;
  tags?: Tag[];
  progress?: number;
  onClick?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

const MicroListItem: React.FC<Props> = ({ icon: Icon, iconColorClass, title, subtitle, tags, progress, onClick, actions, className }) => {
  const tagColors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    slate: 'bg-gray-50 text-gray-500 border-gray-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-[var(--app-surface)] p-2.5 border-b border-[var(--app-border)] flex flex-col gap-2 transition-all hover:bg-[var(--app-surface-hover)] group",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", iconColorClass.replace('text-', 'bg-') + '/10', iconColorClass)}>
            <Icon size={14} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-bold text-[var(--app-text)] leading-none truncate uppercase tracking-tight">{title}</h3>
            <p className="text-[10px] text-[var(--app-text-secondary)] font-medium mt-1 tracking-tighter truncate">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {onClick && !actions && <ChevronLeft size={14} className="text-[var(--app-border)]" />}
        </div>
      </div>

      {(tags || progress !== undefined) && (
        <div className="flex items-center justify-between gap-4 pt-1 px-1">
          {tags && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {tags.map((tag, i) => (
                <span key={i} className={cn("px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest border", tagColors[tag.color])}>
                  {tag.label}
                </span>
              ))}
            </div>
          )}
          {progress !== undefined && (
            <div className="flex-1 max-w-[100px] flex items-center gap-2">
              <div className="w-full bg-[var(--app-border)] h-1 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all", iconColorClass.replace('text-', 'bg-'))} style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-[var(--app-text-secondary)] font-mono">{progress}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MicroListItem;
