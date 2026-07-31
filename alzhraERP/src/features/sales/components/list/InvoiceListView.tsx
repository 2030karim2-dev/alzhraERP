
import React, { useMemo, useCallback } from 'react';
import SalesStats from './SalesStats';
import ExcelTable from '../../../../ui/common/ExcelTable';
import { useInvoices, useDeleteInvoice } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import type { CurrencyCode } from '../../../../core/utils/currencyUtils';
import { Eye, Trash2 } from 'lucide-react';
import ShareButton from '../../../../ui/common/ShareButton';
import EmptyState from '../../../../ui/base/EmptyState';
import PageLoader from '../../../../ui/base/PageLoader';
import ErrorDisplay from '../../../../ui/base/ErrorDisplay';
import { InvoiceListItem, InvoiceType } from '../../types';

interface InvoiceListViewProps {
    viewType: InvoiceType;
    searchTerm: string;
    onViewDetails: (id: string) => void;
}

const InvoiceListView: React.FC<InvoiceListViewProps> = ({ viewType, searchTerm, onViewDetails }) => {
    const { data: invoices, isLoading, error, refetch } = useInvoices();
    const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();

    const filteredData = useMemo(() => {
        if (!invoices) return [];
        return (invoices as InvoiceListItem[]).filter(item => {
            const matchesType = item.type === viewType;
            const matchesSearch = (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesType && matchesSearch;
        });
    }, [invoices, searchTerm, viewType]);

    const handleViewDetails = useCallback((id: string) => onViewDetails(id), [onViewDetails]);
    const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إلغاء أثرها المالي والمخزني.')) {
            deleteInvoice(id);
        }
    }, [deleteInvoice]);

    const columns = useMemo(() => [
        {
            header: 'العملية',
            accessorKey: 'invoiceNumber' as keyof InvoiceListItem,
            accessor: (row: InvoiceListItem) => <span dir="ltr" className="font-mono font-bold text-blue-600">#{row.invoiceNumber}</span>,
            width: 'w-32'
        },
        {
            header: 'العميل',
            accessorKey: 'customerName' as keyof InvoiceListItem,
            accessor: (row: InvoiceListItem) => <span className="font-bold text-gray-800 dark:text-slate-100">{row.customerName}</span>
        },
        {
            header: 'التاريخ',
            accessorKey: 'date' as keyof InvoiceListItem,
            accessor: (row: InvoiceListItem) => <span className="font-mono text-xs text-gray-500 dark:text-slate-400">{row.date}</span>,
            width: 'w-24'
        },
        {
            header: 'طريقة الدفع',
            accessorKey: 'paymentMethod' as keyof InvoiceListItem,
            accessor: (row: InvoiceListItem) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.paymentMethod === 'cash'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                    {row.paymentMethod === 'cash' ? 'نقدي' : 'أجل'}
                </span>
            ),
            width: 'w-20',
            className: 'text-center'
        },
        {
            header: 'الإجمالي (الأساسي)',
            sortKey: 'total' as keyof InvoiceListItem,
            accessor: (row: InvoiceListItem) => (
                <div className="flex flex-col items-end leading-tight">
                    <span dir="ltr" className="font-mono font-bold text-emerald-600">
                        {formatCurrency(row.total, row.currencyCode as CurrencyCode | undefined)}
                    </span>
                    {(row.currencyCode && row.currencyCode !== 'SAR') && (
                        <span dir="ltr" className="text-[10px] font-bold text-blue-500 mt-0.5">
                            {formatCurrency(row.baseTotal)}
                        </span>
                    )}
                </div>
            ),
            width: 'w-32',
            className: 'text-left'
        },
        {
            header: 'الحالة',
            accessorKey: 'status' as keyof InvoiceListItem,
            sortKey: 'status' as keyof InvoiceListItem,
            accessor: (row: InvoiceListItem) => (
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    row.status === 'posted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                    {row.status === 'paid' ? 'مدفوع' : row.status === 'posted' ? 'مرحل' : 'مسودة'}
                </span>
            ),
            width: 'w-24',
            className: 'text-center'
        },
        {
            header: 'إجراءات',
            accessor: (row: InvoiceListItem) => (
                <div className="flex items-center gap-0.5">
                    <ShareButton
                        size="sm"
                        eventType="sale_invoice"
                        title={`مشاركة فاتورة #${row.invoiceNumber}`}
                        message={`🧾 فاتورة #${row.invoiceNumber}\n━━━━━━━━━━━━━━\n👤 ${row.customerName}\n💰 ${formatCurrency(row.total, row.currencyCode as CurrencyCode | undefined)}\n📅 ${row.date}\n💳 ${row.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}`}
                    />
                    <button onClick={() => handleViewDetails(row.id)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded transition-colors">
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={(e) => handleDelete(e, row.id)}
                        disabled={isDeleting}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
            width: 'w-24',
            className: 'text-center'
        }
    ], [handleViewDetails, handleDelete, isDeleting]);

    if (isLoading) return <PageLoader />;

    if (error) return <ErrorDisplay error={error?.message || 'فشل في تحميل البيانات'} onRetry={refetch} />;

    if (filteredData.length === 0) {
        return <EmptyState title="لا توجد فواتير" description="لم يتم العثور على سجلات مطابقة لمعايير البحث." />;
    }

    return (
        <div className="space-y-4">
            {viewType === 'sale' && <SalesStats />}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm overflow-hidden">
                <ExcelTable
                    columns={columns}
                    data={(filteredData as InvoiceListItem[]).map(item => ({
                        ...item,
                        invoiceNumber: item.invoiceNumber || '',
                        paymentMethod: item.paymentMethod || 'cash'
                    })) as InvoiceListItem[]}
                    colorTheme={viewType === 'sale' ? 'blue' : 'orange'}
                />
            </div>
        </div>
    );
};

export default React.memo(InvoiceListView);
