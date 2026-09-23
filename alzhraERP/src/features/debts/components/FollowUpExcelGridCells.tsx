/**
 * خلايا شبكة الديون والتحصيل — مكوّنات عرض صغيرة بلا منطق أعمال.
 * تُبقي ملف الشبكة الرئيسي مقتصراً على تعريف الأعمدة والتركيب.
 */
import React from 'react';
import { formatCurrency } from '../../../core/utils/currencyUtils';
import StatusBadge from './StatusBadge';
import RowActions from './RowActions';
import { classificationMeta, escalationBadgeMeta, reminderStatusMeta } from '../lib/constants';
import { buildDebtRowActions, type DebtRowActionHandlers } from '../lib/rowActions';
import type { FollowUpDashboardRow } from '../types';

/** خلية العميل: الاسم + الهاتف في سطر واحد (كثافة إكسل). */
export const PartyCell: React.FC<{ row: FollowUpDashboardRow }> = ({ row }) => (
  <span className="flex items-center gap-1.5 whitespace-nowrap">
    <span className="text-[11px] font-bold text-[var(--app-text)]" title={row.party_name}>
      {row.party_name}
    </span>
    {row.party_phone !== null && row.party_phone !== '' && (
      <span className="font-mono text-[10px] text-[var(--app-text-secondary)]" dir="ltr">
        {row.party_phone}
      </span>
    )}
  </span>
);

/** خلية الرصيد: مبلغ بخط ثابت (tabular) لسهولة المقارنة الرأسية كإكسل. */
export const MoneyCell: React.FC<{ row: FollowUpDashboardRow }> = ({ row }) => (
  <span className="font-mono text-[11px] font-bold tabular-nums text-[var(--app-text)]" dir="ltr">
    {formatCurrency(row.outstanding_balance, row.currency_code)}
  </span>
);

/** خلية تاريخ/نص مختصر: القيمة أو «—». */
export const ShortCell: React.FC<{ value: string | null; mono?: boolean }> = ({
  value,
  mono = true,
}) => {
  if (value === null || value === '') {
    return <span className="text-[11px] text-[var(--app-text-secondary)]">—</span>;
  }
  return (
    <span
      className={mono ? 'font-mono text-[11px] tabular-nums' : 'text-[11px]'}
      dir={mono ? 'ltr' : undefined}
    >
      {value.slice(0, 10)}
    </span>
  );
};

/** خلية أيام التأخير — اليوم/الأيام بصيغة موجزة. */
export const DaysCell: React.FC<{ days: number }> = ({ days }) =>
  days > 0 ? (
    <span className="font-mono text-[11px] font-extrabold tabular-nums text-orange-600">
      {days}
    </span>
  ) : (
    <span className="text-[11px] text-[var(--app-text-secondary)]">—</span>
  );

/** خلية التصنيف (حرج / متأخر / اليوم / قريب / حالي). */
export const ClassificationCell: React.FC<{ classification: string }> = ({ classification }) => (
  <StatusBadge {...classificationMeta(classification)} />
);

/** خلية حالة التذكير (بحاجة تذكير / تم تذكيرهم). */
export const ReminderCell: React.FC<{ reminderStatus: string }> = ({ reminderStatus }) => (
  <StatusBadge {...reminderStatusMeta(reminderStatus)} />
);

/** خلية مرحلة التصعيد المقترحة (مراقبة/تذكير/اتصال/زيارة/قانوني). */
export const EscalationCell: React.FC<{ stage: string | null }> = ({ stage }) => {
  const meta = escalationBadgeMeta(stage);
  if (meta.label === '') {
    return <span className="text-[11px] text-[var(--app-text-secondary)]">—</span>;
  }
  return (
    <span
      title="مرحلة التصعيد المقترحة حسب أيام التأخير"
      className={`whitespace-nowrap rounded-lg border px-1.5 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};

/** خلية الوعد المعلّق: تاريخ الوعد + تنبيه الوعد المخلَف. */
export const PromiseCell: React.FC<{ row: FollowUpDashboardRow }> = ({ row }) => (
  <span className="flex items-center gap-1 whitespace-nowrap">
    <ShortCell value={row.pending_promise_date} />
    {row.has_broken_promise && (
      <span className="text-[10px] font-bold text-rose-500" title="وعد سداد مخلَف">
        ⚠️ مخلَف
      </span>
    )}
  </span>
);

/** خلية الإجراءات: صدّ انتشار النقر حتى لا يُحدَّد الصف/الخلية عند ضغط زر. */
export const ActionsCell: React.FC<{
  row: FollowUpDashboardRow;
  handlers: DebtRowActionHandlers;
}> = ({ row, handlers }) => (
  <div
    onClick={e => {
      e.stopPropagation();
    }}
    onMouseDown={e => {
      e.stopPropagation();
    }}
  >
    <RowActions
      actions={buildDebtRowActions(row, handlers)}
      variant="table"
      className="justify-center"
    />
  </div>
);
