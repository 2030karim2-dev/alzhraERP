import React from 'react';
import { PackageSearch, Link2, Unlink2 } from 'lucide-react';
import ExcelTable, { Column } from '../../../ui/common/ExcelTable';
import type { MatchingInventoryProduct, VehicleProductLink } from '../types';

interface InventoryMatchTabProps {
  hasVehicle: boolean;
  matchingProducts: MatchingInventoryProduct[];
  isMatching: boolean;
  linkedProducts: VehicleProductLink[];
  isLinkedLoading: boolean;
  isLinking: boolean;
  onLink: (productId: string) => void;
  onUnlink: (id: string) => void;
}

const statusColor: Record<string, string> = {
  CONFIRMED: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
  POSSIBLE: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
  UNKNOWN: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  NOT_COMPATIBLE: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${
        statusColor[status] ?? statusColor.UNKNOWN
      }`}
    >
      {status}
    </span>
  );
}

export const InventoryMatchTab: React.FC<InventoryMatchTabProps> = ({
  hasVehicle,
  matchingProducts,
  isMatching,
  linkedProducts,
  isLinkedLoading,
  isLinking,
  onLink,
  onUnlink,
}) => {
  if (!hasVehicle) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center py-12 p-4 shadow-sm">
        <PackageSearch size={32} className="text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          أدخل رقم الشاصي (VIN) في تبويب «فك الشاصي» أولاً لعرض المنتجات المطابقة
        </p>
      </div>
    );
  }

  const linkedIds = new Set(linkedProducts.map((l) => l.product_id));

  const columns: Column<MatchingInventoryProduct>[] = [
    {
      header: 'SKU',
      accessor: (r) => <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{r.sku}</span>,
      width: '120px',
    },
    {
      header: 'رقم القطعة',
      accessor: (r) => <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{r.part_number ?? '—'}</span>,
      width: '140px',
    },
    {
      header: 'الاسم',
      accessor: (r) => <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{r.name_ar}</span>,
    },
    {
      header: 'الماركة',
      accessor: (r) => <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{r.brand ?? '—'}</span>,
      width: '100px',
    },
    {
      header: 'السعر',
      accessor: (r) => <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">{r.sale_price}</span>,
      width: '90px',
    },
    {
      header: 'التوافق',
      accessor: (r) => <StatusBadge status={r.compatibility_status} />,
      width: '110px',
    },
    {
      header: '',
      accessor: (r) =>
        linkedIds.has(r.product_id) ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">مرتبط ✓</span>
        ) : (
          <button
            onClick={() => onLink(r.product_id)}
            disabled={isLinking}
            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Link2 size={12} /> ربط
          </button>
        ),
      width: '80px',
    },
  ];

  return (
    <div className="space-y-4">
      <ExcelTable
        columns={columns}
        data={matchingProducts}
        title="منتجات المخزون المطابقة للمركبة"
        enablePagination={false}
        showSearch={false}
        isLoading={isMatching}
        emptyMessage="لا توجد منتجات مطابقة لهذه المركبة في المخزون"
        colorTheme="blue"
        isRTL
      />

      {linkedProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={16} className="text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              المنتجات المرتبطة ({linkedProducts.length})
            </h3>
          </div>
          {isLinkedLoading ? (
            <p className="text-xs text-slate-400">جارٍ التحديث...</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {linkedProducts.map((l) => (
                <span
                  key={l.id ?? l.product_id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                >
                  <span className="font-mono">{l.product_id.slice(0, 8)}</span>
                  {l.id && (
                    <button
                      onClick={() => onUnlink(l.id!)}
                      title="إلغاء الربط"
                      className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                    >
                      <Unlink2 size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
