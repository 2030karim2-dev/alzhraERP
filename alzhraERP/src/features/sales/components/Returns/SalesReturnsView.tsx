import React, { useState, useRef } from 'react';
import { Plus, Eye, RotateCcw, FileText, Trash2, ShoppingCart } from 'lucide-react';
import ExcelTable from '../../../../ui/common/ExcelTable';
import {
  useSalesReturns,
  useSalesReturnsStats,
  type SalesReturn,
} from '../../hooks/useSalesReturns';
import { useDeleteInvoice } from '../../hooks/index';
import { formatCurrency, sumInBaseCurrency } from '../../../../core/utils';
import Button from '../../../../ui/base/Button';
import { exportToPDF } from '../../../../core/utils/pdfExporter';
import { formatLocalDate } from '../../../../core/utils/dateUtils';
import { AdvancedReturnModal } from '../../../returns/components/AdvancedReturnModal';
import { useReturnsListView, type ReturnsListRow } from '../../../returns/hooks/useReturnsListView';
import { ReturnsStatsHeader } from '../../../returns/components/view/ReturnsStatsHeader';
import { ReturnsFilterControls } from '../../../returns/components/view/ReturnsFilterControls';
import { logger } from '../../../../core/utils/logger';

// Status labels
const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  posted: 'معتمد',
  paid: 'مدفوع',
};

/**
 * توحيد سجل مرتجع مبيعات مع ReturnsListRow حتى يتوافق مع
 * useReturnsListView (كانت SalesReturn[] لا تطابق ReturnsListRow[]).
 */
const normalizeSalesReturn = (row: SalesReturn): ReturnsListRow => ({
  id: row.id,
  invoice_number: row.invoice_number,
  issue_date: row.issue_date,
  created_at: row.created_at,
  total_amount: row.total_amount,
  exchange_rate: row.exchange_rate ?? null,
  status: row.status,
  notes: row.notes ?? null,
  invoice_items: row.invoice_items ?? [],
  party: row.party === null || row.party === undefined ? null : { name: row.party.name },
  reference_invoice_id: row.reference_invoice_id ?? null,
  return_reason: null,
});

interface SalesReturnsViewProps {
  searchTerm: string;
  onViewDetails: (id: string) => void;
}

/** صف مرتجع مبيعات كما يعيده `useSalesReturns`/`useReturnsListView` (المطبَّع للعرض). */
interface SalesReturnRow {
  id: string;
  invoice_number?: string | null;
  reference_invoice_id?: string | null;
  issue_date?: string | null;
  created_at?: string | null;
  total_amount?: number | null;
  currency_code?: string | null;
  exchange_rate?: number | null;
  status?: string | null;
  invoice_items?: { length: number } | null;
  party?: { name?: string | null } | null;
}

