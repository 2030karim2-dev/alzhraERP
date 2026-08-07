import React from 'react';
import { Car, BadgeCheck } from 'lucide-react';
import { cn } from '../../../core/utils';

export interface VehicleCompatibility {
  make: string;
  model: string;
  years: string;
  engine?: string;
}

interface VehicleCompatibilityBadgesProps {
  compatibilities: VehicleCompatibility[];
  maxVisible?: number;
  className?: string;
}

const VehicleCompatibilityBadges: React.FC<VehicleCompatibilityBadgesProps> = ({
  compatibilities, maxVisible = 5, className,
}) => {
  const visible = compatibilities.slice(0, maxVisible);
  const remaining = compatibilities.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visible.map((comp, idx) => (
        <div
          key={`${comp.make}-${comp.model}-${idx}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
            bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400
            border border-emerald-200 dark:border-emerald-800 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        >
          <Car size={11} className="flex-shrink-0" />
          <span className="whitespace-nowrap">{comp.make}</span>
          <span className="text-[9px] opacity-60">{comp.years}</span>
          {comp.engine && <span className="text-[8px] opacity-40">{comp.engine}</span>}
        </div>
      ))}

      {remaining > 0 && (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
          bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] border border-[var(--app-border)]">
          <BadgeCheck size={11} />
          <span>+{remaining} موديلات</span>
        </div>
      )}

      {compatibilities.length === 0 && (
        <div className="text-[10px] text-[var(--app-text-secondary)] italic">
          لا توجد مركبات متوافقة مسجلة
        </div>
      )}
    </div>
  );
};

export default VehicleCompatibilityBadges;
