import React, { useState, useMemo } from 'react';
import {
  Search,
  PackageSearch,
  Table as TableIcon,
  Banknote,
  Calendar,
  User,
  UserSquare,
  X,
} from 'lucide-react';
import type { Invoice, InvoiceItem } from '../types';
import { formatCurrency, ensureLatinDigits } from '../../../core/utils';
import { getItemDisplayName, getItemDisplayCode } from '../utils/returnHelpers';

interface GlobalItemSearchProps {
  invoices: Invoice[];
  onItemSelect: (invoiceId: string) => void;
}

interface SearchResult {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  employeeName: string;
  paymentMethod: string;
  currency: string;
  item: InvoiceItem;
}

const GlobalItemSearch: React.FC<GlobalItemSearchProps> = ({ invoices, onItemSelect }) => {
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const formatDate = (dateStr: string) => {
    return ensureLatinDigits(
      new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    );
  };

  // Build a flat list of all items from all invoices for global searching
  const searchResults = useMemo(() => {
    if (!globalSearchTerm.trim() || globalSearchTerm.length < 2) return [];

    const term = globalSearchTerm.toLowerCase();
    const results: SearchResult[] = [];

    invoices.forEach(invoice => {
      if (!invoice.invoice_items) return;

      invoice.invoice_items.forEach(item => {
        const displayName = getItemDisplayName(item).toLowerCase();
        const displayCode = getItemDisplayCode(item).toLowerCase();
        const matchDesc = (item.description || '').toLowerCase().includes(term);
        const matchCode = (item.product_id || '').toLowerCase().includes(term);
        const matchPrice = (item.unit_price?.toString() || '').includes(term);

        if (
          displayName.includes(term) ||
          displayCode.includes(term) ||
          matchDesc ||
          matchCode ||
          matchPrice
        ) {
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            issueDate: invoice.issue_date,
            customerName: invoice.party?.name || 'عميل نقدي / عام',
            employeeName: invoice.created_by?.full_name || 'موظف المبيعات',
            paymentMethod: invoice.payment_method === 'credit' ? 'آجل' : 'نقداً', // Default fallback map
            currency: invoice.currency_code || 'SAR',
            item: item,
          });
        }
      });
    });

    // Sort by newest first
    return results.sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );
  }, [invoices, globalSearchTerm]);

  return (
    <div className="group relative mb-6 overflow-hidden rounded-3xl border-2 border-indigo-100 bg-white p-6 shadow-sm dark:border-indigo-900/30 dark:bg-slate-800 max-md:p-3">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />

      <div className="relative z-10 mb-4 flex flex-col items-start justify-between gap-4 max-md:gap-4 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-indigo-700 dark:text-indigo-400 max-md:gap-2">
            <PackageSearch size={22} />
            البحث الشامل عن الأصناف
          </h3>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            ابحث عن اسم القطعة أو السعر، وسيظهر لك الكشف بكافة الفواتير التي بيعت فيها هذه القطعة
            مسبقاً.
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
          <input
            type="text"
            value={globalSearchTerm}
            onChange={e => {
              setGlobalSearchTerm(e.target.value);
            }}
            placeholder="ابحث عن قطعة مثلاً: فحمات كورولا..."
            className="w-full rounded-2xl border-2 border-indigo-100 bg-[var(--app-surface)] py-3 pe-10 ps-12 text-sm font-bold shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-indigo-900/50"
          />
          {globalSearchTerm && (
            <button
              onClick={() => {
                setGlobalSearchTerm('');
              }}
              className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full bg-[var(--app-surface)] p-1 text-slate-400 transition-colors hover:text-rose-500 max-md:p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Results Table */}
      {globalSearchTerm.length >= 2 && searchResults.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 mt-6 overflow-hidden rounded-2xl border-2 border-slate-200 bg-[var(--app-surface)] shadow-inner duration-300 dark:border-slate-700">
          <div className="max-h-[300px] overflow-x-auto">
            <table className="w-full border-collapse text-right">
              <thead className="sticky top-0 z-10 border-b-2 border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <tr>
                  <th className="w-10 border-l p-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:text-slate-300 max-md:p-3">
                    #
                  </th>
                  <th className="whitespace-nowrap border-l p-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:text-slate-300 max-md:p-3">
                    التاريخ
                  </th>
                  <th className="border-l p-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:text-slate-300 max-md:p-3">
                    اسم القطعة (وصف)
                  </th>
                  <th className="border-l p-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:text-slate-300 max-md:p-3">
                    رقم القطعة
                  </th>
                  <th className="whitespace-nowrap border-l p-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:text-slate-300 max-md:p-3">
                    العميل / المورد
                  </th>
                  <th className="whitespace-nowrap border-l p-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:text-slate-300 max-md:p-3">
                    البائع
                  </th>
                  <th className="whitespace-nowrap border-l p-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:text-slate-300 max-md:p-3">
                    سعر الوحدة
                  </th>
                  <th className="w-24 p-3 text-center text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 max-md:p-3">
                    إجراء
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {searchResults.map((result, idx) => (
                  <tr
                    key={`${result.invoiceId}-${result.item.id}-${idx}`}
                    onClick={() => {
                      onItemSelect(result.invoiceId);
                    }}
                    className="group cursor-pointer transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  >
                    <td className="border-l p-3 text-center text-xs font-bold text-slate-400 dark:border-slate-800 max-md:p-3">
                      {idx + 1}
                    </td>
                    <td className="whitespace-nowrap border-l p-3 dark:border-slate-800 max-md:p-3">
                      <div className="flex items-center justify-end gap-1 max-md:gap-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {formatDate(result.issueDate)}
                        </span>
                        <Calendar size={12} className="text-slate-400" />
                      </div>
                    </td>
                    <td className="border-l p-3 dark:border-slate-800 max-md:p-3">
                      <span className="line-clamp-1 text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                        {getItemDisplayName(result.item)}
                      </span>
                    </td>
                    <td className="border-l p-3 dark:border-slate-800 max-md:p-3">
                      <span
                        className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        dir="ltr"
                      >
                        {getItemDisplayCode(result.item)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap border-l p-3 dark:border-slate-800 max-md:p-3">
                      <div className="flex items-center justify-end gap-1 max-md:gap-1.5">
                        <span
                          className="line-clamp-1 max-w-[120px] text-xs font-bold text-slate-600 dark:text-slate-400"
                          title={result.customerName}
                        >
                          {result.customerName}
                        </span>
                        <User size={12} className="text-slate-400" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-l p-3 dark:border-slate-800 max-md:p-3">
                      <div className="flex flex-col items-end gap-0 max-md:gap-0.5">
                        <div className="flex items-center justify-end gap-1 max-md:gap-1.5">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            {result.employeeName}
                          </span>
                          <UserSquare size={12} className="text-slate-400" />
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${result.paymentMethod === 'آجل' ? 'bg-amber-100/50 text-amber-700 dark:text-amber-400' : 'bg-green-100/50 text-green-700 dark:text-green-400'}`}
                        >
                          {result.paymentMethod === 'آجل' ? 'آجل' : 'كاش'}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-l p-3 dark:border-slate-800 max-md:p-3">
                      <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400 max-md:gap-1.5">
                        <span className="font-mono text-sm font-bold">
                          {formatCurrency(result.item.unit_price, result.currency)}
                        </span>
                        <Banknote size={14} />
                      </div>
                    </td>
                    <td className="p-3 text-center max-md:p-3">
                      <button
                        className="w-full rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-all hover:bg-indigo-600 hover:text-white dark:bg-indigo-900/50 dark:text-indigo-300"
                        onClick={e => {
                          e.stopPropagation();
                          onItemSelect(result.invoiceId);
                        }}
                      >
                        إرجاع الصنف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-2 text-center dark:border-slate-700 dark:bg-slate-800/80 max-md:p-2">
            <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 max-md:gap-1">
              <TableIcon size={12} />
              يتم عرض النتائج من جميع الفواتير النشطة أعلاه
            </span>
          </div>
        </div>
      )}

      {globalSearchTerm.length >= 2 && searchResults.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Search size={24} className="text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            لم يتم العثور على أي قطعة تطابق "{globalSearchTerm}"
          </p>
          <p className="mt-2 text-xs font-bold text-slate-400">
            جرب البحث بكلمة مختلفة أو جزء من رقم الكود
          </p>
        </div>
      )}
    </div>
  );
};

export default GlobalItemSearch;
