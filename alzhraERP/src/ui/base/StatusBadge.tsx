
import React from 'react';
import { cn } from '../../core/utils';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

export type StatusVariant = 'online' | 'offline' | 'syncing' | 'error';

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
  /** Show pulsing dot indicator */
  showDot?: boolean;
}

const config: Record<StatusVariant, { bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  online: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    icon: <Wifi size={10} />,
  },
  offline: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-400',
    icon: <WifiOff size={10} />,
  },
  syncing: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    icon: <RefreshCw size={10} className="animate-spin" />,
  },
  error: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    icon: <AlertCircle size={10} />,
  },
};

const defaultLabels: Record<StatusVariant, string> = {
  online: 'متصل',
  offline: 'غير متصل',
  syncing: 'مزامنة...',
  error: 'خطأ',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className,
  showDot = true,
}) => {
  const c = config[status];

  return (
    <span
      role="status"
      aria-label={label || defaultLabels[status]}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all',
        c.bg, c.text, className,
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', c.dot, status === 'syncing' && 'animate-pulse')} />}
      <span className="flex items-center gap-1">
        {c.icon}
        {label || defaultLabels[status]}
      </span>
    </span>
  );
};

export default StatusBadge;
