import React, { useState, useMemo } from 'react';
import { FileText, Search, X, ChevronDown, Calendar, User, Banknote } from 'lucide-react';
import { Invoice } from '../types';
import { formatCurrency } from '../../../core/utils';

interface InvoiceSelectorProps {
    invoices: Invoice[];
    selectedInvoiceId: string;
    onSelectInvoice: (invoiceId: string) => void;
    placeholder?: string;
}

const InvoiceSelector: React.FC<InvoiceSelectorProps> = ({
    invoices,
    selectedInvoiceId,
    onSelectInvoice,
    placeholder = 'اختر الفاتورة الأصلية...'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInvoices = useMemo(() => {
        if (!searchTerm) return invoices;
        const term = searchTerm.toLowerCase();
        return invoices.filter(invoice => {
            const matchInvoice = invoice.invoice_number.toLowerCase().includes(term) ||
                (invoice.party?.name || '').toLowerCase().includes(term) ||
                formatDate(invoice.issue_date).includes(term);

            const matchItems = invoice.invoice_items?.some(item =>
                (item.description || '').toLowerCase().includes(term) ||
                (item.product_id || '').toLowerCase().includes(term) ||
                (item.unit_price?.toString() || '').includes(term)
            );

            return matchInvoice || matchItems;
        });
    }, [invoices, searchTerm]);

    const selectedInvoice = useMemo(() => {
        return invoices.find(inv => inv.id === selectedInvoiceId);
    }, [invoices, selectedInvoiceId]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB');
    };

    return (
        <div className="relative">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                الفاتورة الأصلية <span className="text-red-500">*</span>
            </label>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl text-sm font-bold hover:border-blue-500 focus:border-blue-500 transition-colors"
            >
                <span className={selectedInvoice ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {selectedInvoice
                        ? `${selectedInvoice.invoice_number} - ${formatDate(selectedInvoice.issue_date)}`
                        : placeholder}
                </span>
                <ChevronDown size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''} text-gray-400`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl shadow-xl max-h-96 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                        <div className="relative">
                            <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="البحث برقم الفاتورة، اسم العميل، أو التاريخ..."
                                className="w-full ps-12 pe-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                autoFocus
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            ابحث بـ: رقم الفاتورة - اسم العميل/المورد - التاريخ
                        </p>
                    </div>

                    {/* Invoice List */}
                    <div className="max-h-72 overflow-y-auto">
                        {filteredInvoices.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <Search size={32} className="mx-auto mb-2 opacity-50" />
                                <p>لا توجد فواتير مطابقة للبحث</p>
                            </div>
                        ) : (
                            filteredInvoices.slice(0, 50).map((invoice) => (
                                <button
                                    key={invoice.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectInvoice(invoice.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`w-full p-4 text-right border-b border-gray-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${invoice.id === selectedInvoiceId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileText size={16} className="text-blue-600" />
                                                <p className="font-bold text-gray-900 dark:text-white">
                                                    {invoice.invoice_number}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <User size={12} />
                                                <span>{invoice.party?.name || 'عميل نقدي'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                <Calendar size={12} />
                                                <span>{formatDate(invoice.issue_date)}</span>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-1 text-green-600">
                                                <Banknote size={14} />
                                                <span className="font-bold">{formatCurrency(invoice.total_amount, invoice.currency_code || 'SAR')}</span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {invoice.invoice_items?.length || 0} أصناف
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {filteredInvoices.length > 0 && (
                        <div className="p-2 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-500 text-center">
                            Showing {filteredInvoices.length} of {invoices.length} invoices
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InvoiceSelector;
