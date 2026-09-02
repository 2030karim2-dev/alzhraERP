import React from 'react';
import { Table as TableIcon, Search, Copy, Check, Layers } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import type { PurchasePrintItem } from '../PurchaseInvoicePrintTemplate';
import type { PurchaseDetailInvoice } from './InvoiceMetaCards';

interface InvoiceItemsTableProps {
  invoice: PurchaseDetailInvoice;
  filteredItems: PurchasePrintItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  copiedSku: string | null;
  onCopySku: (sku: string) => void;
  totalUnitsCount: number;
  totalLinesAmount: number;
}

interface SheetRibbonProps {
  itemsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const SheetRibbon: React.FC<SheetRibbonProps> = ({ itemsCount, searchQuery, onSearchChange }) => (
  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-300 bg-gradient-to-r from-slate-100 via-slate-50 to-emerald-50/40 px-3 py-2 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-emerald-950/20 sm:px-4 sm:py-2.5">
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className="rounded-lg bg-emerald-600 p-1.5 text-white shadow-xs">
        <TableIcon size={16} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">
            ورقة أصناف الفاتورة (Sheet 1)
          </h3>
          <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            {itemsCount} صف
          </span>
        </div>
        <span className="hidden text-[10px] text-slate-500 dark:text-slate-400 sm:inline">
          جدول بيانات توريد المخزون مع إحداثيات الأعمدة وحسابات الأسعار
        </span>
      </div>
    </div>

    <div className="relative w-full sm:w-auto sm:min-w-[240px]">
      <Search className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500" size={14} />
      <input
        type="text"
        value={searchQuery}
        onChange={e => {
          onSearchChange(e.target.value);
        }}
        placeholder="بحث في الأصناف أو SKU..."
        className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  </div>
);

const getItemSku = (product: PurchasePrintItem['product']): string => {
  const sku = product?.sku;
  if (typeof sku === 'string' && sku.length > 0) return sku;
  const partNumber = product?.part_number;
  if (typeof partNumber === 'string' && partNumber.length > 0) return partNumber;
  return '---';
};

const getItemName = (item: PurchasePrintItem): string => {
  const nameAr = item.product?.name_ar;
  if (typeof nameAr === 'string' && nameAr.length > 0) return nameAr;
  const desc = item.description;
  if (typeof desc === 'string' && desc.length > 0) return desc;
  return 'صنف غير محدد';
};

interface SkuCellProps {
  sku: string;
  copiedSku: string | null;
  onCopySku: (sku: string) => void;
}

const SkuCell: React.FC<SkuCellProps> = ({ sku, copiedSku, onCopySku }) => (
  <td className="border-l border-slate-200 px-3 py-2 text-center dark:border-slate-700">
    <div className="flex items-center justify-center gap-1.5">
      <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">
        {sku}
      </span>
      {sku !== '---' && (
        <button
          type="button"
          onClick={() => {
            onCopySku(sku);
          }}
          className="p-0.5 text-slate-400 transition-colors hover:text-blue-500"
          title="نسخ الرمز"
        >
          {copiedSku === sku ? (
            <Check size={12} className="text-emerald-500" />
          ) : (
            <Copy size={12} />
          )}
        </button>
      )}
    </div>
  </td>
);

interface TableRowItemProps {
  item: PurchasePrintItem;
  index: number;
  currencyCode: string;
  copiedSku: string | null;
  onCopySku: (sku: string) => void;
}

const TableRowItem: React.FC<TableRowItemProps> = ({
  item,
  index,
  currencyCode,
  copiedSku,
  onCopySku,
}) => {
  const sku = getItemSku(item.product);
  const name = getItemName(item);
  const isEven = index % 2 === 0;
  const partNumber = item.product?.part_number;
  const brand = item.product?.brand;
  const hasDistinctPart =
    typeof partNumber === 'string' && partNumber.length > 0 && partNumber !== sku;
  const hasBrand = typeof brand === 'string' && brand.length > 0;

  return (
    <tr
      className={`transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20 ${
        isEven ? 'bg-white dark:bg-slate-800/40' : 'bg-slate-50/50 dark:bg-slate-800/80'
      }`}
    >
      <td className="select-none border-l border-slate-300 bg-slate-100/70 py-2 text-center font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-900/60">
        {index + 1}
      </td>
      <SkuCell sku={sku} copiedSku={copiedSku} onCopySku={onCopySku} />
      <td className="border-l border-slate-200 px-4 py-2 text-right font-sans dark:border-slate-700">
        <p className="font-bold text-slate-900 dark:text-slate-100">{name}</p>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {hasDistinctPart && <span>رقم القطعة: {partNumber}</span>}
          {hasBrand && <span>• الماركة: {brand}</span>}
        </div>
      </td>
      <td
        className="border-l border-slate-200 px-3 py-2 text-center font-bold text-blue-600 dark:border-slate-700 dark:text-blue-400"
        dir="ltr"
      >
        {item.quantity}
      </td>
      <td
        className="border-l border-slate-200 px-3 py-2 text-center text-slate-700 dark:border-slate-700 dark:text-slate-300"
        dir="ltr"
      >
        {formatCurrency(item.unit_price, currencyCode)}
      </td>
      <td
        className="border-l border-slate-200 px-3 py-2 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400"
        dir="ltr"
      >
        0.00
      </td>
      <td
        className="border-l border-slate-200 px-3 py-2 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400"
        dir="ltr"
      >
        {formatCurrency(item.total * 0.15, currencyCode)}
      </td>
      <td
        className="bg-emerald-50/20 px-3 py-2 text-center font-black text-slate-900 dark:bg-emerald-950/10 dark:text-slate-100"
        dir="ltr"
      >
        {formatCurrency(item.total, currencyCode)}
      </td>
    </tr>
  );
};

const TableHeader: React.FC = () => (
  <thead>
    <tr className="select-none border-b border-slate-300 bg-slate-200/90 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      <th className="w-10 border-l border-slate-300 bg-slate-300/60 py-1 text-center dark:border-slate-700 dark:bg-slate-950"></th>
      <th className="w-36 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
        A
      </th>
      <th className="min-w-[220px] border-l border-slate-300 px-4 py-1 text-center dark:border-slate-700">
        B
      </th>
      <th className="w-24 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
        C
      </th>
      <th className="w-28 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
        D
      </th>
      <th className="w-24 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
        E
      </th>
      <th className="w-24 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
        F
      </th>
      <th className="w-32 px-3 py-1 text-center">G</th>
    </tr>
    <tr className="border-b-2 border-slate-300 bg-slate-100 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <th className="border-l border-slate-300 bg-slate-200/60 py-2.5 text-center font-mono dark:border-slate-700 dark:bg-slate-900">
        #
      </th>
      <th className="border-l border-slate-300 px-3 py-2.5 text-center dark:border-slate-700">
        رمز الصنف (SKU)
      </th>
      <th className="border-l border-slate-300 px-4 py-2.5 text-right dark:border-slate-700">
        بيان الصنف والوصف
      </th>
      <th className="border-l border-slate-300 px-3 py-2.5 text-center dark:border-slate-700">
        الكمية
      </th>
      <th className="border-l border-slate-300 px-3 py-2.5 text-center dark:border-slate-700">
        سعر الوحدة
      </th>
      <th className="border-l border-slate-300 px-3 py-2.5 text-center dark:border-slate-700">
        الخصم
      </th>
      <th className="border-l border-slate-300 px-3 py-2.5 text-center dark:border-slate-700">
        الضريبة (15%)
      </th>
      <th className="bg-emerald-50/60 px-3 py-2.5 text-center dark:bg-emerald-950/20">
        الإجمالي الصافي
      </th>
    </tr>
  </thead>
);

interface TableFooterProps {
  itemsLength: number;
  totalUnitsCount: number;
  totalLinesAmount: number;
  currencyCode: string;
}

const TableFooter: React.FC<TableFooterProps> = ({
  itemsLength,
  totalUnitsCount,
  totalLinesAmount,
  currencyCode,
}) => (
  <tfoot>
    <tr className="border-t-2 border-slate-300 bg-gradient-to-r from-slate-200 via-slate-100 to-emerald-100/60 text-xs font-black dark:border-slate-700 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950/40">
      <td className="border-l border-slate-300 bg-slate-300/80 px-2 py-2 text-center font-mono font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
        Σ
      </td>
      <td className="border-l border-slate-300 px-3 py-2 font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">
        إجمالي الورقة ({itemsLength} صنف)
      </td>
      <td className="border-l border-slate-300 px-4 py-2 font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
        مجموع الكميات الموردة
      </td>
      <td
        className="border-l border-slate-300 px-3 py-2 text-center font-mono font-black text-blue-700 dark:border-slate-700 dark:text-blue-300"
        dir="ltr"
      >
        {totalUnitsCount} وحدة
      </td>
      <td className="border-l border-slate-300 px-3 py-2 text-center text-slate-400 dark:border-slate-700">
        -
      </td>
      <td
        className="border-l border-slate-300 px-3 py-2 text-center font-mono text-slate-600 dark:border-slate-700 dark:text-slate-400"
        dir="ltr"
      >
        0.00
      </td>
      <td
        className="border-l border-slate-300 px-3 py-2 text-center font-mono text-slate-600 dark:border-slate-700 dark:text-slate-400"
        dir="ltr"
      >
        {formatCurrency(totalLinesAmount * 0.15, currencyCode)}
      </td>
      <td
        className="bg-emerald-50 px-3 py-2 text-center font-mono text-sm font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
        dir="ltr"
      >
        {formatCurrency(totalLinesAmount, currencyCode)}
      </td>
    </tr>
  </tfoot>
);

interface TableFooterSummaryProps {
  invoice: PurchaseDetailInvoice;
}

const TableFooterSummary: React.FC<TableFooterSummaryProps> = ({ invoice }) => {
  const notes = invoice.notes;
  const hasNotes = typeof notes === 'string' && notes.trim().length > 0;
  const currencyCode = invoice.currency_code ?? 'SAR';
  const subtotal = invoice.subtotal ?? invoice.total_amount;

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80 sm:flex-row">
      {hasNotes ? (
        <div className="w-full max-w-md text-xs text-slate-600 dark:text-slate-300">
          <span className="mb-0.5 block font-black text-slate-400 dark:text-slate-500">
            ملاحظات الفاتورة:
          </span>
          <p className="rounded-lg border border-slate-200 bg-white p-2 font-medium dark:border-slate-700 dark:bg-slate-900">
            {notes}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs italic text-slate-400">
          <Layers size={14} className="text-slate-400" />
          <span>جميع الأصناف مسجلة ومطابقة لأمر الشراء والتوريد المخزني</span>
        </div>
      )}

      <div className="w-full space-y-1.5 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-900 sm:w-80">
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>المجموع الفرعي (قبل الضريبة):</span>
          <span dir="ltr" className="font-mono font-bold">
            {formatCurrency(subtotal, currencyCode)}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900 dark:border-slate-700 dark:text-slate-100">
          <span>الإجمالي النهائي المستحق:</span>
          <span dir="ltr" className="font-mono text-base text-emerald-600 dark:text-emerald-400">
            {formatCurrency(invoice.total_amount, currencyCode)}
          </span>
        </div>
      </div>
    </div>
  );
};

