import React from 'react';
import { Warehouse, Plus } from 'lucide-react';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import { cn } from '../../../../core/utils';
import Button from '../../../../ui/base/Button';

interface Props {
  warehouses: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const WarehouseListSidebar: React.FC<Props> = ({ warehouses, selectedId, onSelect, onAdd }) => {
  return (
    <div className="flex flex-col rounded-none border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
      <div className="flex items-center justify-between border-b bg-gray-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-center gap-2">
          <Warehouse size={14} className="text-blue-500" />
          <h3 className="text-xs font-bold text-gray-700 dark:text-slate-200">
            الفروع والمستودعات
          </h3>
        </div>
        <Button onClick={onAdd} size="sm" className="h-7 w-7 !gap-0 rounded-md p-0">
          <Plus size={12} />
        </Button>
      </div>
      <div className="custom-scrollbar flex max-h-[70vh] flex-col overflow-y-auto">
        {warehouses.map(wh => (
          <button
            key={wh.id}
            onClick={() => {
              onSelect(wh.id);
            }}
            className={cn(
              'group relative overflow-hidden border-b p-3 text-right transition-all dark:border-slate-800',
              selectedId === wh.id
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-tighter">{wh.name_ar}</h4>
              </div>
              <span
                dir="ltr"
                className={cn(
                  'font-mono text-lg font-bold leading-none transition-colors',
                  selectedId === wh.id ? 'text-blue-300' : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {formatCurrency(Number(wh.stockValue || 0))}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className={cn(selectedId === wh.id ? 'text-blue-200' : 'text-gray-400')}>
                {wh.location || '---'}
              </span>
              <div className="flex gap-3 font-mono">
                <span>
                  <b
                    className={cn(
                      selectedId === wh.id ? 'text-white' : 'text-gray-700 dark:text-slate-100'
                    )}
                  >
                    {formatNumberDisplay(Number(wh.itemCount || 0))}
                  </b>{' '}
                  صنف
                </span>
                <span>
                  <b
                    className={cn(
                      selectedId === wh.id ? 'text-white' : 'text-gray-700 dark:text-slate-100'
                    )}
                  >
                    {formatNumberDisplay(Number(wh.totalStock || 0))}
                  </b>{' '}
                  قطعة
                </span>
              </div>
            </div>
            {selectedId === wh.id && (
              <div className="absolute right-0 top-0 h-full w-1 bg-amber-400"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WarehouseListSidebar;
