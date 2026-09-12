import React from 'react';
import {
  Layers,
  ScanLine,
  Clock,
  AlertTriangle,
  Warehouse,
  Coins,
  type LucideIcon,
} from 'lucide-react';
import { formatNumberDisplay } from '../../../../core/utils';
import { formatLocalDate } from '../../../../core/utils/dateUtils';

export interface AuditSessionInfo {
  status?: string;
  created_at?: string;
  warehouse_name?: string;
  warehouses?: { name_ar?: string; name?: string } | null;
}

interface Props {
  stats: {
    total: number;
    counted: number;
    pending: number;
    discrepancies: number;
    discrepancyValue?: number;
    currency?: string;
  };
  session: AuditSessionInfo;
}

interface StatBoxProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

const StatBox: React.FC<StatBoxProps> = ({ icon: Icon, label, value, color, formattedValue }) => (
  <div
    className={`bg-[var(--app-surface)]/50 border-l p-1.5 backdrop-blur-md sm:border-l-4 sm:p-3 ${color.replace('text-', 'border-')} flex items-center gap-1.5 transition-all hover:bg-white/80 dark:hover:bg-slate-800 sm:gap-3`}
  >
    <div
      className={`rounded-lg bg-gray-50 p-1.5 dark:bg-slate-800 sm:p-2 ${color.replace('text-', 'bg-opacity-10')}`}
    >
      <Icon size={14} className={`${color} sm:h-5 sm:w-5`} />
    </div>
    <div className="min-w-0">
      <h4 className="font-mono text-sm font-black leading-tight text-gray-900 dark:text-white sm:text-xl">
        {formattedValue !== undefined ? formattedValue : formatNumberDisplay(value)}
      </h4>
      <p className="truncate text-[10px] font-black uppercase tracking-tighter text-gray-400 sm:text-[11px] sm:tracking-wider">
        {label}
      </p>
    </div>
  </div>
);

const AuditStats: React.FC<Props> = ({ stats, session }) => {
  const hasValue = stats.discrepancyValue !== undefined;
  const val = stats.discrepancyValue ?? 0;
  const valFormatted = `${val > 0 ? '+' : ''}${formatNumberDisplay(val)} ${stats.currency || 'ر.ي'}`;
  const valColor = val > 0 ? 'text-emerald-500' : val < 0 ? 'text-rose-500' : 'text-gray-400';

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200/50 bg-white/50 shadow-xl shadow-gray-200/20 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/50 dark:shadow-none sm:grid-cols-3 lg:grid-cols-6">
      <div className="col-span-2 flex flex-col justify-center border-l bg-gray-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/50 sm:col-span-1 lg:col-span-1">
        <div className="flex items-center gap-2">
          <Warehouse size={16} className="text-blue-500" />
          <h3 className="truncate text-xs font-black uppercase tracking-widest text-gray-700 dark:text-slate-300">
            {session.warehouse_name || session.warehouses?.name_ar || 'غير محدد'}
          </h3>
        </div>
        <p className="mt-1 text-[10px] font-bold text-gray-400">
          بدء: {session.created_at ? formatLocalDate(session.created_at) : '—'}
        </p>
      </div>
      <StatBox icon={Layers} label="الإجمالي" value={stats.total} color="text-blue-500" />
      <StatBox icon={ScanLine} label="المجرد" value={stats.counted} color="text-emerald-500" />
      <StatBox icon={Clock} label="المتبقي" value={stats.pending} color="text-amber-500" />
      <StatBox
        icon={AlertTriangle}
        label="أصناف بها فرق"
        value={stats.discrepancies}
        color="text-rose-500"
      />
      {hasValue && (
        <StatBox
          icon={Coins}
          label="صافي الأثر المالي"
          value={val}
          formattedValue={valFormatted}
          color={valColor}
        />
      )}
    </div>
  );
};

export default AuditStats;
