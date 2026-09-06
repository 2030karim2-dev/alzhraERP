import React from 'react';
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { useSalesStore } from '../../../sales/store';
import { convertCurrency, parseNumberFlexible } from '../../../../core/utils';

interface ItemPriceEditorProps {
  show: boolean;
  onToggle: () => void;
  items: Array<{ name: string; quantity: number; price: number; productId: string }>;
  allItems: Array<{ name: string; quantity: number; price: number; productId: string }>;
  currency: string;
}

type UpdateItemFn = (index: number, field: 'price' | 'basePrice', value: number) => void;

interface CommitPriceEditArgs {
  raw: string;
  realIdx: number;
  currency: string;
  exchangeRate: number;
  exchangeOperator: 'multiply' | 'divide';
  updateItem: UpdateItemFn;
}

/**
 * Commits a price edit for an item in the cart.
 * If currency is foreign, computes basePrice using the exchange rate.
 * Re-exported for unit testing.
 */
export const commitPriceEdit = ({
  raw,
  realIdx,
  currency,
  exchangeRate,
  exchangeOperator,
  updateItem,
}: CommitPriceEditArgs): void => {
  const v = parseNumberFlexible(raw);
  if (isNaN(v) || v < 0 || realIdx === -1) return;

  let basePrice = v;
  if (currency !== 'SAR') {
    try {
      basePrice = convertCurrency(v, exchangeRate, 'toBase', exchangeOperator);
    } catch {
      return; // سعر صرف غير صالح — لا نفسد سعر الأساس
    }
  }
  updateItem(realIdx, 'price', v);
  updateItem(realIdx, 'basePrice', basePrice);
};

interface PriceRowProps {
  item: { name: string; quantity: number; price: number; productId: string };
  realIdx: number;
  currency: string;
  exchangeRate: number;
  exchangeOperator: 'multiply' | 'divide';
  updateItem: UpdateItemFn;
}

const PriceRow: React.FC<PriceRowProps> = ({
  item,
  realIdx,
  currency,
  exchangeRate,
  exchangeOperator,
  updateItem,
}) => (
  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[var(--app-surface)] px-3 py-2 dark:border-slate-800">
    <div className="min-w-0 flex-1">
      <p className="truncate text-[10px] font-bold text-slate-700 dark:text-slate-300">
        {item.name}
      </p>
      <p className="text-[10px] text-slate-400">×{item.quantity}</p>
    </div>
    <div className="flex shrink-0 items-center gap-1">
      <span className="text-[10px] text-slate-400">سعر:</span>
      <input
        type="number"
        step="any"
        defaultValue={item.price}
        onBlur={e => {
          commitPriceEdit({
            raw: e.target.value,
            realIdx,
            currency,
            exchangeRate,
            exchangeOperator,
            updateItem,
          });
        }}
        className="w-20 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-center font-mono text-xs font-black text-blue-700 outline-none focus:ring-1 focus:ring-blue-400 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
        dir="ltr"
      />
      <span className="text-[10px] text-slate-400">{currency}</span>
    </div>
  </div>
);

export const ItemPriceEditor: React.FC<ItemPriceEditorProps> = ({
  show,
  onToggle,
  items,
  allItems,
  currency,
}) => {
  const { updateItem, exchangeRate, exchangeOperator } = useSalesStore();

  return (
    <div className="border-b border-slate-100 dark:border-slate-800">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/30"
      >
        <span className="flex items-center gap-1.5">
          <Edit3 size={12} />
          تعديل أسعار الأصناف
        </span>
        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {show && (
        <div className="space-y-1.5 bg-slate-50/50 px-3 pb-3 dark:bg-slate-950/30">
          {items.map(item => {
            const realIdx = allItems.findIndex(i => i.productId === item.productId);
            return (
              <PriceRow
                key={item.productId}
                item={item}
                realIdx={realIdx}
                currency={currency}
                exchangeRate={exchangeRate}
                exchangeOperator={exchangeOperator}
                updateItem={updateItem}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ItemPriceEditor;
