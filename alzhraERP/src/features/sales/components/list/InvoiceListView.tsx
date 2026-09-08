import React, { useMemo, useCallback, useState, useEffect } from 'react';
import SalesStats from './SalesStats';
import ExcelTable from '../../../../ui/common/ExcelTable';
import { useInvoices, useDeleteInvoice } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';

import { Eye, Trash2, ArrowLeftRight, FileSpreadsheet, Package } from 'lucide-react';
import EmptyState from '../../../../ui/base/EmptyState';
import PageLoader from '../../../../ui/base/PageLoader';
import ErrorDisplay from '../../../../ui/base/ErrorDisplay';
import type { InvoiceListItem, InvoiceType } from '../../types';
import { useFeedbackStore } from '../../../feedback/store';
import InvoiceSearchToolbar from '../../../../ui/common/InvoiceSearchToolbar';
import type { DatePreset } from '@/core/types/invoiceSearch';

interface InvoiceListViewProps {
  viewType: InvoiceType;
  searchTerm: string;
  onViewDetails: (id: string) => void;
}

const statusLabel = (status: string) => {
  if (status === 'paid')
    return {
      label: 'مدفوع',
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    };
  if (status === 'posted')
    return {
      label: 'مرحّل',
      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
  if (status === 'partially_paid')
    return {
      label: 'مدفوع جزئياً',
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };
  if (status === 'pending')
    return {
      label: 'قيد الانتظار',
      cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
  if (status === 'cancelled')
    return {
      label: 'ملغاة',
      cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    };
  if (status === 'confirmed')
    return {
      label: 'مؤكد',
      cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    };
  return { label: 'مسودة', cls: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400' };
};

const InvoiceListView: React.FC<InvoiceListViewProps> = ({
  viewType,
  searchTerm,
  onViewDetails,
}) => {
  const [internalSearch, setInternalSearch] = useState(searchTerm || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm || '');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  useEffect(() => {
    if (searchTerm !== undefined && searchTerm !== internalSearch) {
      setInternalSearch(searchTerm);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(internalSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [internalSearch]);

  const searchParams = useMemo(
    () => ({
      searchTerm: debouncedSearch,
      dateFrom,
      dateTo,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
      type: viewType,
    }),
    [debouncedSearch, dateFrom, dateTo, statusFilter, paymentMethodFilter, viewType]
  );

  const { data: invoices, isLoading, error, refetch } = useInvoices(searchParams);
  const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();
  const { showToast } = useFeedbackStore();

  const handleResetFilters = useCallback(() => {
    setInternalSearch('');
    setDebouncedSearch('');
    setDatePreset('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setStatusFilter('all');
    setPaymentMethodFilter('all');
  }, []);

  const displayData = useMemo(() => {
    return (invoices as InvoiceListItem[]) || [];
  }, [invoices]);

  const handleViewDetails = useCallback(
    (id: string) => {
      onViewDetails(id);
    },
    [onViewDetails]
  );
  const handleDelete = useCallback(
    (e: React.MouseEvent, row: InvoiceListItem) => {
      e.stopPropagation();
      if (
        row.status === 'posted' ||
        row.status === 'paid' ||
        (row.status as string) === 'partially_paid'
      ) {
        showToast('لا يمكن حذف فاتورة معتمدة أو مدفوعة. يرجى إنشاء مرتجع بدلاً من ذلك.', 'error');
        return;
      }
      if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إلغاء أثرها المالي والمخزني.')) {
        deleteInvoice(row.id);
      }
    },
    [deleteInvoice, showToast]
  );

  const handleShareExcel = useCallback(
    async (e: React.MouseEvent, row: InvoiceListItem) => {
      e.stopPropagation();
      try {
        const { generateInvoiceExcelBlob, exportInvoiceToExcel } =
          await import('../../../../core/utils/invoiceExcelExporter');
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
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
    },
    [showToast]
  );

  const columns = useMemo(
    () => [
      {
        header: 'رقم الفاتورة',
        accessorKey: 'invoiceNumber' as keyof InvoiceListItem,
        accessor: (row: InvoiceListItem) => (
          <div className="flex items-center gap-1.5">
            {row.type === 'sale_return' && (
              <ArrowLeftRight size={13} className="shrink-0 text-rose-500" />
            )}
            <span
              dir="ltr"
              className={`font-mono font-bold ${row.type === 'sale_return' ? 'text-rose-600' : 'text-blue-600'}`}
            >
              #{row.invoiceNumber}
            </span>
          </div>
        ),
        width: 'w-32',
      },
      {
        header: 'العميل',
        accessorKey: 'customerName' as keyof InvoiceListItem,
        accessor: (row: InvoiceListItem) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-gray-800 dark:text-slate-100">{row.customerName}</span>
            {row.partyPhone && (
              <span className="font-mono text-[10px] text-gray-500 dark:text-slate-400">
                {row.partyPhone}
              </span>
            )}
            {row.matchedItems && row.matchedItems.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {row.matchedItems.map(item => (
                  <span
                    key={item.id}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      item.is_direct_match
                        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                    title={`السعر: ${item.unit_price} | الكمية: ${item.quantity}${item.part_number ? ` | رقم القطعة: ${item.part_number}` : ''}`}
                  >
                    <Package
                      size={10}
                      className="shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                    <span>{item.product_name}</span>
                    {item.part_number && (
                      <span className="font-mono opacity-80">({item.part_number})</span>
                    )}
                    <span className="font-mono font-bold">×{item.quantity}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },

      {
        header: 'التاريخ',
        accessorKey: 'date' as keyof InvoiceListItem,
        accessor: (row: InvoiceListItem) => (
          <span className="font-mono text-xs text-gray-500 dark:text-slate-400">{row.date}</span>
        ),
        width: 'w-24',
      },
      {
        header: 'طريقة الدفع',
        accessorKey: 'paymentMethod' as keyof InvoiceListItem,
        accessor: (row: InvoiceListItem) => (
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
              row.paymentMethod === 'cash'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            {row.paymentMethod === 'cash' ? 'نقدي' : 'أجل'}
          </span>
        ),
        width: 'w-20',
        className: 'text-center',
      },
      {
        header: 'الإجمالي',
        sortKey: 'total' as keyof InvoiceListItem,
        accessor: (row: InvoiceListItem) => {
          const hasForeignCurrency = row.currencyCode && row.currencyCode !== 'SAR';
          const rateIsNotOne = row.exchangeRate && row.exchangeRate !== 1;
          const showBaseLine =
            hasForeignCurrency && rateIsNotOne && Math.abs(row.baseTotal - row.total) > 0.01;
          return (
            <div className="flex flex-col items-end leading-tight">
              <span
                dir="ltr"
                className={`font-mono text-sm font-bold md:text-base ${row.type === 'sale_return' ? 'text-rose-600' : 'text-emerald-600'}`}
              >
                {formatCurrency(row.total, row.currencyCode)}
              </span>
              {showBaseLine && (
                <span dir="ltr" className="mt-0.5 text-xs font-bold text-blue-500">
                  ≈ {formatCurrency(row.baseTotal)}
                </span>
              )}
            </div>
          );
        },
        width: 'w-32',
        className: 'text-left',
      },

      {
        header: 'الحالة',
        accessorKey: 'status' as keyof InvoiceListItem,
        sortKey: 'status' as keyof InvoiceListItem,
        accessor: (row: InvoiceListItem) => {
          const s = statusLabel(row.status || '');
          return (
            <span className={`rounded px-2 py-1 text-[10px] font-bold ${s.cls}`}>{s.label}</span>
          );
        },
        width: 'w-24',
        className: 'text-center',
      },
      {
        header: 'إجراءات',
        accessor: (row: InvoiceListItem) => {
          const isLocked = row.status === 'posted' || row.status === 'paid';
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={e => handleShareExcel(e, row)}
                className="rounded p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                title="تنزيل / مشاركة Excel"
              >
                <FileSpreadsheet size={15} />
              </button>
              <button
                onClick={() => {
                  handleViewDetails(row.id);
                }}
                className="rounded p-1.5 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
              >
                <Eye size={15} />
              </button>
              <button
                onClick={e => {
                  handleDelete(e, row);
                }}
                disabled={isDeleting}
                title={isLocked ? 'لا يمكن حذف فاتورة معتمدة أو مدفوعة' : 'حذف الفاتورة'}
                className={`rounded p-1.5 transition-colors ${
                  isLocked
                    ? 'cursor-not-allowed text-gray-300 dark:text-slate-600'
                    : 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20'
                }`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
        width: 'w-28',
        className: 'text-center',
      },
    ],
    [handleViewDetails, handleDelete, handleShareExcel, isDeleting]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      {viewType === 'sale' && <SalesStats />}

      <InvoiceSearchToolbar
        searchTerm={internalSearch}
        onSearchChange={setInternalSearch}
        datePreset={datePreset}
        onDatePresetChange={(preset, range) => {
          setDatePreset(preset);
          setDateFrom(range.from);
          setDateTo(range.to);
        }}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        paymentMethodFilter={paymentMethodFilter}
        onPaymentMethodFilterChange={setPaymentMethodFilter}
        totalMatches={displayData.length}
        totalMatchingCount={displayData[0]?.totalMatchingCount || displayData.length}
        isLoading={isLoading}
        onResetFilters={handleResetFilters}
        scopeLabel="sales"
      />

      {error ? (
        <ErrorDisplay error={error?.message || 'فشل في تحميل البيانات'} onRetry={refetch} />
      ) : isLoading ? (
        <PageLoader />
      ) : displayData.length > 0 ? (
        <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
          <ExcelTable
            columns={columns}
            data={displayData.map(item => ({
              ...item,
              invoiceNumber: item.invoiceNumber || '',
              paymentMethod: item.paymentMethod || 'cash',
            }))}
            colorTheme={viewType === 'sale' ? 'blue' : 'orange'}
          />
        </div>
      ) : (
        <EmptyState
          title="لا توجد فواتير"
          description="لم يتم العثور على أي فواتير أو قطع مطابقة لمعايير البحث المحددة."
        />
      )}
    </div>
  );
};

export default React.memo(InvoiceListView);
