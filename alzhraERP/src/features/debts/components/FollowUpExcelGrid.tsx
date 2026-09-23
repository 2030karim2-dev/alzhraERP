/**
 * FollowUpExcelGrid — جدول الديون والتحصيل كشبكة إكسل معيارية (ExcelTable).
 *
 * نفس شبكة المخزون/العملاء/المشتريات في النظام، فتحصل الشاشة على:
 * ترويسة مجمّدة + ترقيم صفوف + فرز بالنقر على العنوان + خطوط شبكة كاملة،
 * تحديد خلايا/صفوف مع نسخ Ctrl+C بصيغة TSV تُلصق مباشرة في إكسل،
 * تدقيق عرض الأعمدة مع حفظه لكل مستخدم، تكبير/تصغير وعرض كامل،
 * ترقيم صفحات، وصف «الإجمالي» (مجاميع حسب العملة) + شريط حالة كإكسل.
 */
import React, { useMemo, useState } from 'react';
import ExcelTable, { type Column } from '../../../ui/common/ExcelTable';
import {
  ActionsCell,
  ClassificationCell,
  DaysCell,
  EscalationCell,
  MoneyCell,
  PartyCell,
  PromiseCell,
  ReminderCell,
  ShortCell,
} from './FollowUpExcelGridCells';
import { currencyCount, debtRowId, totalsLabel } from '../lib/currencyTotals';
import type { DebtRowActionHandlers } from '../lib/rowActions';
import type { FollowUpDashboardRow } from '../types';

type DebtRow = FollowUpDashboardRow;

interface FollowUpExcelGridProps {
  rows: FollowUpDashboardRow[];
  isLoading?: boolean;
  handlers: DebtRowActionHandlers;
}

/** أعمدة الهوية والحالة: العميل / التصنيف / التصعيد / التذكير. */
const identityColumns = (): Array<Column<DebtRow>> => [
  {
    header: 'العميل',
    accessor: row => <PartyCell row={row} />,
    sortKey: 'party_name',
    width: 'w-52',
    align: 'right',
  },
  {
    header: 'التصنيف',
    accessor: row => <ClassificationCell classification={row.classification} />,
    sortKey: 'classification',
    width: 'w-24',
    align: 'center',
  },
  {
    header: 'مرحلة التصعيد',
    accessor: row => <EscalationCell stage={row.escalation_stage} />,
    sortKey: 'escalation_stage',
    width: 'w-24',
    align: 'center',
  },
  {
    header: 'حالة التذكير',
    accessor: row => <ReminderCell reminderStatus={row.reminder_status} />,
    sortKey: 'reminder_status',
    width: 'w-28',
    align: 'center',
  },
];

/** أعمدة الأرقام: الرصيد (بصف إجمالي حسب العملة) / العملة / أيام التأخير. */
const moneyColumns = (allRows: DebtRow[]): Array<Column<DebtRow>> => [
  {
    header: 'الرصيد المستحق',
    accessor: row => <MoneyCell row={row} />,
    sortKey: 'outstanding_balance',
    width: 'w-32',
    align: 'left',
    className: 'font-mono',
    footer: () => totalsLabel(allRows),
  },
  {
    header: 'العملة',
    accessor: row => (
      <span className="font-mono text-[11px]" dir="ltr">
        {row.currency_code}
      </span>
    ),
    sortKey: 'currency_code',
    width: 'w-16',
    align: 'center',
  },
  {
    header: 'أيام التأخير',
    accessor: row => <DaysCell days={row.days_overdue} />,
    sortKey: 'days_overdue',
    width: 'w-20',
    align: 'center',
    footer: () => (allRows.length === 0 ? '' : `عدد السجلات: ${String(allRows.length)}`),
  },
];

