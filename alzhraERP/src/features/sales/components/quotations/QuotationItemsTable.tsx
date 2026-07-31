import React from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { formatCurrency } from '@/core/utils';
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
  handleOpenProductSearch
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">بنود العرض</h3>
        <button
          onClick={addItem}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
        >
          <Plus size={12} /> إضافة بند
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800">
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-8">#</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">الوصف</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-20">الكمية</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-28">سعر الوحدة</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-20">خصم %</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-28">الإجمالي</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
              return (
                <tr key={idx} className="border-b border-gray-50 dark:border-slate-800/50">
                  <td className="py-2 px-3 text-xs text-gray-400">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <div className="relative group/search">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'F2') {
                            e.preventDefault();
                            handleOpenProductSearch(idx, item.description);
                          }
                        }}
                        placeholder="وصف البند... (Enter للبحث)"
                        className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 pr-1"
                      />
                      <button 
                        onClick={() => handleOpenProductSearch(idx, item.description)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-indigo-500 opacity-0 group-hover/search:opacity-100 transition-all"
                      >
                        <Search size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-full bg-transparent border-0 outline-none text-sm text-center text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full bg-transparent border-0 outline-none text-sm text-center font-mono text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discountPercent}
                      onChange={(e) => updateItem(idx, 'discountPercent', Number(e.target.value))}
                      className="w-full bg-transparent border-0 outline-none text-sm text-center text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3 font-mono text-sm font-bold text-gray-900 dark:text-white text-center" dir="ltr">
                    {formatCurrency(lineTotal)}
                  </td>
                  <td className="py-2 px-1">
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                      disabled={items.length <= 1}
                    >
                      <Trash2 size={14} />
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
