import React from 'react';
import { cn } from '../../../core/utils';

interface StatusBadgeProps {
  label: string;
  badgeClass: string;
  dotClass?: string;
}

/** Small status pill used across the debts module tables. */
const StatusBadge: React.FC<StatusBadgeProps> = ({ label, badgeClass, dotClass }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap',
      badgeClass
    )}
  >
    {dotClass ? <span className={cn('w-1.5 h-1.5 rounded-full', dotClass)} /> : null}
    {label}
  </span>
);

export default StatusBadge;