const SalesReturnsView: React.FC<SalesReturnsViewProps> = ({
  searchTerm: propSearchTerm,
  onViewDetails,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useSalesReturnsStats();
  const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();

  // We fetch without strict filters since client-side filtering handles most cases for small-medium lists
  // But for larger datasets, server-side filtering would be preferred.
  // For now, keeping the pattern consistent with original implementation.
  const [queryFilters, setQueryFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });

  const {
    data: returns,
    isLoading,
    refetch,
  } = useSalesReturns({
    searchTerm: propSearchTerm || '', // Initial search term passed to query
    status: queryFilters.status || undefined,
    startDate: queryFilters.startDate || undefined,
    endDate: queryFilters.endDate || undefined,
  });

  // توحيد النوع مع ReturnsListRow قبل تمريره لعرض القائمة
  const normalizedReturns = (returns || []).map(normalizeSalesReturn);

  const {
    localSearchTerm,
    setLocalSearchTerm,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    processedReturns,
    totalAmount,
    handleExportExcel,
    clearFilters,
    hasActiveFilters,
  } = useReturnsListView(normalizedReturns, 'sales', filteredReturns => {
    // Guard the display total: a corrupted historical exchange rate must not
    // crash the returns view — it is logged by sumInBaseCurrency/toBaseCurrency.
    try {
      return sumInBaseCurrency(filteredReturns as SalesReturnRow[]);
    } catch {
      return 0;
    }
  });

  // Sync initial search term
  React.useEffect(() => {
    if (propSearchTerm) {
      setLocalSearchTerm(propSearchTerm);
    }
  }, [propSearchTerm, setLocalSearchTerm]);

  // Sync server filters when local filters change (for larger datasets where full clientside filter isn't enough)
  React.useEffect(() => {
    setQueryFilters({
      status: filters.status,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
  }, [filters.status, filters.startDate, filters.endDate]);

  // Handle print
  const handlePrint = async () => {
    if (!printRef.current) return;
    try {
      await exportToPDF(printRef.current, `مرتجعات_المبيعات_${formatLocalDate()}`);
    } catch (error) {
      logger.error('SalesReturnsView', 'Print error:', error);
    }
  };

  return (
    <div className="animate-in fade-in space-y-3 pt-2 duration-300" ref={printRef}>
      {/* Stats Cards */}
      <ReturnsStatsHeader
        returnCount={stats?.returnCount || 0}
        totalReturns={stats?.totalReturns || 0}
        avgReturn={stats?.avgReturn || 0}
        pendingCount={stats?.pendingCount || 0}
        type="sales"
      />

      {/* Search and Filter Bar */}
      <ReturnsFilterControls
        localSearchTerm={localSearchTerm}
        setLocalSearchTerm={setLocalSearchTerm}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filters={filters}
        setFilters={setFilters}
        sortField={sortField}
        setSortField={setSortField}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        handleExportExcel={handleExportExcel}
        handlePrint={handlePrint}
        refetch={refetch}
        isLoading={isLoading}
        hasData={processedReturns.length > 0}
        type="sales"
      />

      {/* Add Return Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setIsModalOpen(true);
          }}
          variant="danger"
          size="sm"
          leftIcon={<Plus size={14} />}
        >
          مرتجع مبيعات جديد
        </Button>
      </div>

      {/* Returns List Redesigned as Excel Table */}
      <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
        {isLoading ? (
          <div className="space-y-4 p-8 max-md:p-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded bg-gray-50 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : processedReturns.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            <RotateCcw size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">لا توجد مرتجعات مبيعات</p>
            <p className="mt-1 text-sm text-gray-400">قم بإنشاء مرتجع جديد للبدء</p>
          </div>
        ) : (
          <ExcelTable
            columns={[
              {
                header: 'رقم المرتجع',
                accessor: (row: SalesReturnRow) => (
                  <span className="font-bold text-red-600">#{row.invoice_number}</span>
                ),
                accessorKey: 'invoice_number',
                sortKey: 'invoice_number',
                width: '120px',
                align: 'center',
              },
              {
                header: 'الفاتورة الأصلية',
                accessor: (row: SalesReturnRow) => (
                  <div className="flex items-center gap-2 max-md:gap-2">
                    <FileText size={12} className="text-blue-500" />
                    <span className="font-medium text-blue-600">
                      #{row.reference_invoice_id || '---'}
                    </span>
                  </div>
                ),
                accessorKey: 'reference_invoice_id',
                sortKey: 'reference_invoice_id',
                width: '130px',
                align: 'center',
              },
              {
                header: 'العميل',
                accessor: (row: SalesReturnRow) => (
                  <span className="font-bold">{row.party?.name || 'عميل نقدي'}</span>
                ),
                accessorKey: 'party.name',
                sortKey: 'party_name',
                align: 'center',
              },
              {
                header: 'الأصناف',
                accessor: (row: SalesReturnRow) => (
                  <div className="flex items-center gap-1 text-gray-500 max-md:gap-1.5">
                    <ShoppingCart size={12} />
                    <span className="text-xs font-bold">
                      {row.invoice_items?.length || 0} أصناف
                    </span>
                  </div>
                ),
                accessorKey: 'invoice_items.length',
                sortKey: 'item_count',
                width: '100px',
                align: 'center',
              },
              {
                header: 'العملة',
                accessor: (row: SalesReturnRow) => (
                  <span className="text-xs font-bold text-gray-500">
                    {row.currency_code || '---'}
                  </span>
                ),
                accessorKey: 'currency_code',
                width: '80px',
                align: 'center',
              },
              {
                header: 'المبلغ الإجمالي',
                accessor: (row: SalesReturnRow) => (
                  <div className="font-bold">
                    <span className="text-red-500">
                      -{formatCurrency(Number(row.total_amount), row.currency_code || 'SAR')}
                    </span>
                  </div>
                ),
                accessorKey: 'total_amount',
                sortKey: 'total_amount',
                align: 'center',
              },
              {
                header: 'تاريخ الإرجاع',
                accessor: (row: SalesReturnRow) => (
                  <span className="text-xs text-gray-500">
                    {new Date(row.issue_date || row.created_at || '').toLocaleDateString(
                      'ar-SA-u-nu-latn'
                    )}
                  </span>
                ),
                accessorKey: 'issue_date',
                sortKey: 'issue_date',
                width: '120px',
                align: 'center',
              },
              {
                header: 'الحالة',
                accessor: (row: SalesReturnRow) => (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      row.status === 'posted' || row.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}
                  >
                    {STATUS_LABELS[row.status ?? ''] || row.status}
                  </span>
                ),
                accessorKey: 'status',
                width: '100px',
                align: 'center',
              },
              {
                header: 'الإجراءات',
                accessor: (row: SalesReturnRow) => (
                  <div className="flex items-center justify-center gap-1 max-md:gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onViewDetails(row.id);
                      }}
                      className="rounded-lg p-1 text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 max-md:p-1.5"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            'هل أنت متأكد من حذف هذا المرتجع؟ سيتم إلغاء أثره المالي والمخزني.'
                          )
                        ) {
                          deleteInvoice(row.id);
                        }
                      }}
                      disabled={isDeleting}
                      className="rounded-lg p-1 text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20 max-md:p-1.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ),
                width: '100px',
                align: 'center',
              },
            ]}
            data={processedReturns as unknown as SalesReturnRow[]}
            colorTheme="indigo"
            isRTL={true}
            onRowDoubleClick={row => {
              onViewDetails(row.id);
            }}
            showSearch={false}
            pageSize={10}
          />
        )}
      </div>

      {/* Total Summary */}
      {processedReturns.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 max-md:p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-red-800 dark:text-red-300">
              إجمالي المرتجعات المعروضة:
            </span>
            <div className="flex flex-col items-end text-left">
              <span className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalAmount, 'SAR')}
              </span>
              <span className="text-[10px] font-medium text-gray-400">
                إجمالي القيمة بالريال السعودي
              </span>
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            عدد النتائج: {processedReturns.length} من {normalizedReturns.length}
          </div>
        </div>
      )}

      {/* Advanced Return Modal */}
      <AdvancedReturnModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        returnType="sale"
        partyName="عميل"
        onSuccess={() => {
          setIsModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
};

export default SalesReturnsView;
