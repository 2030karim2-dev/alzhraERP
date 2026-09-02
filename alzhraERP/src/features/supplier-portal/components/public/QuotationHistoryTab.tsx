import React, { useMemo } from 'react';
import { Printer, RotateCcw } from 'lucide-react';
import { formatCurrency, cn } from '../../../../core/utils';
import ExcelTable, { type Column } from '../../../../ui/common/ExcelTable';
import type { PublicPortalQuotation } from '../../types';

interface QuotationHistoryTabProps {
  quotations: PublicPortalQuotation[];
  onOpenPrintModal: (q: PublicPortalQuotation) => void;
  onReQuote: (q: PublicPortalQuotation) => void;
}

const renderStatusBadge = (status: string): React.ReactNode => {
  const isApproved = status === 'accepted' || status === 'approved';
  const isRejected = status === 'rejected';

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[10px] font-bold',
        isApproved
          ? 'border border-emerald-700/50 bg-emerald-900/40 text-emerald-300'
          : isRejected
            ? 'border border-rose-700/50 bg-rose-900/40 text-rose-300'
            : 'border border-amber-700/50 bg-amber-900/40 text-amber-300'
      )}
    >
      {isApproved ? 'معتمد ✅' : isRejected ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
    </span>
  );
};

const BASE_COLUMNS: Array<Column<PublicPortalQuotation>> = [
  {
    header: 'رقم العرض',
    accessorKey: 'quotation_number',
    sortKey: 'quotation_number',
    width: '160px',
    accessor: row => (
      <span className="font-mono text-xs font-black text-white">{row.quotation_number}</span>
    ),
  },
  {
    header: 'تاريخ التقديم',
    accessorKey: 'issue_date',
    sortKey: 'issue_date',
    width: '130px',
    align: 'center',
    accessor: row => (
      <span className="font-mono text-xs text-slate-300" dir="ltr">
        {row.issue_date}
      </span>
    ),
  },
  {
    header: 'صالح حتى',
    accessorKey: 'valid_until',
    width: '130px',
    align: 'center',
    accessor: row => (
      <span className="font-mono text-xs text-slate-400" dir="ltr">
        {row.valid_until ?? '---'}
      </span>
    ),
  },
  {
    header: 'عدد الأصناف',
    width: '100px',
    align: 'center',
    accessor: row => (
      <span className="font-mono text-xs font-bold text-slate-300">
        {row.items?.length ?? 0} صنف
      </span>
    ),
  },
  {
    header: 'إجمالي العرض',
    accessorKey: 'total_amount',
    sortKey: 'total_amount',
    width: '150px',
    align: 'center',
    accessor: row => (
      <span className="font-mono text-xs font-black text-emerald-400" dir="ltr">
        {formatCurrency(row.total_amount, row.currency_code)}
      </span>
    ),
  },
  {
    header: 'الحالة',
    accessorKey: 'status',
    width: '130px',
    align: 'center',
    accessor: row => renderStatusBadge(row.status),
  },
];

const createActionsColumn = (
  onOpenPrintModal: (q: PublicPortalQuotation) => void,
  onReQuote: (q: PublicPortalQuotation) => void
): Column<PublicPortalQuotation> => ({
  header: 'الإجراءات',
  width: '180px',
  align: 'center',
  accessor: row => (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          onOpenPrintModal(row);
        }}
        className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-200 transition-all hover:border-purple-500 hover:text-purple-300"
        title="طباعة وتصدير PDF"
      >
        <Printer size={12} />
        <span>طباعة PDF</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onReQuote(row);
        }}
        className="flex items-center gap-1 rounded-lg border border-emerald-800/40 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-600 hover:text-white"
        title="إعادة تسعير العرض"
      >
        <RotateCcw size={12} />
        <span>إعادة تسعير</span>
      </button>
    </div>
  ),
});

export const QuotationHistoryTab: React.FC<QuotationHistoryTabProps> = ({
  quotations,
  onOpenPrintModal,
  onReQuote,
}) => {
  const columns = useMemo(
    () => [...BASE_COLUMNS, createActionsColumn(onOpenPrintModal, onReQuote)],
    [onOpenPrintModal, onReQuote]
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-1 shadow-2xl">
      <ExcelTable<PublicPortalQuotation>
        columns={columns}
        data={quotations}
        title="أرشيف عروض الأسعار المسجلة"
        subtitle="جميع عروض الأسعار السابقة المقدمة منكم مع إمكانية طباعتها أو إعادة تسعيرها"
        colorTheme="indigo"
        showSearch={true}
        getRowId={q => q.id}
        enablePagination={true}
        pageSize={15}
        emptyMessage="لم يتم تسجيل أي عروض أسعار سابقة حتى الآن"
      />
    </div>
  );
};