interface TableBodyProps {
  filteredItems: PurchasePrintItem[];
  currencyCode: string;
  copiedSku: string | null;
  onCopySku: (sku: string) => void;
}

const TableBody: React.FC<TableBodyProps> = ({
  filteredItems,
  currencyCode,
  copiedSku,
  onCopySku,
}) => (
  <tbody className="divide-y divide-slate-200 font-mono text-xs dark:divide-slate-700/60">
    {filteredItems.map((item, index) => (
      <TableRowItem
        key={item.id}
        item={item}
        index={index}
        currencyCode={currencyCode}
        copiedSku={copiedSku}
        onCopySku={onCopySku}
      />
    ))}
    {filteredItems.length === 0 && (
      <tr>
        <td colSpan={8} className="py-10 text-center text-xs font-bold text-slate-400">
          لا توجد أصناف مطابقة لعملية البحث الحالية
        </td>
      </tr>
    )}
  </tbody>
);

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
  invoice,
  filteredItems,
  searchQuery,
  onSearchChange,
  copiedSku,
  onCopySku,
  totalUnitsCount,
  totalLinesAmount,
}) => {
  const currencyCode = invoice.currency_code ?? 'SAR';

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-[var(--app-surface)] shadow-md dark:border-slate-700">
      <SheetRibbon
        itemsCount={filteredItems.length}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />

      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-right font-sans text-xs sm:min-w-full">
          <TableHeader />
          <TableBody
            filteredItems={filteredItems}
            currencyCode={currencyCode}
            copiedSku={copiedSku}
            onCopySku={onCopySku}
          />
          <TableFooter
            itemsLength={filteredItems.length}
            totalUnitsCount={totalUnitsCount}
            totalLinesAmount={totalLinesAmount}
            currencyCode={currencyCode}
          />
        </table>
      </div>

      <TableFooterSummary invoice={invoice} />
    </div>
  );
};
