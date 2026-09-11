// ============================================
// QuickAuditItemsTable — جدول أصناف التسوية السريعة (Excel Style)
// مع عرض بطاقات متجاوب للهاتف
// ============================================
import React from 'react';
import { ScanBarcode, X } from 'lucide-react';
import { useBreakpoint } from '../../../../lib/hooks/useBreakpoint';

export interface AdjustedItem {
  product_id: string;
  name_ar: string;
  sku: string;
  part_number?: string;
  brand?: string;
  alternative_numbers?: string;
  size?: string;
  warehouse_id: string;
  system_quantity: number;
  quantity: number;
}

interface Props {
  items: AdjustedItem[];
  onUpdateQuantity: (productId: string, qty: string) => void;
  onRemoveItem: (productId: string) => void;
}

const QuickAuditItemsTable: React.FC<Props> = ({ items, onUpdateQuantity, onRemoveItem }) => {
  const isDesktop = useBreakpoint('md');

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-20 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <ScanBarcode size={48} className="mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1} />
        <h3 className="font-bold text-gray-600 dark:text-gray-400">القائمة فارغة</h3>
        <p className="mt-2 max-w-xs text-xs text-gray-500">
          ابدأ بالبحث عن الأصناف أو مسح الباركود بعد تحديد المستودع لإنشاء تسوية سريعة
        </p>
      </div>
    );
  }

  // ── Mobile Card View ─────────────────────────────────────────────
  if (!isDesktop) {
    return (
      <div className="space-y-3">
        {items.map(item => {
          const difference = item.quantity - item.system_quantity;
          const diffColor =
            difference > 0
              ? 'text-emerald-500'
              : difference < 0
                ? 'text-rose-500'
                : 'text-gray-300';
          return (
            <div
              key={item.product_id}
              className="overflow-hidden rounded-xl border-2 border-slate-200 bg-[var(--app-surface)] shadow-sm dark:border-slate-800"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                    {item.name_ar}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                    {item.part_number || item.sku}
                  </p>
                </div>
                <button
                  onClick={() => {
                    onRemoveItem(item.product_id);
                  }}
                  className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95 dark:hover:bg-red-900/20"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-2 p-3">
                {item.brand && (
                  <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {item.brand}
                  </span>
                )}

                {/* Quantities */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-50 py-2 text-center dark:bg-slate-800/50">
                    <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">
                      المخزون الحالي
                    </p>
                    <p className="font-mono text-lg font-black leading-none text-gray-500 dark:text-gray-300">
                      {item.system_quantity}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50/50 py-2 text-center dark:bg-blue-900/10">
                    <p className="mb-1 text-[10px] font-bold uppercase text-blue-500">
                      الجرد الفعلي
                    </p>
                    <input
                      type="number"
                      min={0}
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={e => {
                        onUpdateQuantity(item.product_id, e.target.value);
                      }}
                      onFocus={e => {
                        if (item.quantity === 0) e.target.select();
                      }}
                      className="w-full rounded-lg border-2 border-blue-200 bg-white px-1 py-1 text-center font-mono text-lg font-bold leading-none text-blue-600 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-blue-900/50 dark:bg-slate-950 dark:text-blue-400"
                      placeholder="0"
                    />
                  </div>
                  <div className="rounded-lg bg-emerald-50/30 py-2 text-center dark:bg-emerald-900/5">
                    <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">الفارق</p>
                    <p className={`font-mono text-lg font-black leading-none ${diffColor}`}>
                      {difference > 0 ? `+${difference}` : difference}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Desktop Table View ───────────────────────────────────────────
  return (
    <div className="max-w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-[var(--app-surface)] shadow-lg dark:border-slate-800">
      <div className="custom-scrollbar overflow-x-auto bg-white dark:bg-slate-950">
        <table className="w-full min-w-[900px] border-collapse text-right text-xs max-md:min-w-0">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50 font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-gray-100">
              <th className="min-w-[200px] border-l border-slate-200 px-4 py-3 text-start dark:border-slate-700">
                اسم القطعة
              </th>
              <th className="w-[140px] border-l border-slate-200 px-4 py-3 dark:border-slate-700">
                رقم القطعة
              </th>
              <th className="w-[100px] border-l border-slate-200 px-4 py-3 dark:border-slate-700">
                الماركة
              </th>
              <th className="w-[150px] border-l border-slate-200 px-4 py-3 dark:border-slate-700">
                الأرقام البديلة
              </th>
              <th className="w-[80px] border-l border-slate-200 px-4 py-3 text-center dark:border-slate-700">
                المقاس
              </th>
              <th className="w-[100px] border-l border-slate-200 bg-slate-100/30 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-800/20">
                المخزون الحالي
              </th>
              <th className="w-[110px] border-l border-slate-200 bg-blue-50/50 px-4 py-3 text-center font-black text-blue-700 dark:border-slate-700 dark:bg-blue-900/10 dark:text-blue-300">
                الجرد الفعلي
              </th>
              <th className="w-[90px] border-l border-slate-200 px-4 py-3 text-center dark:border-slate-700">
                الفارق
              </th>
              <th className="w-12 px-4 py-3 text-center" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map(item => {
              const difference = item.quantity - item.system_quantity;
              const diffColor =
                difference > 0
                  ? 'text-emerald-500'
                  : difference < 0
                    ? 'text-rose-500'
                    : 'text-gray-300';
              return (
                <tr
                  key={item.product_id}
                  className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                >
                  <td className="border-l border-slate-100 px-3 py-2 font-bold text-gray-900 dark:border-slate-800 dark:text-gray-100">
                    {item.name_ar}
                  </td>
                  <td className="border-l border-slate-100 px-3 py-2 font-mono text-gray-600 dark:border-slate-800 dark:text-gray-400">
                    {item.part_number || item.sku}
                  </td>
                  <td className="border-l border-slate-100 px-3 py-2 dark:border-slate-800">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-slate-800">
                      {item.brand || '-'}
                    </span>
                  </td>
                  <td
                    className="max-w-[150px] truncate border-l border-slate-100 px-3 py-2 text-[10px] text-gray-500 dark:border-slate-800"
                    title={item.alternative_numbers}
                  >
                    {item.alternative_numbers || '-'}
                  </td>
                  <td className="border-l border-slate-100 px-3 py-2 text-center font-bold dark:border-slate-800">
                    {item.size || '-'}
                  </td>
                  <td className="border-l border-slate-100 bg-gray-50/30 px-3 py-2 text-center font-mono font-bold text-gray-400 dark:border-slate-800 dark:bg-slate-800/20">
                    {item.system_quantity}
                  </td>
                  <td className="border-l border-slate-100 bg-blue-50/20 px-3 py-2 text-center dark:border-slate-800 dark:bg-blue-900/5">
                    <input
                      type="number"
                      min={0}
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={e => {
                        onUpdateQuantity(item.product_id, e.target.value);
                      }}
                      onFocus={e => {
                        if (item.quantity === 0) e.target.select();
                      }}
                      className="w-20 rounded-md border-2 border-blue-100 bg-white px-1 py-1.5 text-center font-mono font-bold text-blue-600 outline-none transition-colors focus:border-blue-500 focus:ring-0 dark:border-blue-900/50 dark:bg-slate-950 dark:text-blue-400"
                      placeholder="0"
                    />
                  </td>
                  <td
                    className={`border-l border-slate-100 px-3 py-2 text-center font-mono font-bold dark:border-slate-800 ${diffColor}`}
                  >
                    {difference > 0 ? `+${difference}` : difference}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => {
                        onRemoveItem(item.product_id);
                      }}
                      className="rounded-md p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20 max-md:opacity-100"
                    >
                      <X size={14} strokeWidth={3} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuickAuditItemsTable;
