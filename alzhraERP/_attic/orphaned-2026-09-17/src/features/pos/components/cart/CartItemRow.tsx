import React from 'react';
import { Trash2, Plus, Minus, Edit3, Store, AlertTriangle } from 'lucide-react';
import { cn, formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import { EditPriceInline } from './EditPriceInline';
import type { SalesCartItem } from '../../../sales/store';

interface CartItemRowProps {
  item: SalesCartItem;
  editingPriceId: string | null;
  setEditingPriceId: (id: string | null) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveClick: (productId: string) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = React.memo(
  ({ item, editingPriceId, setEditingPriceId, onUpdateQuantity, onRemoveClick }) => {
    const totalAvailable = (item.warehouse_distribution || []).reduce(
      (sum, wd) => sum + wd.quantity,
      0
    );
    const isOverStock = item.quantity > totalAvailable;
    const isLowStock = totalAvailable > 0 && item.quantity >= totalAvailable;

    return (
      <tr
        className={cn(
          'animate-in slide-in-from-right-2 group transition-colors duration-200 hover:bg-slate-50/70 dark:hover:bg-slate-800/20',
          isOverStock && 'bg-rose-50/50 dark:bg-rose-900/10'
        )}
      >
        {/* Name & Warehouse Column */}
        <td className="border-l border-slate-100 p-2 align-top dark:border-slate-800/50 md:p-3">
          <h4
            className="line-clamp-2 text-[10px] font-bold leading-snug text-slate-800 dark:text-slate-100 md:text-xs"
            title={item.name}
          >
            {item.name}
          </h4>
          {item.warehouse_distribution && item.warehouse_distribution.length > 0 && (
            <div className="mt-1.5 flex w-full flex-wrap gap-1">
              {item.warehouse_distribution.map((wd, i) => (
                <span
                  key={i}
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[10px] md:text-[10px]',
                    wd.quantity > 0
                      ? 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      : 'border-rose-200 bg-rose-100 text-rose-600 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                  )}
                >
                  <Store size={8} className="md:h-2.5 md:w-2.5" />
                  <span className="max-w-[50px] truncate md:max-w-[70px]" title={wd.warehouse_name}>
                    {wd.warehouse_name}
                  </span>
                  <span className="font-mono font-bold">({formatNumberDisplay(wd.quantity)})</span>
                </span>
              ))}
            </div>
          )}
          {isOverStock && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              <AlertTriangle size={10} />
              <span>
                الكمية المطلوبة ({item.quantity}) تتجاوز المتاح ({totalAvailable})
              </span>
            </div>
          )}
          {isLowStock && !isOverStock && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle size={10} />
              <span>تقريباً نفذ المخزون ({totalAvailable} متاح)</span>
            </div>
          )}
        </td>

        {/* Part Number Column */}
        <td className="break-all border-l border-slate-100 p-2 align-top font-mono text-[10px] text-slate-600 dark:border-slate-800/50 dark:text-slate-400 md:p-3 md:text-xs">
          {item.partNumber || '-'}
        </td>

        {/* Quantity Column */}
        <td className="border-l border-slate-100 p-2 align-top dark:border-slate-800/50 md:p-3">
          <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-lg border border-slate-200 bg-[var(--app-surface)] p-1 dark:border-slate-700 md:gap-3 md:p-1.5">
            <button
              onClick={() => {
                if (item.quantity > 1) onUpdateQuantity(item.productId, item.quantity - 1);
                else onRemoveClick(item.productId);
              }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-all active:scale-90 md:h-8 md:w-8',
                item.quantity === 1
                  ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-800'
              )}
              title={item.quantity === 1 ? 'حذف' : 'تقليل'}
            >
              {item.quantity === 1 ? (
                <Trash2 size={14} className="md:h-4 md:w-4" />
              ) : (
                <Minus size={14} className="md:h-4 md:w-4" />
              )}
            </button>

            <span className="w-8 text-center font-mono text-sm font-bold text-slate-800 dark:text-slate-100 md:w-10 md:text-base">
              {item.quantity}
            </span>

            <button
              onClick={() => {
                onUpdateQuantity(item.productId, item.quantity + 1);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-emerald-600 active:scale-90 dark:hover:bg-slate-800 md:h-8 md:w-8"
              title="زيادة"
            >
              <Plus size={14} className="md:h-4 md:w-4" />
            </button>
          </div>
        </td>

        {/* Price & Total Column */}
        <td className="p-2 text-left align-top md:p-3">
          {editingPriceId === item.productId ? (
            <EditPriceInline
              productId={item.productId}
              currentPrice={item.price}
              onDone={() => {
                setEditingPriceId(null);
              }}
            />
          ) : (
            <div className="flex flex-col items-end gap-1">
              <span
                dir="ltr"
                className="block font-mono text-[11px] font-black text-slate-800 dark:text-slate-100 md:text-[13px]"
              >
                {formatCurrency(item.price * item.quantity)}
              </span>
              <button
                onClick={() => {
                  setEditingPriceId(item.productId);
                }}
                className="group/price flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400 transition-colors hover:text-blue-600 dark:border-slate-700/50 dark:bg-slate-900/50 dark:hover:text-blue-400 md:text-[10px]"
                title="تعديل السعر الوحدة"
              >
                <span dir="ltr" className="font-mono">
                  {formatCurrency(item.price)}
                </span>
                <Edit3
                  size={8}
                  className="opacity-40 group-hover/price:opacity-100 md:h-2.5 md:w-2.5"
                />
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  }
);

CartItemRow.displayName = 'CartItemRow';
