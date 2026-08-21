import React from 'react';
import { ArrowLeftRight, CheckCircle, AlertTriangle, Package, Clock } from 'lucide-react';
import { cn } from '../../../../core/utils';

export interface TransferItemRow {
  id: string;
  product_id: string;
  quantity: number;
  product?: { name_ar: string | null; sku: string | null } | null;
}

export interface TransferHistoryRow {
  id: string;
  transfer_number?: string | null;
  status: string;
  created_at: string;
  item_count?: number | null;
  from_warehouse?: { name_ar: string | null } | null;
  from_warehouse_name?: string | null;
  to_warehouse?: { name_ar: string | null } | null;
  to_warehouse_name?: string | null;
  items?: TransferItemRow[] | null;
}

interface TransferMobileCardProps {
  transfer: TransferHistoryRow;
}

export const TransferMobileCard: React.FC<TransferMobileCardProps> = ({ transfer: t }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header: Status + Number */}
      <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b dark:border-slate-700 flex items-center justify-between gap-2">
        <span className="font-mono font-bold text-gray-400 text-[10px]">{t.transfer_number || '—'}</span>
        <span
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1',
            t.status === 'completed'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
          )}
        >
          {t.status === 'completed' ? (
            <>
              <CheckCircle size={9} /> مكتملة
            </>
          ) : (
            <>
              <AlertTriangle size={9} /> معلقة
            </>
          )}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Warehouses */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 text-center bg-rose-50/50 dark:bg-rose-900/10 rounded-lg py-2 px-2">
            <p className="text-[8px] font-bold text-rose-400 uppercase mb-0.5">من</p>
            <p className="text-[11px] font-black text-rose-700 dark:text-rose-300 truncate">
              {t.from_warehouse?.name_ar || t.from_warehouse_name || '-'}
            </p>
          </div>
          <ArrowLeftRight size={14} className="text-gray-300 dark:text-slate-600 shrink-0" />
          <div className="flex-1 text-center bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg py-2 px-2">
            <p className="text-[8px] font-bold text-emerald-400 uppercase mb-0.5">إلى</p>
            <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 truncate">
              {t.to_warehouse?.name_ar || t.to_warehouse_name || '-'}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Package size={11} className="text-indigo-500" />
            <span className="font-bold">{t.item_count || 0} أصناف</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Clock size={11} className="text-gray-400" />
            {new Date(t.created_at).toLocaleDateString('ar-SA-u-nu-latn', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* First 2 items preview */}
        {(t.items || []).length > 0 && (
          <div className="pt-2 border-t dark:border-slate-800">
            <div className="flex flex-wrap gap-1.5">
              {(t.items || []).slice(0, 2).map((i: TransferItemRow, idx: number) => (
                <span
                  key={idx}
                  className="text-[9px] font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-full truncate max-w-[45%]"
                >
                  {i.product?.name_ar || i.product?.sku || 'صنف'}
                </span>
              ))}
              {(t.items || []).length > 2 && (
                <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-full">
                  +{(t.items || []).length - 2} أخرى
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
