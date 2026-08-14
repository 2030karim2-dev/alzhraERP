import React, { useMemo, useCallback } from 'react';
import SalesStats from './SalesStats';
import ExcelTable from '../../../../ui/common/ExcelTable';
import { useInvoices, useDeleteInvoice } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import type { CurrencyCode } from '../../../../core/utils/currencyUtils';
import { Eye, Trash2, ArrowLeftRight, FileSpreadsheet } from 'lucide-react';
import EmptyState from '../../../../ui/base/EmptyState';
import PageLoader from '../../../../ui/base/PageLoader';
import ErrorDisplay from '../../../../ui/base/ErrorDisplay';
import { InvoiceListItem, InvoiceType } from '../../types';
import { useFeedbackStore } from '../../../feedback/store';

interface InvoiceListViewProps {
    viewType: InvoiceType;
    searchTerm: string;
    onViewDetails: (id: string) => void;
}

const statusLabel = (status: string) => {
    if (status === 'paid') return { label: 'مدفوع', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
    if (status === 'posted') return { label: 'مرحّل', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    if (status === 'partially_paid') return { label: 'مدفوع جزئياً', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    if (status === 'pending') return { label: 'قيد الانتظار', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    if (status === 'cancelled') return { label: 'ملغاة', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' };
    if (status === 'confirmed') return { label: 'مؤكد', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' };
    return { label: 'مسودة', cls: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400' };
};

const InvoiceListView: React.FC<InvoiceListViewProps> = ({ viewType, searchTerm, onViewDetails }) => {
    const { data: invoices, isLoading, error, refetch } = useInvoices();
    const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();
    const { showToast } = useFeedbackStore();

    const filteredData = useMemo(() => {
        if (!invoices) return [];
        // API already filters by type='sale' — no need to re-filter client-side
        return (invoices as InvoiceListItem[]).filter(item => {
            const matchesSearch = (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [invoices, searchTerm]);

    const handleViewDetails = useCallback((id: string) => onViewDetails(id), [onViewDetails]);
    const handleDelete = useCallback((e: React.MouseEvent, row: InvoiceListItem) => {
        e.stopPropagation();
        if (row.status === 'posted' || row.status === 'paid' || row.status === 'partially_paid') {
            showToast('لا يمكن حذف فاتورة معتمدة أو مدفوعة. يرجى إنشاء مرتجع بدلاً من ذلك.', 'error');
            return;
        }
        if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إلغاء أثرها المالي والمخزني.')) {
            deleteInvoice(row.id);
        }
    }, [deleteInvoice, showToast]);

    const handleShareExcel = useCallback(async (e: React.MouseEvent, row: InvoiceListItem) => {
        e.stopPropagation();
        try {
            const { generateInvoiceExcelBlob, exportInvoiceToExcel } = await import('../../../../core/utils/invoiceExcelExporter');
            const data = {
                companyName: '',
                companyAddress: '',
                taxNumber: '',
                invoiceNumber: row.invoiceNumber || '',
                issueDate: row.date,
                customerName: row.customerName || 'عميل نقدي',
                issuedBy: '',
                items: [],
                subtotal: row.total,
                totalAmount: row.total,
            };
            const blob = await generateInvoiceExcelBlob(data);
            const file = new File([blob], `فاتورة_${row.invoiceNumber}.xlsx`, {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: `فاتورة ${row.invoiceNumber}` });
            } else {
                await exportInvoiceToExcel(data);
                showToast('تم تنزيل ملف Excel بنجاح', 'success');
            }
        } catch {
            showToast('فشل في مشاركة الفاتورة', 'error');
        }
    }, [showToast]);

    const columns = useMemo(() => [
        {
            header: 'رقم الفاتورة',
            accessorKey: 'invoiceNumber' as keyof InvoiceListItem,
            accessor: (row: InvoiceListItem) => (
                <div className="flex items-center gap-1.5">
                    {row.type === 'return_sale' && (
                        <ArrowLeftRight size={13} className="text-rose-500 shrink-0" />
                    )}
                    <span dir="ltr" className={`font-mono font-bold ${row.type === 'return_sale' ? 'text-rose-600' : 'text-blue-600'}`}>
                        #{row.invoiceNumber}
                    </span>
                </div>
            ),
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
            header: 'الإجمالي',
            sortKey: 'total' as keyof InvoiceListItem,
            accessor: (row: InvoiceListItem) => {
                const hasForeignCurrency = row.currencyCode && row.currencyCode !== 'SAR';
                const rateIsNotOne = row.exchangeRate && row.exchangeRate !== 1;
                const showBaseLine = hasForeignCurrency && rateIsNotOne && Math.abs(row.baseTotal - row.total) > 0.01;
                return (
                    <div className="flex flex-col items-end leading-tight">
                        <span dir="ltr" className={`font-mono font-bold ${row.type === 'return_sale' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(row.total, row.currencyCode as CurrencyCode | undefined)}
                        </span>
                        {showBaseLine && (
                            <span dir="ltr" className="text-[10px] font-bold text-blue-500 mt-0.5">
                                ≈ {formatCurrency(row.baseTotal)}
                            </span>
                        )}
                    </div>
                );
            },
            width: 'w-32',
            className: 'text-left'
        },

        {
            header: 'الحالة',
            accessorKey: 'status' as keyof InvoiceListItem,
            sortKey: 'status' as keyof InvoiceListItem,
            accessor: (row: InvoiceListItem) => {
                const s = statusLabel(row.status || '');
                return (
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${s.cls}`}>
                        {s.label}
                    </span>
                );
            },
            width: 'w-24',
            className: 'text-center'
        },
        {
            header: 'إجراءات',
            accessor: (row: InvoiceListItem) => {
                const isLocked = row.status === 'posted' || row.status === 'paid';
                return (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => handleShareExcel(e, row)}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded transition-colors"
                            title="تنزيل / مشاركة Excel"
                        >
                            <FileSpreadsheet size={15} />
                        </button>
                        <button onClick={() => handleViewDetails(row.id)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded transition-colors">
                            <Eye size={15} />
                        </button>
                        <button
                            onClick={(e) => handleDelete(e, row)}
                            disabled={isDeleting}
                            title={isLocked ? 'لا يمكن حذف فاتورة معتمدة أو مدفوعة' : 'حذف الفاتورة'}
                            className={`p-1.5 rounded transition-colors ${isLocked
                                ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                                : 'hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                );
            },
            width: 'w-28',
            className: 'text-center'
        }
    ], [handleViewDetails, handleDelete, handleShareExcel, isDeleting]);

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
