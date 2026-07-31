import React, { useState, useRef } from 'react';
import { Plus, Eye, RotateCcw, FileText, Trash2, ShoppingCart } from 'lucide-react';
import ExcelTable from '../../../../ui/common/ExcelTable';
import { useSalesReturns, useSalesReturnsStats } from '../../hooks/useSalesReturns';
import { useDeleteInvoice } from '../../hooks/index';
import { formatCurrency, sumInBaseCurrency } from '../../../../core/utils';
import Button from '../../../../ui/base/Button';
import { exportToPDF } from '../../../../core/utils/pdfExporter';
import { AdvancedReturnModal } from '../../../returns/components/AdvancedReturnModal';
import { useReturnsListView } from '../../../returns/hooks/useReturnsListView';
import { ReturnsStatsHeader } from '../../../returns/components/view/ReturnsStatsHeader';
import { ReturnsFilterControls } from '../../../returns/components/view/ReturnsFilterControls';

// Status labels
const STATUS_LABELS: Record<string, string> = {
  'draft': 'مسودة',
  'posted': 'معتمد',
  'paid': 'مدفوع',
};

interface SalesReturnsViewProps {
  searchTerm: string;
  onViewDetails: (id: string) => void;
}

const SalesReturnsView: React.FC<SalesReturnsViewProps> = ({ searchTerm: propSearchTerm, onViewDetails }) => {
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
      endDate: ''
  });

  const { data: returns, isLoading, refetch } = useSalesReturns({
    searchTerm: propSearchTerm || '', // Initial search term passed to query
    status: queryFilters.status || undefined,
    startDate: queryFilters.startDate || undefined,
    endDate: queryFilters.endDate || undefined,
  });

  const {
      localSearchTerm, setLocalSearchTerm,
      showFilters, setShowFilters,
      filters, setFilters,
      sortField, setSortField,
      sortDirection, setSortDirection,
      processedReturns,
      totalAmount,
      handleExportExcel,
      clearFilters,
      hasActiveFilters
  } = useReturnsListView(returns, 'sales', (filteredReturns) => sumInBaseCurrency(filteredReturns as any[]));

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
          endDate: filters.endDate
      });
  }, [filters.status, filters.startDate, filters.endDate]);

  // Handle print
  const handlePrint = async () => {
    if (!printRef.current) return;
    try {
      await exportToPDF(printRef.current, `مرتجعات_المبيعات_${new Date().toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Print error:', error);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-300 pt-2" ref={printRef}>
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
          onClick={() => setIsModalOpen(true)}
          variant="danger"
          size="sm"
          leftIcon={<Plus size={14} />}
        >
          مرتجع مبيعات جديد
        </Button>
      </div>

      {/* Returns List Redesigned as Excel Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 w-full bg-gray-50 dark:bg-slate-800 animate-pulse rounded" />
            ))}
          </div>
        ) : processedReturns.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <RotateCcw size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">لا توجد مرتجعات مبيعات</p>
            <p className="text-sm text-gray-400 mt-1">قم بإنشاء مرتجع جديد للبدء</p>
          </div>
        ) : (
          <ExcelTable
            columns={[
              {
                header: 'رقم المرتجع',
                accessor: (row: any) => <span className="font-bold text-red-600">#{row.invoice_number}</span>,
                accessorKey: 'invoice_number',
                sortKey: 'invoice_number',
                width: '120px',
                align: 'center'
              },
              {
                header: 'الفاتورة الأصلية',
                accessor: (row: any) => (
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-blue-500" />
                    <span className="font-medium text-blue-600">#{row.reference_invoice_id || '---'}</span>
                  </div>
                ),
                accessorKey: 'reference_invoice_id',
                sortKey: 'reference_invoice_id',
                width: '130px',
                align: 'center'
              },
              {
                header: 'العميل',
                accessor: (row: any) => <span className="font-bold">{row.party?.name || 'عميل نقدي'}</span>,
                accessorKey: 'party.name',
                sortKey: 'party_name',
                align: 'center'
              },
              {
                header: 'الأصناف',
                accessor: (row: any) => (
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <ShoppingCart size={12} />
                    <span className="text-xs font-bold">{row.invoice_items?.length || 0} أصناف</span>
                  </div>
                ),
                accessorKey: 'invoice_items.length',
                sortKey: 'item_count',
                width: '100px',
                align: 'center'
              },
              {
                header: 'العملة',
                accessor: (row: any) => <span className="text-xs font-bold text-gray-500">{row.currency_code || '---'}</span>,
                accessorKey: 'currency_code',
                width: '80px',
                align: 'center'
              },
              {
                header: 'المبلغ الإجمالي',
                accessor: (row: any) => (
                  <div className="font-bold">
                    <span className="text-red-500">-{formatCurrency(Number(row.total_amount), row.currency_code || 'SAR')}</span>
                  </div>
                ),
                accessorKey: 'total_amount',
                sortKey: 'total_amount',
                align: 'center'
              },
              {
                header: 'تاريخ الإرجاع',
                accessor: (row: any) => <span className="text-xs text-gray-500">{new Date(row.issue_date || row.created_at).toLocaleDateString('ar-SA')}</span>,
                accessorKey: 'issue_date',
                sortKey: 'issue_date',
                width: '120px',
                align: 'center'
              },
              {
                header: 'الحالة',
                accessor: (row: any) => (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === 'posted' || row.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                    {STATUS_LABELS[row.status] || row.status}
                  </span>
                ),
                accessorKey: 'status',
                width: '100px',
                align: 'center'
              },
              {
                header: 'الإجراءات',
                accessor: (row: any) => (
                  <div className="flex items-center gap-1 justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewDetails(row.id); }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('هل أنت متأكد من حذف هذا المرتجع؟ سيتم إلغاء أثره المالي والمخزني.')) {
                          deleteInvoice(row.id);
                        }
                      }}
                      disabled={isDeleting}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ),
                width: '100px',
                align: 'center'
              }
            ]}
            data={processedReturns}
            colorTheme="indigo"
            isRTL={true}
            onRowDoubleClick={(row) => onViewDetails(row.id)}
            showSearch={false}
            pageSize={10}
          />
        )}
      </div>

      {/* Total Summary */}
      {processedReturns.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex justify-between items-center">
            <span className="font-bold text-red-800 dark:text-red-300">إجمالي المرتجعات المعروضة:</span>
            <div className="text-left flex flex-col items-end">
              <span className="font-bold text-xl text-red-600 dark:text-red-400">
                {formatCurrency(totalAmount, 'SAR')}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">إجمالي القيمة بالريال السعودي</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            عدد النتائج: {processedReturns.length} من {returns?.length || 0}
          </div>
        </div>
      )}

      {/* Advanced Return Modal */}
      <AdvancedReturnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
