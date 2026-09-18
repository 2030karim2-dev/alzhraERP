import React, { useState, useMemo } from 'react';
import { Search, FileText, CheckCircle2, Eye, ArrowUpDown, Layers } from 'lucide-react';
import { formatCurrency, formatLocalDate } from '../../../core/utils';
import { useUnpaidPartyInvoices } from '../hooks';
import { cn } from '../../../core/utils';
import InvoiceDetailsModal from '../../sales/components/details/InvoiceDetailsModal';

interface PartyInvoicesListProps {
  partyId: string;
  partyType: 'customer' | 'supplier';
  onSelectInvoice: (invoice: any) => void;
  selectedInvoiceId?: string | undefined;
}

type SortField = 'issue_date' | 'total_amount' | 'remaining_amount' | 'invoice_number';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'unpaid' | 'partial';

const PartyInvoicesList: React.FC<PartyInvoicesListProps> = ({
  partyId,
  partyType,
  onSelectInvoice,
  selectedInvoiceId,
}) => {
  const { data: invoices, isLoading } = useUnpaidPartyInvoices(partyId, partyType);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('issue_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  // Toggle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const processedInvoices = useMemo(() => {
    if (!invoices) return [];

    let list = invoices.map((inv: any) => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const remaining = Math.max(0, total - paid);
      const isPartial = paid > 0;
      return {
        ...inv,
        _total: total,
        _paid: paid,
        _remaining: remaining,
        _isPartial: isPartial,
      };
    });

    // 1. Status Filter
    if (statusFilter === 'partial') {
      list = list.filter((inv: any) => inv._isPartial);
    } else if (statusFilter === 'unpaid') {
      list = list.filter((inv: any) => !inv._isPartial);
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      list = list.filter((inv: any) => {
        if (inv.invoice_number?.toLowerCase().includes(lowerQuery)) return true;
        if (inv.notes?.toLowerCase().includes(lowerQuery)) return true;
        if (inv.issue_date?.includes(lowerQuery)) return true;
        if (inv._total.toString().includes(lowerQuery)) return true;
        if (inv._remaining.toString().includes(lowerQuery)) return true;

        if (inv.invoice_items && inv.invoice_items.length > 0) {
          return inv.invoice_items.some((item: any) => {
            const product = item.product || {};
            return (
              product.name_ar?.toLowerCase().includes(lowerQuery) ||
              product.sku?.toLowerCase().includes(lowerQuery) ||
              product.part_number?.toLowerCase().includes(lowerQuery) ||
              product.brand?.toLowerCase().includes(lowerQuery)
            );
          });
        }
        return false;
      });
    }

    // 3. Sorting
    list.sort((a: any, b: any) => {
      let comparison = 0;
      if (sortField === 'issue_date') {
        comparison = new Date(a.issue_date || 0).getTime() - new Date(b.issue_date || 0).getTime();
      } else if (sortField === 'total_amount') {
        comparison = a._total - b._total;
      } else if (sortField === 'remaining_amount') {
        comparison = a._remaining - b._remaining;
      } else if (sortField === 'invoice_number') {
        comparison = (a.invoice_number || '').localeCompare(b.invoice_number || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [invoices, searchQuery, statusFilter, sortField, sortOrder]);

  // Totals calculations
  const totals = useMemo(() => {
    return processedInvoices.reduce(
      (acc, curr) => {
        acc.total += curr._total;
        acc.paid += curr._paid;
        acc.remaining += curr._remaining;
        return acc;
      },
      { total: 0, paid: 0, remaining: 0 }
    );
  }, [processedInvoices]);

  if (isLoading) {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            جاري جلب جدول الفواتير الآجلة...
          </span>
        </div>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-100 bg-emerald-50/40 p-5 text-center dark:border-emerald-900/30 dark:bg-emerald-900/10">
        <div className="rounded-full bg-emerald-100 p-2.5 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 size={22} />
        </div>
        <div>
          <h3 className="text-xs font-black text-emerald-800 dark:text-emerald-300">
            لا توجد فواتير آجلة
          </h3>
          <p className="mt-0.5 text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
            لا توجد فواتير غير مسددة مسجلة على هذه الجهة في السجلات.
          </p>
        </div>
      </div>
    );
  }

  const headerTitle = partyType === 'customer' ? 'فواتير العميل الآجلة' : 'فواتير المورد الآجلة';

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Excel Toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-850 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
              <Layers size={13} />
              <span>{headerTitle}</span>
              <span className="py-0.2 rounded-md bg-white/20 px-1.5 text-[10px] font-bold">
                {processedInvoices.length}
              </span>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                }}
                className={cn(
                  'rounded px-2 py-0.5 transition-colors',
                  statusFilter === 'all'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                )}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('partial');
                }}
                className={cn(
                  'rounded px-2 py-0.5 transition-colors',
                  statusFilter === 'partial'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                )}
              >
                مسدد جزئياً
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('unpaid');
                }}
                className={cn(
                  'rounded px-2 py-0.5 transition-colors',
                  statusFilter === 'unpaid'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                )}
              >
                غير مسدد
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
              }}
              placeholder="بحث برقم الفاتورة، القطعة، المبلغ..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500"
            />
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
          </div>
        </div>

        {/* Excel Spreadsheet Table */}
        <div className="custom-scrollbar max-h-72 overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse text-right text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 text-[10px] font-black uppercase text-slate-600 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/95 dark:text-slate-300">
              <tr>
                <th className="w-10 px-2.5 py-2 text-center">تحديد</th>
                <th
                  onClick={() => {
                    handleSort('invoice_number');
                  }}
                  className="cursor-pointer px-3 py-2 transition-colors hover:text-blue-600"
                >
                  <div className="flex items-center gap-1">
                    <span>رقم الفاتورة</span>
                    <ArrowUpDown size={11} className="opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    handleSort('issue_date');
                  }}
                  className="cursor-pointer px-3 py-2 transition-colors hover:text-blue-600"
                >
                  <div className="flex items-center gap-1">
                    <span>تاريخ الإصدار</span>
                    <ArrowUpDown size={11} className="opacity-60" />
                  </div>
                </th>
                <th className="px-3 py-2">البيان والملاحظات</th>
                <th
                  onClick={() => {
                    handleSort('total_amount');
                  }}
                  className="cursor-pointer px-3 py-2 text-left transition-colors hover:text-blue-600"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>الإجمالي</span>
                    <ArrowUpDown size={11} className="opacity-60" />
                  </div>
                </th>
                <th className="px-3 py-2 text-left">المسدد</th>
                <th
                  onClick={() => {
                    handleSort('remaining_amount');
                  }}
                  className="cursor-pointer px-3 py-2 text-left transition-colors hover:text-blue-600"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>المتبقي</span>
                    <ArrowUpDown size={11} className="opacity-60" />
                  </div>
                </th>
                <th className="px-3 py-2 text-center">الحالة</th>
                <th className="w-16 px-3 py-2 text-center">معاينة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans dark:divide-slate-800">
              {processedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs font-bold text-slate-400">
                    لا توجد فواتير تطابق معايير البحث
                  </td>
                </tr>
              ) : (
                processedInvoices.map((inv: any, idx: number) => {
                  const isSelected = selectedInvoiceId === inv.id;
                  const currency = inv.currency_code || inv.currency || 'SAR';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => {
                        onSelectInvoice(isSelected ? null : inv);
                      }}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-900/20',
                        isSelected
                          ? 'bg-blue-50/90 font-medium text-blue-950 dark:bg-blue-900/30 dark:text-blue-100'
                          : idx % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50/40 dark:bg-slate-850/40'
                      )}
                    >
                      {/* Selection radio/checkbox */}
                      <td
                        className="px-2.5 py-2 text-center"
                        onClick={e => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="radio"
                          name="selected_invoice"
                          checked={isSelected}
                          onChange={() => {
                            onSelectInvoice(isSelected ? null : inv);
                          }}
                          className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
                        />
                      </td>

                      {/* Invoice Number */}
                      <td className="whitespace-nowrap px-3 py-2 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <FileText size={13} className="text-slate-400" />
                          <span
                            className={cn(
                              isSelected
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-slate-800 dark:text-slate-200'
                            )}
                          >
                            {inv.invoice_number}
                          </span>
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {formatLocalDate(inv.issue_date)}
                      </td>

                      {/* Notes / Items summary */}
                      <td className="max-w-[180px] truncate px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {inv.notes ||
                          (inv.invoice_items?.length
                            ? `${inv.invoice_items.length} صنف`
                            : 'فاتورة آجلة')}
                      </td>

                      {/* Total Amount */}
                      <td className="whitespace-nowrap px-3 py-2 text-left font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(inv._total, currency)}
                      </td>

                      {/* Paid Amount */}
                      <td className="whitespace-nowrap px-3 py-2 text-left font-mono text-emerald-600 dark:text-emerald-400">
                        {inv._paid > 0 ? formatCurrency(inv._paid, currency) : '-'}
                      </td>

                      {/* Remaining Amount */}
                      <td className="whitespace-nowrap px-3 py-2 text-left font-mono font-black text-rose-600 dark:text-rose-400">
                        {formatCurrency(inv._remaining, currency)}
                      </td>

                      {/* Status Badge */}
                      <td className="whitespace-nowrap px-3 py-2 text-center">
                        {inv._isPartial ? (
                          <span className="inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            جزئي
                          </span>
                        ) : (
                          <span className="inline-block rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                            معلق
                          </span>
                        )}
                      </td>

                      {/* Preview Button */}
                      <td
                        className="px-3 py-2 text-center"
                        onClick={e => {
                          e.stopPropagation();
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewInvoiceId(inv.id);
                          }}
                          title="معاينة الفاتورة بجميع تفاصيلها وأصنافها"
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-slate-600 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Excel Summary Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span>عدد الفواتير المعروضة:</span>
            <span className="font-mono text-slate-900 dark:text-white">
              {processedInvoices.length}
            </span>
            {selectedInvoiceId && (
              <span className="mr-2 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                تم تحديد فاتورة للسداد
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 font-mono">
              <span className="text-[10px] font-bold text-slate-400">الإجمالي:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formatCurrency(totals.total)}
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-[10px] font-bold text-slate-400">المسدد:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totals.paid)}
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-[10px] font-bold text-slate-400">المتبقي:</span>
              <span className="font-black text-rose-600 dark:text-rose-400">
                {formatCurrency(totals.remaining)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Details Preview Modal */}
      {previewInvoiceId && (
        <InvoiceDetailsModal
          invoiceId={previewInvoiceId}
          onClose={() => {
            setPreviewInvoiceId(null);
          }}
        />
      )}
    </>
  );
};

export default PartyInvoicesList;
