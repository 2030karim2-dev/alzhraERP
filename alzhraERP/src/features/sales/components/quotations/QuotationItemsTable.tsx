import React from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { ItemRow } from '../../hooks/useQuotationForm';

interface QuotationItemsTableProps {
  items: ItemRow[];
  addItem: () => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, field: keyof ItemRow, value: string | number) => void;
  handleOpenProductSearch: (index: number, query: string) => void;
}

const QuotationItemsTable: React.FC<QuotationItemsTableProps> = ({
  items,
  addItem,
  removeItem,
  updateItem,
  handleOpenProductSearch,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[var(--app-surface)] dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">بنود العرض</h3>
        <button
          onClick={addItem}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
        >
          <Plus size={12} /> إضافة بند
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800">
              <th className="w-8 px-3 py-2 text-right text-xs font-medium text-gray-500">#</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">الوصف</th>
              <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-500">
                الكمية
              </th>
              <th className="w-28 px-3 py-2 text-right text-xs font-medium text-gray-500">
                سعر الوحدة
              </th>
              <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-500">خصم %</th>
              <th className="w-28 px-3 py-2 text-right text-xs font-medium text-gray-500">
                الإجمالي
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
              return (
                <tr key={idx} className="h-11 border-b border-gray-50 dark:border-slate-800/50">
                  <td className="px-3 py-2 font-mono text-xs font-bold text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="group/search relative">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'F2') {
                            e.preventDefault();
                            handleOpenProductSearch(idx, item.description);
                          }
                        }}
                        placeholder="وصف البند..."
                        className="w-full border-0 bg-transparent pr-1 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none dark:text-white"
                      />
                      <button
                        onClick={() => handleOpenProductSearch(idx, item.description)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-gray-300 opacity-0 transition-all hover:text-indigo-500 group-hover/search:opacity-100 max-md:opacity-100"
                      >
                        <Search size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity || ''}
                      onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-gray-900 outline-none dark:text-white md:text-base"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice || ''}
                      onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-emerald-600 outline-none dark:text-emerald-400 md:text-base"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discountPercent || ''}
                      onChange={e => updateItem(idx, 'discountPercent', Number(e.target.value))}
                      className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-rose-500 outline-none md:text-base"
                      placeholder="0"
                    />
                  </td>
                  <td className="bg-gray-50/40 px-3 py-2 dark:bg-slate-800/30">
                    <input
                      type="number"
                      value={lineTotal !== 0 ? Number(lineTotal.toFixed(2)) : ''}
                      onChange={e => {
                        const newTotal = parseFloat(e.target.value) || 0;
                        const currentQty = item.quantity || 1;
                        const discountMult = 1 - (item.discountPercent || 0) / 100;
                        const newUnitPrice =
                          discountMult > 0
                            ? newTotal / (currentQty * discountMult)
                            : newTotal / currentQty;
                        updateItem(idx, 'unitPrice', Number(newUnitPrice.toFixed(4)));
                      }}
                      placeholder="0.00"
                      className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-gray-900 outline-none dark:text-white md:text-base"
                      dir="ltr"
                      title="تعديل إجمالي البند مباشرة"
                    />
                  </td>
                  <td className="px-1 py-2">
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1 text-gray-400 transition-colors hover:text-rose-500"
                      disabled={items.length <= 1}
                    >
                      <Trash2 size={15} />
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
