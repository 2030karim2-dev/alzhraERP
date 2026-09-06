import React, { useState, useMemo } from 'react';
import { FileText, Search, X, ChevronDown, Calendar, User, Banknote } from 'lucide-react';
import type { Invoice } from '../types';
import { formatCurrency, normalizeSearch } from '../../../core/utils';

interface InvoiceSelectorProps {
  invoices: Invoice[];
  selectedInvoiceId: string;
  onSelectInvoice: (invoiceId: string) => void;
  placeholder?: string;
}

const formatDate = (dateStr: string): string => new Date(dateStr).toLocaleDateString('en-GB');

interface InvoiceOptionListProps {
  invoices: Invoice[];
  selectedInvoiceId: string;
  onSelect: (id: string) => void;
}

const InvoiceOptionList: React.FC<InvoiceOptionListProps> = ({
  invoices,
  selectedInvoiceId,
  onSelect,
}) => (
  <div className="max-h-96 divide-y divide-gray-100 overflow-y-auto dark:divide-slate-700">
    {invoices.length === 0 ? (
      <div className="p-6 text-center text-sm text-gray-400">لا توجد فواتير مطابقة</div>
    ) : (
      invoices.map(invoice => (
        <button
          key={invoice.id}
          type="button"
          onClick={() => {
            onSelect(invoice.id);
          }}
          className={`w-full p-4 text-right transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 max-md:p-3 ${
            invoice.id === selectedInvoiceId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2 max-md:gap-2">
                <FileText size={16} className="text-blue-600" />
                <p className="font-bold text-gray-900 dark:text-white">{invoice.invoice_number}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 max-md:gap-2">
                <User size={12} />
                <span>{invoice.party?.name ?? 'عميل نقدي'}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 max-md:gap-2">
                <Calendar size={12} />
                <span>{formatDate(invoice.issue_date)}</span>
              </div>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1 text-green-600 max-md:gap-1">
                <Banknote size={14} />
                <span className="font-bold">
                  {formatCurrency(invoice.total_amount, invoice.currency_code ?? 'SAR')}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {invoice.invoice_items?.length ?? 0} أصناف
              </span>
            </div>
          </div>
        </button>
      ))
    )}
  </div>
);

const InvoiceSelector: React.FC<InvoiceSelectorProps> = ({
  invoices,
  selectedInvoiceId,
  onSelectInvoice,
  placeholder = 'اختر الفاتورة الأصلية...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = useMemo(() => {
    const term = normalizeSearch(searchTerm);
    if (!term) return invoices;
    return invoices.filter((invoice): boolean => {
      const matchInvoice =
        normalizeSearch(invoice.invoice_number).includes(term) ||
        normalizeSearch(invoice.party?.name).includes(term) ||
        normalizeSearch(formatDate(invoice.issue_date)).includes(term);

      const matchItems = invoice.invoice_items?.some(
        (item): boolean =>
          normalizeSearch(item.description).includes(term) ||
          normalizeSearch(item.product_id).includes(term) ||
          normalizeSearch(item.unit_price?.toString()).includes(term)
      );

      return matchInvoice || matchItems === true;
    });
  }, [invoices, searchTerm]);

  const selectedInvoice = useMemo(() => {
    return invoices.find(inv => inv.id === selectedInvoiceId);
  }, [invoices, selectedInvoiceId]);

  return (
    <div className="relative">
      <p className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">
        الفاتورة الأصلية <span className="text-red-500">*</span>
      </p>

      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 text-sm font-bold transition-colors hover:border-blue-500 focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 max-md:p-4"
      >
        <span className={selectedInvoice ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {selectedInvoice
            ? `${selectedInvoice.invoice_number} - ${formatDate(selectedInvoice.issue_date)}`
            : placeholder}
        </span>
        <ChevronDown
          size={20}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''} text-gray-400`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 max-h-96 w-full overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
          {/* Search Input */}
          <div className="border-b border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800 max-md:p-3">
            <div className="relative">
              <Search
                className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                }}
                placeholder="البحث برقم الفاتورة، اسم العميل، أو التاريخ..."
                className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-4 ps-12 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-700"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                  }}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              ابحث بـ: رقم الفاتورة - اسم العميل/المورد - التاريخ
            </p>
          </div>

          {/* Invoice List */}
          <InvoiceOptionList
            invoices={filteredInvoices}
            selectedInvoiceId={selectedInvoiceId}
            onSelect={id => {
              onSelectInvoice(id);
              setIsOpen(false);
              setSearchTerm('');
            }}
          />

          {/* Footer */}
          {filteredInvoices.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 p-2 text-center text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-800 max-md:p-2">
              عرض {filteredInvoices.length} من أصل {invoices.length} فاتورة
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceSelector;
