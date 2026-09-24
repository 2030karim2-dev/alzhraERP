import React from 'react';
import { Filter, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { AuditStatusFilter } from './AuditItemsTable';

interface AuditStatusFilterBarProps {
  statusFilter: AuditStatusFilter;
  onSelectStatusFilter: (status: AuditStatusFilter) => void;
  stats: {
    total: number;
    discrepancies: number;
    matched?: number;
    pending: number;
  };
}

export const AuditStatusFilterBar: React.FC<AuditStatusFilterBarProps> = ({
  statusFilter,
  onSelectStatusFilter,
  stats,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-100 bg-[var(--app-surface)] p-1.5 shadow-sm dark:border-slate-800">
      <span className="flex items-center gap-1 px-2 text-[10px] font-black uppercase text-gray-400">
        <Filter size={12} /> الحالة:
      </span>
      <button
        type="button"
        onClick={() => onSelectStatusFilter('all')}
        className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
          statusFilter === 'all'
            ? 'bg-slate-800 text-white shadow dark:bg-slate-700'
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
        }`}
      >
        الكل ({stats.total})
      </button>
      <button
        type="button"
        onClick={() => onSelectStatusFilter('discrepancy')}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
          statusFilter === 'discrepancy'
            ? 'bg-rose-600 text-white shadow'
            : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'
        }`}
      >
        <AlertTriangle size={10} /> بها فروقات ({stats.discrepancies})
      </button>
      <button
        type="button"
        onClick={() => onSelectStatusFilter('matched')}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
          statusFilter === 'matched'
            ? 'bg-emerald-600 text-white shadow'
            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
        }`}
      >
        <CheckCircle2 size={10} /> مطابقة ({stats.matched ?? 0})
      </button>
      <button
        type="button"
        onClick={() => onSelectStatusFilter('uncounted')}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
          statusFilter === 'uncounted'
            ? 'bg-amber-600 text-white shadow'
            : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
        }`}
      >
        <Clock size={10} /> لم تُجرد ({stats.pending})
      </button>
    </div>
  );
};
