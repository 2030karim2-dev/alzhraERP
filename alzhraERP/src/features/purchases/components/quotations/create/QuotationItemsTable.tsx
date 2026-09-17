import React from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../../../../core/utils';
import type { ItemRow } from './types';

/** إطار خلية عادية في جدول البنود. */
const CELL_TD_CLASS = 'border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60';
/** أساس حقل داخل الخلية (بلا حدود ولا خلفية). */
const CELL_INPUT_CLASS = 'w-full border-0 bg-transparent outline-none placeholder-gray-300';
/** نمط رأس عمود موحّد (عناوين الأعمدة الرقمية). */
const HEAD_CELL_CLASS =
  'border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300';

type ItemFieldUpdater = (index: number, field: keyof ItemRow, value: string | number) => void;
type ItemSearcher = (index: number, query?: string) => void;

/** عمود تسلسل البند. */
const IndexCell = ({ index }: { index: number }): React.ReactElement => (
  <td className="border-l border-gray-100 px-2 py-1.5 text-center text-xs font-bold text-gray-400 dark:border-slate-700/60">
    {String(index + 1)}
  </td>
);

interface DescriptionCellProps {
  item: ItemRow;
  index: number;
  onUpdate: ItemFieldUpdater;
  onSearch: ItemSearcher;
}

/** خلية الوصف: إدخال حر + بحث عن منتج (Enter / F2). */
const DescriptionCell = ({
  item,
  index,
  onUpdate,
  onSearch,
}: DescriptionCellProps): React.ReactElement => (
  <td className={CELL_TD_CLASS}>
    <div className="group/search relative">
      <input
        id={`quotation-description-${String(index)}`}
        aria-label={`وصف البند ${String(index + 1)}`}
        type="text"
        value={item.description}
        onChange={event => {
          onUpdate(index, 'description', event.target.value);
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault();
            onSearch(index, item.description);
          }
        }}
        placeholder="اسم الصنف..."
        className="w-full border-0 bg-transparent pr-1 text-sm font-medium text-gray-900 placeholder-gray-300 outline-none focus:placeholder-transparent dark:text-white"
      />
      <button
        type="button"
        aria-label="البحث عن منتج"
        onClick={() => {
          onSearch(index, item.description);
        }}
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-300 opacity-0 transition-all hover:bg-violet-100 hover:text-violet-600 group-hover/search:opacity-100 dark:hover:bg-violet-900/30 max-md:opacity-100"
      >
        <Search size={13} />
      </button>
    </div>
  </td>
);

