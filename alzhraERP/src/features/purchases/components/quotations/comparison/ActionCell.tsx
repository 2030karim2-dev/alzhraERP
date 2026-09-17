import React from 'react';
import { CheckCircle, ArrowRightLeft, Loader2 } from 'lucide-react';
import type { ComparisonSupplier } from '../../../services/quotationComparison';

interface ActionCellProps {
  supplier: ComparisonSupplier;
  cheapestId: string;
  actionLoading: string | null;
  onConvert: (id: string) => Promise<void>;
}

/** خلية «اعتماد عرض المورد» — تعرض حالته المكتملة أو زر التحويل لفاتورة شراء. */
export const ActionCell = ({
  supplier,
  cheapestId,
  actionLoading,
  onConvert,
}: ActionCellProps): React.ReactElement => {
  if (supplier.status === 'converted')
    return (
      <span className="flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
        <CheckCircle size={14} /> تم التحويل
      </span>
    );
  return (
    <button
      onClick={() => {
        void onConvert(supplier.id);
      }}
      disabled={actionLoading !== null}
      className={`mx-auto flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold shadow-sm transition-all ${supplier.id === cheapestId ? 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'}`}
    >
      {actionLoading === supplier.id ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <ArrowRightLeft size={12} />
      )}
      {supplier.id === cheapestId ? 'اعتماد (موصى به)' : 'اعتماد'}
    </button>
  );
};
