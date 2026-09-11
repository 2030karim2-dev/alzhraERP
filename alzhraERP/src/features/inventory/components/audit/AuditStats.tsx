import React from 'react';
import { Layers, ScanLine, Clock, AlertTriangle, Warehouse, type LucideIcon } from 'lucide-react';
import { formatNumberDisplay } from '../../../../core/utils';

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
  };
  session: AuditSessionInfo;
}

interface StatBoxProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
}

const StatBox: React.FC<StatBoxProps> = ({ icon: Icon, label, value, color }) => (
  <div
    className={`bg-[var(--app-surface)]/50 border-l p-1.5 backdrop-blur-md sm:border-l-4 sm:p-4 ${color.replace('text-', 'border-')} flex items-center gap-1.5 transition-all hover:bg-white/80 dark:hover:bg-slate-800 sm:gap-4`}
  >
    <div
      className={`rounded-lg bg-gray-50 p-1.5 dark:bg-slate-800 sm:p-2 ${color.replace('text-', 'bg-opacity-10')}`}
    >
      <Icon size={14} className={`${color} sm:h-6 sm:w-6`} />
    </div>
    <div className="min-w-0">
      <h4 className="font-mono text-sm font-black leading-tight text-gray-900 dark:text-white sm:text-2xl">
        {formatNumberDisplay(value)}
      </h4>
      <p className="truncate text-[10px] font-black uppercase tracking-tighter text-gray-400 sm:text-xs sm:tracking-widest">
        {label}
      </p>
    </div>
  </div>
);

const AuditStats: React.FC<Props> = ({ stats, session }) => {
  return (
    <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-gray-200/50 bg-white/50 shadow-xl shadow-gray-200/20 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/50 dark:shadow-none max-md:grid-cols-2 max-md:gap-1 max-md:p-1 md:grid-cols-5">
      <div className="col-span-1 hidden flex-col justify-center border-l bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50 md:flex">
        <div className="flex items-center gap-2">
          <Warehouse size={16} className="text-blue-500" />
          <h3 className="truncate text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">
            {session.warehouse_name || session.warehouses?.name_ar || 'غير محدد'}
          </h3>
        </div>
        <p className="mt-1.5 text-[10px] font-bold text-gray-400">
          بدء:{' '}
          {session.created_at
            ? new Date(session.created_at).toLocaleDateString('ar-SA-u-nu-latn')
            : '—'}
        </p>
      </div>
      <StatBox icon={Layers} label="الإجمالي" value={stats.total} color="text-blue-500" />
      <StatBox icon={ScanLine} label="المجرد" value={stats.counted} color="text-emerald-500" />
      <StatBox icon={Clock} label="المتبقي" value={stats.pending} color="text-amber-500" />
      <StatBox
        icon={AlertTriangle}
        label="الفروقات"
        value={stats.discrepancies}
        color="text-rose-500"
      />
    </div>
  );
};

export default AuditStats;