/** أعمدة التواريخ: أقدم استحقاق / وعد معلّق / آخر تذكير / آخر تواصل. */
const timelineColumns = (): Array<Column<DebtRow>> => [
  {
    header: 'أقدم استحقاق',
    accessor: row => <ShortCell value={row.oldest_due_date} />,
    sortKey: 'oldest_due_date',
    width: 'w-24',
    align: 'center',
  },
  {
    header: 'وعد معلّق',
    accessor: row => <PromiseCell row={row} />,
    sortKey: 'pending_promise_date',
    width: 'w-28',
    align: 'center',
  },
  {
    header: 'آخر تذكير',
    accessor: row => <ShortCell value={row.last_reminded_at} />,
    sortKey: 'last_reminded_at',
    width: 'w-24',
    align: 'center',
  },
  {
    header: 'آخر تواصل',
    accessor: row => <ShortCell value={row.last_contact_date} />,
    sortKey: 'last_contact_date',
    width: 'w-24',
    align: 'center',
  },
];

/** عمود الإجراءات الموحّد (تذكير/تحصيل/كشف/خط زمني/وعد/AI). */
const actionsColumn = (handlers: DebtRowActionHandlers): Column<DebtRow> => ({
  header: 'الإجراءات والتحصيل',
  accessor: row => <ActionsCell row={row} handlers={handlers} />,
  width: 'w-48',
  align: 'center',
});

/** ترتيب أعمدة الشبكة: هوية → أرقام → تواريخ → إجراءات. */
const buildDebtColumns = (
  allRows: DebtRow[],
  handlers: DebtRowActionHandlers
): Array<Column<DebtRow>> => [
  ...identityColumns(),
  ...moneyColumns(allRows),
  ...timelineColumns(),
  actionsColumn(handlers),
];

interface GridStatusBarProps {
  total: number;
  selected: DebtRow[];
  currencies: number;
}

/** شريط حالة كإكسل: عدد السجلات / المحدد / مجموع المحدد (كل مجموع بعملته). */
const GridStatusBar: React.FC<GridStatusBarProps> = ({ total, selected, currencies }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3 py-1.5 text-[11px] font-bold text-[var(--app-text-secondary)]">
    <span>
      عدد السجلات: <span className="font-mono text-[var(--app-text)]">{total}</span>
    </span>
    <span>
      المحدد: <span className="font-mono text-[var(--app-text)]">{selected.length}</span>
    </span>
    <span className="flex items-center gap-1.5">
      مجموع المحدد:
      <span className="font-mono text-[var(--app-text)]" dir="ltr">
        {totalsLabel(selected)}
      </span>
    </span>
    {currencies > 1 && (
      <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
        عملات متعددة — كل مجموع بعملته
      </span>
    )}
  </div>
);

const FollowUpExcelGrid: React.FC<FollowUpExcelGridProps> = ({
  rows,
  isLoading = false,
  handlers,
}) => {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set<string>());
  const columns = useMemo(() => buildDebtColumns(rows, handlers), [rows, handlers]);
  const selectedRows = useMemo(
    () => rows.filter(row => selectedRowIds.has(debtRowId(row))),
    [rows, selectedRowIds]
  );
  const gridCurrencies = useMemo(() => currencyCount(rows), [rows]);

  return (
    <div className="hidden flex-col gap-2 md:flex print:flex">
      <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <ExcelTable
          columns={columns}
          data={rows}
          title="جدول الديون والتحصيل"
          resizeStorageKey="debts_followup_grid_cols"
          colorTheme="orange"
          isRTL
          showSearch={false}
          enableSelection
          enableResize
          enablePagination
          pageSize={25}
          isLoading={isLoading}
          emptyMessage="لا توجد سجلات في هذا التصنيف"
          getRowId={debtRowId}
          selectedRowIds={selectedRowIds}
          onSelectionChange={setSelectedRowIds}
          onRowDoubleClick={handlers.onTimeline}
        />
      </div>

      <GridStatusBar total={rows.length} selected={selectedRows} currencies={gridCurrencies} />
    </div>
  );
};

export default FollowUpExcelGrid;
