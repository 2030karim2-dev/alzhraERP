import React, { useState, useRef } from 'react';
import { Plus, Eye, RotateCcw, FileText } from 'lucide-react';
import { usePurchaseReturns, usePurchaseReturnsStats } from '../../hooks/usePurchaseReturns';
import Button from '../../../../ui/base/Button';
import { exportToPDF } from '../../../../core/utils/pdfExporter';
import { AdvancedReturnModal } from '../../../returns/components/AdvancedReturnModal';
import { useReturnsListView, type ReturnsListRow } from '../../../returns/hooks/useReturnsListView';
import { ReturnsStatsHeader } from '../../../returns/components/view/ReturnsStatsHeader';
import { ReturnsFilterControls } from '../../../returns/components/view/ReturnsFilterControls';

const getStatusLabel = (status: string | null): string => {
  if (status === 'draft') return 'مسودة';
  if (status === 'posted') return 'معتمد';
  if (status === 'paid') return 'مدفوع';
  return status ?? '';
};
const statusClass = (status: string | null): string => {
  if (status === 'posted' || status === 'paid')
    return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
  return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
};
interface PurchaseReturnsViewProps {
  searchTerm: string;
  onViewDetails: (id: string) => void;
}
interface ReturnCardProps {
  returnItem: ReturnsListRow;
  onViewDetails: (id: string) => void;
}
type PurchaseReturnRecord = NonNullable<ReturnType<typeof usePurchaseReturns>['data']>[number];
const normalizePurchaseReturns = (
  rows: PurchaseReturnRecord[] | undefined
): ReturnsListRow[] | undefined =>
  rows?.map(row => {
    const record = row as unknown as Record<string, unknown>;
    return {
      ...row,
      return_reason:
        typeof record.return_reason === 'string' ? record.return_reason : 'مرتجع مشتريات',
      notes: typeof record.notes === 'string' ? record.notes : null,
      reference_invoice: null,
      reference_invoice_id:
        typeof record.reference_invoice_id === 'string' ? record.reference_invoice_id : null,
      issue_date: row.issue_date,
      created_at:
        typeof record.created_at === 'string'
          ? record.created_at
          : (row.issue_date ?? new Date().toISOString()),
      invoice_items: row.invoice_items,
      exchange_rate: row.exchange_rate,
      party: row.party === null ? null : { name: row.party.name },
    };
  });
const partyName = (row: ReturnsListRow): string => row.party?.name ?? 'غير محدد';
const originalInvoice = (row: ReturnsListRow): string =>
  row.reference_invoice?.invoice_number ?? row.reference_invoice_id ?? '';
const returnNotes = (row: ReturnsListRow): string => row.notes ?? '';
const returnAmount = (row: ReturnsListRow): string => Number(row.total_amount ?? 0).toFixed(2);
const returnDate = (row: ReturnsListRow): string =>
  new Date(row.issue_date ?? row.created_at).toLocaleDateString('ar-SA-u-nu-latn');
const itemCount = (row: ReturnsListRow): number => row.invoice_items?.length ?? 0;

