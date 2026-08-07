
import React from 'react';
import { BarChart3 } from 'lucide-react';

const ChartSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[200px] bg-[var(--app-bg)] rounded-2xl animate-pulse flex items-center justify-center border-2 border-dashed border-[var(--app-border)]">
      <div className="flex flex-col items-center gap-2 text-[var(--app-text-secondary)]">
        <BarChart3 size={32} strokeWidth={1.5} />
        <span className="text-xs font-bold uppercase tracking-widest">...جاري توليد الرسم البياني</span>
      </div>
    </div>
  );
};

export default ChartSkeleton;
