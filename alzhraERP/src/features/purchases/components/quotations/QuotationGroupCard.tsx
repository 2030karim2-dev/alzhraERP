import React from 'react';
import { ChevronDown, ChevronUp, Scale } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import { QuotationItemsTable } from './QuotationItemsTable';
import { STATUS_CONFIG } from './statusConfig';
import type { QuotationGroup, QuotationListRow } from './types';

interface QuotationRowHeaderProps {
  quotation: QuotationListRow;
  isExpanded: boolean;
}

const QuotationRowHeader: React.FC<QuotationRowHeaderProps> = ({ quotation, isExpanded }) => {
  const status = STATUS_CONFIG[quotation.status];
  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isExpanded ? 'طي تفاصيل العرض' : 'عرض بنود العرض والقياس والأسعار'}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-200"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
          {quotation.quotation_number}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {quotation.supplier_name}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}
        >
          {status.icon} {status.label}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm font-bold text-gray-900 dark:text-white" dir="ltr">
          {formatCurrency(quotation.total_amount, quotation.currency_code)}
        </span>
        <span className="text-xs font-medium text-gray-400">{quotation.item_count} بنود</span>
      </div>
    </>
  );
};

interface QuotationRowProps {
  quotation: QuotationListRow;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const QuotationRow: React.FC<QuotationRowProps> = ({
  quotation,
  isExpanded,
  onToggleExpand,
}) => (
  <div className="transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
    <div
      role="button"
      tabIndex={0}
      onClick={onToggleExpand}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleExpand();
        }
      }}
      className="flex cursor-pointer items-center justify-between p-3"
    >
      <QuotationRowHeader quotation={quotation} isExpanded={isExpanded} />
    </div>

    {isExpanded && (
      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
        {quotation.items.length === 0 ? (
          <p className="py-2 text-center text-xs text-gray-400">لا توجد تفاصيل لبنود هذا العرض</p>
        ) : (
          <QuotationItemsTable items={quotation.items} currencyCode={quotation.currency_code} />
        )}
      </div>
    )}
  </div>
);

interface QuotationGroupHeaderProps {
  group: QuotationGroup;
  compareGroupId: string | null;
  onCompare: (groupId: string) => void;
}

const QuotationGroupHeader: React.FC<QuotationGroupHeaderProps> = ({
  group,
  compareGroupId,
  onCompare,
}) => (
  <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center">
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">طلب عرض سعر</h3>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
          {group.quotations.length} عرض
        </span>
      </div>
      <p className="mt-0.5 font-mono text-[10px] text-gray-400">
        {group.groupId.substring(0, 8)}...
      </p>
    </div>
    {group.quotations.length >= 2 && (
      <button
        onClick={() => {
          onCompare(group.groupId);
        }}
        className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40"
      >
        <Scale size={14} />
        {compareGroupId === group.groupId ? 'إخفاء المقارنة' : 'مقارنة العروض'}
      </button>
    )}
  </div>
);

interface QuotationGroupCardProps {
  group: QuotationGroup;
  compareGroupId: string | null;
  expandedQuotationId: string | null;
  onToggleQuotation: (id: string) => void;
  onCompare: (groupId: string) => void;
}

export const QuotationGroupCard: React.FC<QuotationGroupCardProps> = ({
  group,
  compareGroupId,
  expandedQuotationId,
  onToggleQuotation,
  onCompare,
}) => (
  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
    <QuotationGroupHeader group={group} compareGroupId={compareGroupId} onCompare={onCompare} />
    <div className="divide-y divide-gray-50 dark:divide-slate-800">
      {group.quotations.map(quotation => (
        <QuotationRow
          key={quotation.id}
          quotation={quotation}
          isExpanded={expandedQuotationId === quotation.id}
          onToggleExpand={() => {
            onToggleQuotation(quotation.id);
          }}
        />
      ))}
    </div>
  </div>
);

export default QuotationGroupCard;