const ReturnCardHeader = ({ returnItem }: { returnItem: ReturnsListRow }): React.ReactElement => {
  const referenceInvoice = originalInvoice(returnItem);
  const notes = returnNotes(returnItem);
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
          <RotateCcw size={20} className="text-red-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            مرتجع #{returnItem.invoice_number ?? ''}
          </p>
          <p className="text-sm text-gray-500">المورد: {partyName(returnItem)}</p>
          {referenceInvoice !== '' && (
            <p className="text-xs text-blue-600">فاتورة أصلية: {referenceInvoice}</p>
          )}
          {notes !== '' && <p className="mt-1 text-xs text-gray-400">{notes}</p>}
        </div>
      </div>
      <div className="text-left">
        <p className="font-bold text-red-600">-{returnAmount(returnItem)}</p>
        <p className="text-xs text-gray-500">{returnDate(returnItem)}</p>
      </div>
    </div>
  );
};
const ReturnCardFooter = ({
  returnItem,
  viewDetails,
}: {
  returnItem: ReturnsListRow;
  viewDetails: () => void;
}): React.ReactElement => (
  <div className="mt-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <FileText size={14} className="text-gray-400" />
      <span className="text-sm text-gray-600 dark:text-slate-300">
        {itemCount(returnItem)} أصناف
      </span>
    </div>
    <div className="flex items-center gap-3">
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(returnItem.status)}`}
      >
        {getStatusLabel(returnItem.status)}
      </span>
      <button
        type="button"
        aria-label="عرض تفاصيل المرتجع"
        onClick={event => {
          event.stopPropagation();
          viewDetails();
        }}
        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
      >
        <Eye size={16} />
      </button>
    </div>
  </div>
);
const ReturnCard = ({ returnItem, onViewDetails }: ReturnCardProps): React.ReactElement => {
  const viewDetails = (): void => {
    onViewDetails(returnItem.id);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      viewDetails();
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={viewDetails}
      onKeyDown={handleKeyDown}
      className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-red-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-red-600"
    >
      <ReturnCardHeader returnItem={returnItem} />
      <ReturnCardFooter returnItem={returnItem} viewDetails={viewDetails} />
    </div>
  );
};
const LoadingReturns = (): React.ReactElement => (
  <div className="animate-pulse">
    {Array.from({ length: 3 }, (_, index) => (
      <div key={index} className="mb-3 h-20 rounded bg-gray-100 dark:bg-slate-800" />
    ))}
  </div>
);
const EmptyReturns = (): React.ReactElement => (
  <div className="py-12 text-center text-gray-500">
    <RotateCcw size={48} className="mx-auto mb-4 opacity-50" />
    <p className="font-medium">لا توجد مرتجعات مشتريات</p>
    <p className="mt-1 text-sm text-gray-400">قم بإنشاء مرتجع جديد للبدء</p>
  </div>
);
const ReturnsSummary = ({
  totalAmount,
  count,
  totalCount,
}: {
  totalAmount: number;
  count: number;
  totalCount: number;
}): React.ReactElement => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
    <div className="flex items-center justify-between">
      <span className="font-bold text-red-800 dark:text-red-300">إجمالي المرتجعات المعروضة:</span>
      <span className="text-xl font-bold text-red-600 dark:text-red-400">
        {totalAmount.toFixed(2)}
      </span>
    </div>
    <div className="mt-1 text-xs text-gray-500">
      عدد النتائج: {count} من {totalCount}
    </div>
  </div>
);
const averageReturn = (stats: unknown): number => {
  if (typeof stats !== 'object' || stats === null) return 0;
  const candidate = stats as { returnCount?: unknown; totalReturns?: unknown };
  if (
    typeof candidate.returnCount !== 'number' ||
    typeof candidate.totalReturns !== 'number' ||
    candidate.returnCount <= 0
  )
    return 0;
  return candidate.totalReturns / candidate.returnCount;
};
type ReturnsViewModel = ReturnType<typeof useReturnsListView>;
interface ReturnsToolbarProps {
  view: ReturnsViewModel;
  isLoading: boolean;
  handlePrint: () => Promise<void>;
  refetch: () => Promise<unknown>;
}
const ReturnsToolbar = ({
  view,
  isLoading,
  handlePrint,
  refetch,
}: ReturnsToolbarProps): React.ReactElement => (
  <ReturnsFilterControls
    localSearchTerm={view.localSearchTerm}
    setLocalSearchTerm={view.setLocalSearchTerm}
    showFilters={view.showFilters}
    setShowFilters={view.setShowFilters}
    filters={view.filters}
    setFilters={view.setFilters}
    sortField={view.sortField}
    setSortField={view.setSortField}
    sortDirection={view.sortDirection}
    setSortDirection={view.setSortDirection}
    hasActiveFilters={view.hasActiveFilters}
    clearFilters={view.clearFilters}
    handleExportExcel={() => {
      void view.handleExportExcel();
    }}
    handlePrint={() => {
      void handlePrint();
    }}
    refetch={() => {
      void refetch();
    }}
    isLoading={isLoading}
    hasData={view.processedReturns.length > 0}
    type="purchase"
  />
);
const ReturnsResults = ({
  view,
  isLoading,
  returns,
  onViewDetails,
}: {
  view: ReturnsViewModel;
  isLoading: boolean;
  returns: ReturnsListRow[] | undefined;
  onViewDetails: (id: string) => void;
}): React.ReactElement => {
  if (isLoading) return <LoadingReturns />;
  if (view.processedReturns.length === 0) return <EmptyReturns />;
  return (
    <>
      <div className="space-y-3">
        {view.processedReturns.map(returnItem => (
          <ReturnCard key={returnItem.id} returnItem={returnItem} onViewDetails={onViewDetails} />
        ))}
      </div>
      <ReturnsSummary
        totalAmount={view.totalAmount}
        count={view.processedReturns.length}
        totalCount={returns?.length ?? 0}
      />
    </>
  );
};

const PurchaseReturnsView: React.FC<PurchaseReturnsViewProps> = ({
  searchTerm: propSearchTerm,
  onViewDetails,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { data: returns, isLoading, refetch } = usePurchaseReturns();
  const { data: stats } = usePurchaseReturnsStats();
  const normalizedReturns = normalizePurchaseReturns(returns);
  const view = useReturnsListView(normalizedReturns, 'purchase');
  const setLocalSearchTerm = view.setLocalSearchTerm;
  React.useEffect(() => {
    if (propSearchTerm !== '') setLocalSearchTerm(propSearchTerm);
  }, [propSearchTerm, setLocalSearchTerm]);
  const handlePrint = async (): Promise<void> => {
    if (printRef.current === null) return;
    await exportToPDF(
      printRef.current,
      `مرتجعات_المشتريات_${new Date().toISOString().split('T')[0]}`
    );
  };
  return (
    <div className="animate-in fade-in space-y-3 pt-2 duration-300" ref={printRef}>
      <ReturnsStatsHeader
        returnCount={stats?.returnCount ?? 0}
        totalReturns={stats?.totalReturns ?? 0}
        avgReturn={averageReturn(stats)}
        pendingCount={stats?.pendingCount ?? 0}
        type="purchase"
      />
      <ReturnsToolbar
        view={view}
        isLoading={isLoading}
        handlePrint={handlePrint}
        refetch={refetch}
      />
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setIsModalOpen(true);
          }}
          variant="danger"
          size="sm"
          leftIcon={<Plus size={14} />}
        >
          مرتجع مشتريات جديد
        </Button>
      </div>
      <ReturnsResults
        view={view}
        isLoading={isLoading}
        returns={normalizedReturns}
        onViewDetails={onViewDetails}
      />
      <AdvancedReturnModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        returnType="purchase"
        partyName="مورد"
        onSuccess={() => {
          setIsModalOpen(false);
          void refetch();
        }}
      />
    </div>
  );
};

export default PurchaseReturnsView;
