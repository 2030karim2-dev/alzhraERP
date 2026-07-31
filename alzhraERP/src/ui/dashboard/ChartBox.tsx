
import React from 'react';
import { cn } from '../../core/utils';

interface ChartBoxProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ChartBox: React.FC<ChartBoxProps> = ({ title, children, className }) => {
  return (
    <div className={cn("bg-[var(--app-surface)] p-5 rounded-xl shadow-sm border border-[var(--app-border)]", className)}>
      <h3 className="text-md font-bold text-[var(--app-text)] mb-4">{title}</h3>
      {children}
    </div>
  );
};

export default ChartBox;
