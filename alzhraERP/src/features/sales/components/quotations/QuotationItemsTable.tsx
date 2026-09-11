import React from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import type { ItemRow } from '../../hooks/useQuotationForm';
import { formatCurrency } from '../../../../core/utils';

interface QuotationItemsTableProps {
  items: ItemRow[];
  currencyCode?: string;
  addItem: () => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, field: keyof ItemRow, value: string | number) => void;
  handleOpenProductSearch: (index: number, query: string) => void;
}

const QuotationItemsTable: React.FC<QuotationItemsTableProps> = ({
  items,
  currencyCode = 'SAR',
  addItem,
  removeItem,
  updateItem,
  handleOpenProductSearch,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-[var(--app-surface)] shadow-sm dark:border-slate-700">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-l from-indigo-50 to-blue-50/60 px-3 py-2 dark:border-slate-700 dark:from-indigo-900/20 dark:to-blue-900/10">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-indigo-700 dark:text-indigo-300">
          بنود العرض
          <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40">
            {items.length}
          </span>
        </h3>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm transition-all hover:bg-indigo-600 hover:text-white dark:border-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-600"
        >
          <Plus size={12} /> إضافة بند
        </button>
      </div>

      {/* Excel-like table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60">
              <th className="w-8 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-500 dark:border-slate-700">
                #
              </th>
              <th className="border-l border-gray-200 px-2 py-2 text-right text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
                اسم الصنف / الوصف
              </th>
              <th className="w-28 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
                رقم القطعة
              </th>
              <th className="w-20 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
                القياس
              </th>
              <th className="w-20 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
                الكمية
              </th>
              <th className="w-28 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
                سعر الوحدة
              </th>
              <th className="w-20 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
                خصم %
              </th>
              <th className="w-32 border-l border-gray-200 bg-gray-100/80 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300">
                الإجمالي
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
            {items.map((item, idx) => {
              const lineTotal =
                item.quantity * item.unitPrice * (1 - (item.discountPercent ?? 0) / 100);
              return (
                <tr
                  key={`${item.productId || 'new'}-${String(idx)}`}
                  className="group border-b border-gray-100 transition-colors hover:bg-indigo-50/30 dark:border-slate-700/60 dark:hover:bg-indigo-900/10"
                >
                  {/* Row number */}
                  <td className="border-l border-gray-100 px-2 py-1.5 text-center text-xs font-bold text-gray-400 dark:border-slate-700/60">
                    {idx + 1}
                  </td>

                  {/* Description */}
                  <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
                    <div className="group/search relative">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => {
                          updateItem(idx, 'description', e.target.value);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'F2') {
                            e.preventDefault();
                            handleOpenProductSearch(idx, item.description);
                          }
                        }}
                        placeholder="اسم الصنف..."
                        className="w-full border-0 bg-transparent pr-1 text-sm font-medium text-gray-900 placeholder-gray-300 outline-none focus:placeholder-transparent dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenProductSearch(idx, item.description);
                        }}
                        className="absolute left-0 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-300 opacity-0 transition-all hover:bg-indigo-100 hover:text-indigo-600 group-hover/search:opacity-100 dark:hover:bg-indigo-900/30 max-md:opacity-100"
                      >
                        <Search size={13} />
                      </button>
                    </div>
                  </td>

                  {/* Part number */}
                  <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
                    <input
                      type="text"
                      value={item.partNumber ?? ''}
                      onChange={e => {
                        updateItem(idx, 'partNumber', e.target.value);
                      }}
                      placeholder="—"
                      className="w-full border-0 bg-transparent text-center font-mono text-xs text-gray-700 placeholder-gray-300 outline-none dark:text-gray-300"
                    />
                  </td>

                  {/* Size */}
                  <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
                    <input
                      type="text"
                      value={item.size ?? ''}
                      onChange={e => {
                        updateItem(idx, 'size', e.target.value);
                      }}
                      placeholder="—"
                      className="w-full border-0 bg-transparent text-center font-mono text-xs text-gray-700 placeholder-gray-300 outline-none dark:text-gray-300"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={item.quantity || ''}
                      onChange={e => {
                        updateItem(idx, 'quantity', Math.max(0, Number(e.target.value) || 0));
                      }}
                      placeholder="0"
                      className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-gray-900 placeholder-gray-300 outline-none dark:text-white"
                    />
                  </td>

                  {/* Unit price */}
                  <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={item.unitPrice || ''}
                      onChange={e => {
                        updateItem(idx, 'unitPrice', Math.max(0, Number(e.target.value) || 0));
                      }}
                      placeholder="0.00"
                      className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-emerald-600 placeholder-gray-300 outline-none dark:text-emerald-400"
                    />
                  </td>

                  {/* Discount % */}
                  <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={item.discountPercent || ''}
                      onChange={e => {
                        const raw = Number(e.target.value);
                        updateItem(idx, 'discountPercent', Math.min(100, Math.max(0, raw || 0)));
                      }}
                      placeholder="0"
                      className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-rose-500 placeholder-gray-300 outline-none"
                    />
                  </td>

                  {/* Line total */}
                  <td
                    className="border-l border-gray-100 bg-gray-50/60 px-2 py-1.5 text-center font-mono text-sm font-bold text-gray-800 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-gray-200"
                    dir="ltr"
                  >
                    {lineTotal > 0 ? (
                      formatCurrency(lineTotal, currencyCode)
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Delete */}
                  <td className="px-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        removeItem(idx);
                      }}
                      className="rounded p-1 text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 dark:hover:bg-rose-900/20"
                      disabled={items.length <= 1}
                    >
                      <Trash2 size={13} />
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

export default QuotationItemsTable;
