import React, { useState, useMemo } from 'react';
import { Search, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatLocalDate } from '../../../core/utils';
import { useUnpaidPartyInvoices } from '../hooks';
import { cn } from '../../../core/utils';

interface PartyInvoicesListProps {
  partyId: string;
  partyType: 'customer' | 'supplier';
  onSelectInvoice: (invoice: any) => void;
  selectedInvoiceId?: string | undefined;
}

const PartyInvoicesList: React.FC<PartyInvoicesListProps> = ({
  partyId,
  partyType,
  onSelectInvoice,
  selectedInvoiceId,
}) => {
  const { data: invoices, isLoading } = useUnpaidPartyInvoices(partyId, partyType);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    if (!searchQuery.trim()) {
      return invoices;
    }

    const lowerQuery = searchQuery.toLowerCase();

    return invoices.filter((inv: any) => {
      // 1. Search by invoice number
      if (inv.invoice_number?.toLowerCase().includes(lowerQuery)) return true;
      // 2. Search by notes
      if (inv.notes?.toLowerCase().includes(lowerQuery)) return true;
      // 3. Search by date
      if (inv.issue_date?.includes(lowerQuery)) return true;
      // 4. Search by total amount
      if (inv.total_amount?.toString().includes(lowerQuery)) return true;

      // 5. Search by items (part name, brand, sku)
      if (inv.invoice_items && inv.invoice_items.length > 0) {
        const itemMatch = inv.invoice_items.some((item: any) => {
          const product = item.product || {};
          return (
            product.name_ar?.toLowerCase().includes(lowerQuery) ||
            product.sku?.toLowerCase().includes(lowerQuery) ||
            product.part_number?.toLowerCase().includes(lowerQuery) ||
            product.brand?.toLowerCase().includes(lowerQuery)
          );
        });
        if (itemMatch) return true;
      }

      return false;
    });
  }, [invoices, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            جاري جلب الفواتير...
          </span>
        </div>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-100 bg-emerald-50/50 p-6 text-center dark:border-emerald-900/30 dark:bg-emerald-900/10">
        <div className="rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-300">
            لا توجد فواتير آجلة
          </h3>
          <p className="mt-1 text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70">
            لا توجد فواتير غير مسددة مسجلة على هذه الجهة
          </p>
        </div>
      </div>
    );
  }

  const headerTitle = partyType === 'customer' ? 'فواتير العميل الآجلة' : 'فواتير المورد الآجلة';

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-1 px-3 text-[10px] font-black uppercase tracking-tighter text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            {headerTitle} ({filteredInvoices.length})
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الفاتورة، القطعة، المبلغ..."
            className="w-full rounded-xl border-2 border-transparent bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold outline-none transition-all placeholder:text-gray-400 focus:border-blue-500/30 focus:bg-white dark:bg-slate-800 dark:focus:border-blue-500/20"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        </div>
      </div>

      <div className="custom-scrollbar max-h-64 space-y-2 overflow-y-auto pr-1">
        {filteredInvoices.length === 0 ? (
          <div className="py-8 text-center text-sm font-bold text-gray-400">
            لا توجد فواتير تطابق بحثك
          </div>
        ) : (
          filteredInvoices.map((inv: any) => {
            const isSelected = selectedInvoiceId === inv.id;
            const paid = Number(inv.paid_amount || 0);
            const total = Number(inv.total_amount || 0);
            const remaining = total - paid;

            return (
              <div
                key={inv.id}
                onClick={() => onSelectInvoice(isSelected ? null : inv)}
                className={cn(
                  'group cursor-pointer rounded-xl border-2 p-3 transition-all hover:shadow-md',
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-500/50 dark:bg-blue-900/20'
                    : 'border-gray-100 bg-white hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 dark:bg-slate-800'
                      )}
                    >
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-slate-100">
                          {inv.invoice_number}
                        </span>
                        {paid > 0 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            تسديد جزئي
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[10px] font-bold text-gray-500">
                        {formatLocalDate(inv.issue_date)} • {inv.notes || 'لا يوجد بيان'}
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                      {formatCurrency(remaining)}{' '}
                      <span className="text-[10px]">{inv.currency_code}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] font-bold text-gray-400">
                      الإجمالي: {formatCurrency(total)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PartyInvoicesList;