/** خلية نصية أحادية المسافة (رقم القطعة / القياس). */
const MonoTextFieldCell = ({
  ariaLabel,
  value,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement => (
  <td className={CELL_TD_CLASS}>
    <input
      aria-label={ariaLabel}
      type="text"
      placeholder="—"
      value={value}
      onChange={event => {
        onChange(event.target.value);
      }}
      className={`${CELL_INPUT_CLASS} text-center font-mono text-xs text-gray-700 dark:text-gray-300`}
    />
  </td>
);

interface NumberFieldCellProps {
  ariaLabel: string;
  value: number;
  placeholder: string;
  valueClass: string;
  max?: number | undefined;
  onCommit: (raw: string) => void;
}

/** خلية رقمية قابلة للتحرير (كمية / سعر / خصم). */
const NumberFieldCell = ({
  ariaLabel,
  value,
  placeholder,
  valueClass,
  max,
  onCommit,
}: NumberFieldCellProps): React.ReactElement => (
  <td className={CELL_TD_CLASS}>
    <input
      aria-label={ariaLabel}
      type="number"
      step="any"
      min={0}
      max={max}
      value={value || ''}
      onChange={event => {
        onCommit(event.target.value);
      }}
      placeholder={placeholder}
      className={`${CELL_INPUT_CLASS} text-center font-mono text-sm font-bold ${valueClass}`}
    />
  </td>
);

/** خلية الإجمالي المحسوب للبند. */
const LineTotalCell = ({
  lineTotal,
  currencyCode,
}: {
  lineTotal: number;
  currencyCode: string;
}): React.ReactElement => (
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
);

/** خلية حذف البند (معطّلة عند بقاء بند واحد). */
const RemoveItemCell = ({
  index,
  disabled,
  onRemove,
}: {
  index: number;
  disabled: boolean;
  onRemove: (index: number) => void;
}): React.ReactElement => (
  <td className="px-1 py-1.5">
    <button
      type="button"
      aria-label={`حذف البند ${String(index + 1)}`}
      onClick={() => {
        onRemove(index);
      }}
      className="rounded p-1 text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 dark:hover:bg-rose-900/20"
      disabled={disabled}
    >
      <Trash2 size={13} />
    </button>
  </td>
);

/** خليتا رقم القطعة والقياس. */
const ItemTextFieldCells = ({
  item,
  index,
  onUpdate,
}: {
  item: ItemRow;
  index: number;
  onUpdate: ItemFieldUpdater;
}): React.ReactElement => (
  <>
    <MonoTextFieldCell
      ariaLabel={`رقم القطعة ${String(index + 1)}`}
      value={item.partNumber ?? ''}
      onChange={value => {
        onUpdate(index, 'partNumber', value);
      }}
    />
    <MonoTextFieldCell
      ariaLabel={`قياس/مقاس البند ${String(index + 1)}`}
      value={item.size ?? ''}
      onChange={value => {
        onUpdate(index, 'size', value);
      }}
    />
  </>
);

/** خلايا الكمية وسعر الوحدة والخصم. */
const ItemNumberFieldCells = ({
  item,
  index,
  onUpdate,
}: {
  item: ItemRow;
  index: number;
  onUpdate: ItemFieldUpdater;
}): React.ReactElement => (
  <>
    <NumberFieldCell
      ariaLabel={`كمية البند ${String(index + 1)}`}
      value={item.quantity}
      placeholder="0"
      valueClass="text-gray-900 dark:text-white"
      onCommit={raw => {
        onUpdate(index, 'quantity', Number(raw));
      }}
    />
    <NumberFieldCell
      ariaLabel={`سعر البند ${String(index + 1)}`}
      value={item.unitPrice}
      placeholder="0.00"
      valueClass="text-emerald-600 dark:text-emerald-400"
      onCommit={raw => {
        onUpdate(index, 'unitPrice', Number(raw));
      }}
    />
    <NumberFieldCell
      ariaLabel={`خصم البند ${String(index + 1)}`}
      value={item.discountPercent}
      placeholder="0"
      max={100}
      valueClass="text-rose-500"
      onCommit={raw => {
        const parsed = Number(raw);
        onUpdate(index, 'discountPercent', Math.min(100, Math.max(0, parsed || 0)));
      }}
    />
  </>
);

interface QuotationItemRowProps {
  item: ItemRow;
  index: number;
  itemCount: number;
  currencyCode: string;
  onRemove: (index: number) => void;
  onUpdate: ItemFieldUpdater;
  onSearch: ItemSearcher;
}

/** صف بند واحد: وصف + رقم قطعة + قياس + كمية + سعر + خصم + إجمالي + حذف. */
export const QuotationItemRow = ({
  item,
  index,
  itemCount,
  currencyCode,
  onRemove,
  onUpdate,
  onSearch,
}: QuotationItemRowProps): React.ReactElement => {
  const lineTotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);

  return (
    <tr className="group border-b border-gray-100 transition-colors hover:bg-violet-50/30 dark:border-slate-700/60 dark:hover:bg-violet-900/10">
      <IndexCell index={index} />
      <DescriptionCell item={item} index={index} onUpdate={onUpdate} onSearch={onSearch} />
      <ItemTextFieldCells item={item} index={index} onUpdate={onUpdate} />
      <ItemNumberFieldCells item={item} index={index} onUpdate={onUpdate} />
      <LineTotalCell lineTotal={lineTotal} currencyCode={currencyCode} />
      <RemoveItemCell index={index} disabled={itemCount <= 1} onRemove={onRemove} />
    </tr>
  );
};

/** رأس جدول البنود: العنوان + زر الإضافة + أعمدة الجدول. */
const QuotationItemsTableColumns = (): React.ReactElement => (
  <thead>
    <tr className="border-b-2 border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60">
      <th className="w-8 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-500 dark:border-slate-700">
        #
      </th>
      <th className="border-l border-gray-200 px-2 py-2 text-right text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
        اسم الصنف / الوصف
      </th>
      <th className={`w-28 ${HEAD_CELL_CLASS}`}>رقم القطعة</th>
      <th className={`w-20 ${HEAD_CELL_CLASS}`}>القياس</th>
      <th className={`w-20 ${HEAD_CELL_CLASS}`}>الكمية</th>
      <th className={`w-28 ${HEAD_CELL_CLASS}`}>سعر الوحدة</th>
      <th className={`w-20 ${HEAD_CELL_CLASS}`}>خصم %</th>
      <th className={`w-32 ${HEAD_CELL_CLASS} bg-gray-100/80 dark:bg-slate-800`}>الإجمالي</th>
      <th className="w-8" />
    </tr>
  </thead>
);

/** شريط عنوان الجدول مع زر «إضافة بند». */
const QuotationItemsTableHeaderBar = ({
  count,
  onAdd,
}: {
  count: number;
  onAdd: () => void;
}): React.ReactElement => (
  <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-l from-violet-50 to-purple-50/60 px-3 py-2 dark:border-slate-700 dark:from-violet-900/20 dark:to-purple-900/10">
    <h3 className="flex items-center gap-1.5 text-sm font-bold text-violet-700 dark:text-violet-300">
      بنود العرض
      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-900/40">
        {count}
      </span>
    </h3>
    <button
      type="button"
      onClick={onAdd}
      className="flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-1 text-xs font-bold text-violet-600 shadow-sm transition-all hover:bg-violet-600 hover:text-white dark:border-violet-700 dark:bg-slate-800 dark:hover:bg-violet-600"
    >
      <Plus size={12} /> إضافة بند
    </button>
  </div>
);

interface QuotationItemsTableProps {
  items: ItemRow[];
  currencyCode: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: ItemFieldUpdater;
  onSearch: ItemSearcher;
}

/** جدول بنود عرض سعر المورد. */
export const QuotationItemsTable = ({
  items,
  currencyCode,
  onAdd,
  onRemove,
  onUpdate,
  onSearch,
}: QuotationItemsTableProps): React.ReactElement => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-[var(--app-surface)] shadow-sm dark:border-slate-700">
    <QuotationItemsTableHeaderBar count={items.length} onAdd={onAdd} />
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <QuotationItemsTableColumns />
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
          {items.map((item, index) => (
            <QuotationItemRow
              key={`${item.productId}-${String(index)}`}
              item={item}
              index={index}
              itemCount={items.length}
              currencyCode={currencyCode}
              onRemove={onRemove}
              onUpdate={onUpdate}
              onSearch={onSearch}
            />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
