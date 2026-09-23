/**
 * Row action descriptors for the debts & collection rows.
 *
 * مصدر واحد لأزرار الصف يخدم شبكة الإكسل (سطح المكتب) وبطاقات الموبايل،
 * فلا تتفرّع نصوص الإجراءات ولا بوابات الصلاحيات (debts:manage / debts:remind)
 * بين العرضين. ملف منطقي نقي (بلا JSX) ليبقى قابلاً للاختبار وللإعادة الاستخدام.
 */
import {
  Banknote,
  FileSpreadsheet,
  Handshake,
  History,
  Loader2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import type { RowAction } from '../components/RowActions';
import type { FollowUpDashboardRow } from '../types';

export interface DebtRowActionHandlers {
  /** debts:manage — وعود السداد والتحصيل. */
  canManage: boolean;
  /** debts:remind — تذكير واتساب. */
  canRemind: boolean;
  /** الطرف الجاري تصدير كشف حسابه (يمنع النقر المزدوج). */
  exportingPartyId: string | null;
  onAiRisk: (row: FollowUpDashboardRow) => void;
  onExportStatement: (row: FollowUpDashboardRow) => void;
  onRemind: (row: FollowUpDashboardRow) => void;
  /** يُمرَّر فقط لأصحاب debts:manage + accounting:create. */
  onCollect: ((row: FollowUpDashboardRow) => void) | undefined;
  onTimeline: (row: FollowUpDashboardRow) => void;
  onPromise: (row: FollowUpDashboardRow) => void;
}

/** الأزرار المتاحة لكل مستخدم: التحليل الذكي (AI) + كشف حساب إكسل. */
const coreActions = (row: FollowUpDashboardRow, handlers: DebtRowActionHandlers): RowAction[] => {
  const isExportingThis = handlers.exportingPartyId === row.party_id;
  return [
    {
      key: 'ai-risk',
      icon: Sparkles,
      label: 'التحليل الذكي للمخاطر (AI)',
      colorClasses:
        'bg-purple-500/10 text-purple-600 hover:bg-purple-600 hover:text-white dark:text-purple-400 shadow-sm',
      onAction: () => {
        handlers.onAiRisk(row);
      },
    },
    {
      key: 'excel-statement',
      icon: isExportingThis ? Loader2 : FileSpreadsheet,
      label: 'تحميل كشف حساب إكسل احترافي (.xlsx)',
      disabled: isExportingThis,
      colorClasses:
        'bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-50 dark:text-blue-400 shadow-sm',
      onAction: () => {
        handlers.onExportStatement(row);
      },
    },
  ];
};

/** تذكير واتساب — يحتاج debts:remind. */
const reminderAction = (row: FollowUpDashboardRow, handlers: DebtRowActionHandlers): RowAction => ({
  key: 'whatsapp-reminder',
  icon: MessageSquare,
  label: 'تذكير واتساب ذكي',
  colorClasses:
    'bg-green-500/10 text-green-600 hover:bg-green-600 hover:text-white dark:text-green-400 shadow-sm',
  onAction: () => {
    handlers.onRemind(row);
  },
});

/** تحصيل الآن (سند قبض مُعبّأ) — يحتاج debts:manage + accounting:create. */
const collectAction = (row: FollowUpDashboardRow, handlers: DebtRowActionHandlers): RowAction => ({
  key: 'collect-now',
  icon: Banknote,
  label: 'تحصيل الآن — سند قبض مُعبّأ لهذا العميل',
  colorClasses:
    'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 shadow-sm',
  onAction: () => {
    handlers.onCollect?.(row);
  },
});

/** خط تحصيل العميل (سجل الأنشطة) — متاح لكل المستخدمين. */
const timelineAction = (row: FollowUpDashboardRow, handlers: DebtRowActionHandlers): RowAction => ({
  key: 'timeline',
  icon: History,
  label: 'خط تحصيل العميل — سجل الأنشطة',
  colorClasses:
    'bg-slate-500/10 text-slate-600 hover:bg-slate-500 hover:text-white dark:text-slate-400 shadow-sm',
  onAction: () => {
    handlers.onTimeline(row);
  },
});

/** تسجيل وعد سداد — يحتاج debts:manage. */
const promiseAction = (row: FollowUpDashboardRow, handlers: DebtRowActionHandlers): RowAction => ({
  key: 'payment-promise',
  icon: Handshake,
  label: 'تسجيل وعد سداد',
  colorClasses:
    'bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white dark:text-amber-400 shadow-sm',
  onAction: () => {
    handlers.onPromise(row);
  },
});

/** أزرار الصف بترتيب ثابت: AI → كشف إكسل → تذكير → تحصيل → خط التحصيل → وعد سداد. */
export const buildDebtRowActions = (
  row: FollowUpDashboardRow,
  handlers: DebtRowActionHandlers
): RowAction[] => {
  const actions = coreActions(row, handlers);

  if (handlers.canRemind) actions.push(reminderAction(row, handlers));
  if (handlers.canManage && handlers.onCollect !== undefined) {
    actions.push(collectAction(row, handlers));
  }

  actions.push(timelineAction(row, handlers));

  if (handlers.canManage) actions.push(promiseAction(row, handlers));

  return actions;
};
