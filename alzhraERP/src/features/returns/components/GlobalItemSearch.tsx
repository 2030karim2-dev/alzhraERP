import React, { useState, useMemo } from 'react';
import { Search, PackageSearch, Table as TableIcon, Banknote, Calendar, User, UserSquare, X } from 'lucide-react';
import { Invoice, InvoiceItem } from '../types';

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
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number, currency: string = 'SAR') => {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(amount);
        } catch (e) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'SAR'
            }).format(amount);
        }
    };

    // Build a flat list of all items from all invoices for global searching
    const searchResults = useMemo(() => {
        if (!globalSearchTerm.trim() || globalSearchTerm.length < 2) return [];

        const term = globalSearchTerm.toLowerCase();
        const results: SearchResult[] = [];

        invoices.forEach(invoice => {
            if (!invoice.invoice_items) return;

            invoice.invoice_items.forEach(item => {
                const matchDesc = (item.description || '').toLowerCase().includes(term);
                const matchCode = (item.product_id || '').toLowerCase().includes(term);
                const matchPrice = (item.unit_price?.toString() || '').includes(term);

                if (matchDesc || matchCode || matchPrice) {
                    results.push({
                        invoiceId: invoice.id,
                        invoiceNumber: invoice.invoice_number,
                        issueDate: invoice.issue_date,
                        customerName: invoice.party?.name || 'عميل نقدي / عام',
                        employeeName: invoice.created_by?.full_name || 'موظف المبيعات',
                        paymentMethod: invoice.payment_method === 'credit' ? 'آجل' : 'نقشبند', // Default fallback map
                        currency: invoice.currency_code || 'SAR',
                        item: item
                    });
                }
            });
        });

        // Sort by newest first
        return results.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [invoices, globalSearchTerm]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-indigo-100 dark:border-indigo-900/30 shadow-sm relative overflow-hidden mb-6 group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                        <PackageSearch size={22} />
                        البحث الشامل عن الأصناف
                    </h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                        ابحث عن اسم القطعة أو السعر، وسيظهر لك الكشف بكافة الفواتير التي بيعت فيها هذه القطعة مسبقاً.
                    </p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
                    <input
                        type="text"
                        value={globalSearchTerm}
                        onChange={(e) => setGlobalSearchTerm(e.target.value)}
                        placeholder="ابحث عن قطعة مثلاً: فحمات كورولا..."
                        className="w-full ps-12 pe-10 py-3 bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all shadow-sm"
                    />
                    {globalSearchTerm && (
                        <button
                            onClick={() => setGlobalSearchTerm('')}
                            className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-900 rounded-full p-1"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Results Table */}
            {globalSearchTerm.length >= 2 && searchResults.length > 0 && (
                <div className="mt-6 border-2 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-inner animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm border-b-2 border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="p-3 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase w-10 text-center border-l dark:border-slate-700">#</th>
                                    <th className="p-3 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap border-l dark:border-slate-700">التاريخ</th>
                                    <th className="p-3 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase border-l dark:border-slate-700">اسم القطعة (وصف)</th>
                                    <th className="p-3 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase border-l dark:border-slate-700">رقم القطعة</th>
                                    <th className="p-3 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap border-l dark:border-slate-700">العميل / المورد</th>
                                    <th className="p-3 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap border-l dark:border-slate-700">البائع</th>
                                    <th className="p-3 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap border-l dark:border-slate-700">سعر الوحدة</th>
                                    <th className="p-3 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 w-24 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {searchResults.map((result, idx) => (
                                    <tr
                                        key={`${result.invoiceId}-${result.item.id}-${idx}`}
                                        onClick={() => onItemSelect(result.invoiceId)}
                                        className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-3 text-xs font-bold text-slate-400 text-center border-l dark:border-slate-800">{idx + 1}</td>
                                        <td className="p-3 whitespace-nowrap border-l dark:border-slate-800">
                                            <div className="flex items-center gap-1.5 justify-end">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDate(result.issueDate)}</span>
                                                <Calendar size={12} className="text-slate-400" />
                                            </div>
                                        </td>
                                        <td className="p-3 border-l dark:border-slate-800">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{result.item.description || 'بدون اسم'}</span>
                                        </td>
                                        <td className="p-3 border-l dark:border-slate-800">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">{result.item.product_id || '-'}</span>
                                        </td>
                                        <td className="p-3 whitespace-nowrap border-l dark:border-slate-800">
                                            <div className="flex items-center gap-1.5 justify-end">
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 line-clamp-1 max-w-[120px]" title={result.customerName}>{result.customerName}</span>
                                                <User size={12} className="text-slate-400" />
                                            </div>
                                        </td>
                                        <td className="p-3 whitespace-nowrap border-l dark:border-slate-800">
                                            <div className="flex flex-col items-end gap-0.5">
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{result.employeeName}</span>
                                                    <UserSquare size={12} className="text-slate-400" />
                                                </div>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${result.paymentMethod === 'آجل' ? 'bg-amber-100/50 text-amber-700 dark:text-amber-400' : 'bg-green-100/50 text-green-700 dark:text-green-400'}`}>
                                                    {result.paymentMethod === 'آجل' ? 'آجل' : 'كاش'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3 whitespace-nowrap border-l dark:border-slate-800">
                                            <div className="flex items-center gap-1.5 justify-end text-emerald-600 dark:text-emerald-400">
                                                <span className="text-sm font-bold font-mono">{formatCurrency(result.item.unit_price, result.currency)}</span>
                                                <Banknote size={14} />
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                className="w-full px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                                                onClick={(e) => {
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
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-2 text-center border-t border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
                            <TableIcon size={12} />
                            يتم عرض النتائج من جميع الفواتير النشطة أعلاه
                        </span>
                    </div>
                </div>
            )
            }

            {
                globalSearchTerm.length >= 2 && searchResults.length === 0 && (
                    <div className="mt-6 flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Search size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">لم يتم العثور على أي قطعة تطابق "{globalSearchTerm}"</p>
                        <p className="text-xs font-bold text-slate-400 mt-2">جرب البحث بكلمة مختلفة أو جزء من رقم الكود</p>
                    </div>
                )
            }

        </div >
    );
};

export default GlobalItemSearch;
