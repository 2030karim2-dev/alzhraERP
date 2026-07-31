
import React from 'react';
import { LucideIcon, SearchX } from 'lucide-react';
import { cn } from '../../core/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = SearchX,
  title,
  description,
  action,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-300",
      className
    )}>
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-[var(--app-bg)] rounded-2xl flex items-center justify-center text-[var(--app-text-secondary)] opacity-40 transition-colors">
          <Icon size={48} strokeWidth={1.5} />
        </div>
        <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-[var(--app-surface)] rounded-full shadow-lg border border-[var(--app-border)] flex items-center justify-center">
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-[var(--app-text)] tracking-tight mb-2">{title}</h3>
      <p className="text-xs font-normal text-[var(--app-text-secondary)] max-w-xs leading-relaxed mb-8">
        {description}
      </p>

      {action && (
        <div className="animate-in slide-in-from-bottom-2 duration-300 delay-200">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
