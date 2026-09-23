import React, { useState } from 'react';
import {
  MessageSquare,
  Handshake,
  Sparkles,
  FileSpreadsheet,
  Loader2,
  Banknote,
  History,
} from 'lucide-react';
import { formatCurrency } from '../../../core/utils/currencyUtils';
import { parseError } from '../../../core/utils/errorUtils';
import { CLASSIFICATION_META, REMINDER_STATUS_META, escalationBadgeMeta } from '../lib/constants';
import { useCompany } from '../../settings/hooks';
import { useFeedbackStore } from '../../feedback/store';
import { partiesService } from '../../parties/service';
import { exportStatementToExcel } from '../../parties/utils/statementExcelExporter';
import StatusBadge from './StatusBadge';
import MobileCardList, { MobileCardRow } from '../../../ui/base/MobileCardList';
import RowActions, { type RowAction } from './RowActions';
import ReminderModal from './ReminderModal';
import PromiseFormModal from './PromiseFormModal';
import AIDebtRiskModal from './AIDebtRiskModal';
import CollectionTimelineModal from './CollectionTimelineModal';
import type { FollowUpDashboardRow } from '../types';

interface FollowUpTableProps {
  rows: FollowUpDashboardRow[];
  /** Whether the user may create payment promises (debts:manage). */
  canManage?: boolean;
  /** Whether the user may send WhatsApp reminders (debts:remind). */
  canRemind?: boolean;
  /** Opens the prefilled receipt-bond flow for the row (تحصيل الآن). */
  onCollect?: (row: FollowUpDashboardRow) => void;
}

/**
 * أعمدة كشف الحساب الاختيارية (سجل تجاري/بنك/آيبان) غير المولَّدة في types
 * القاعدة — يُقرأ وصول اختياري صريح بدل `(company as any)`.
 */
interface CompanyDocExtras {
  commercial_reg?: string;
  bank_name?: string;
  bank_account_iban?: string;
}

const FollowUpTable: React.FC<FollowUpTableProps> = ({
  rows,
  canManage = true,
  canRemind = true,
  onCollect,
}) => {
  const { data: company } = useCompany();
  const { showToast } = useFeedbackStore();

  const [reminderRow, setReminderRow] = useState<FollowUpDashboardRow | null>(null);
  const [promiseRow, setPromiseRow] = useState<FollowUpDashboardRow | null>(null);
  const [aiRiskRow, setAiRiskRow] = useState<FollowUpDashboardRow | null>(null);
  const [timelineRow, setTimelineRow] = useState<FollowUpDashboardRow | null>(null);
  const [exportingPartyId, setExportingPartyId] = useState<string | null>(null);

  // eslint-disable-next-line complexity -- تنويعات التصدير (تواريخ/أعمدة/تنسيق) متفرعة بطبعها وليست منطقاً حسابياً
  const handleExportExcel = async (row: FollowUpDashboardRow): Promise<void> => {
    const companyExtras = company as unknown as CompanyDocExtras | null;
    try {
      setExportingPartyId(row.party_id);
      showToast('جاري إنشاء وتنسيق كشف الحساب الاحترافي (Excel)...', 'info');

      const statementEntries = await partiesService.getStatement(row.party_id, 'customer', {
        currencyCode: row.currency_code,
      });

      const nameAr = company?.name_ar ?? '';
      const companyInfo = {
        name_ar: nameAr !== '' ? nameAr : 'منظومة الزهراء المحاسبية',
        address: company?.address ?? '',
        phone: company?.phone ?? '',
        tax_number: company?.tax_number ?? '',
        commercial_reg: companyExtras?.commercial_reg ?? '',
        bank_name: companyExtras?.bank_name ?? '',
        bank_account_iban: companyExtras?.bank_account_iban ?? '',
      };

      const formattedEntries = statementEntries.map(e => ({
        date: e.date,
        operation_type: e.operation_type ?? '',
        reference_no: e.ref,
        desc: e.desc,
        debit: e.debit,
        credit: e.credit,
        balance: e.balance ?? 0,
        payment_status: e.payment_status,
      }));

      await exportStatementToExcel(companyInfo, row.party_name, formattedEntries, {
        currencyCode: row.currency_code,
        partyType: 'customer',
        ...(row.party_phone !== null && row.party_phone !== ''
          ? { partyPhone: row.party_phone }
          : {}),
        partyCategory: row.category,
      });

      showToast('تم تحميل كشف الحساب بصيغة Excel بنجاح', 'success');
    } catch (err) {
      showToast(parseError(err).message, 'error');
    } finally {
      setExportingPartyId(null);
    }
  };

  const getRowActions = (row: FollowUpDashboardRow): RowAction[] => {
    const isExportingThis = exportingPartyId === row.party_id;
    const actions: RowAction[] = [
      {
        key: 'ai-risk',
        icon: Sparkles,
        label: 'التحليل الذكي للمخاطر (AI)',
        colorClasses:
          'bg-purple-500/10 text-purple-600 hover:bg-purple-600 hover:text-white dark:text-purple-400 shadow-sm',
        onAction: () => {
          setAiRiskRow(row);
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
          void handleExportExcel(row);
        },
      },
    ];

    if (canRemind) {
      actions.push({
        key: 'whatsapp-reminder',
        icon: MessageSquare,
        label: 'تذكير واتساب ذكي',
        colorClasses:
          'bg-green-500/10 text-green-600 hover:bg-green-600 hover:text-white dark:text-green-400 shadow-sm',
        onAction: () => {
          setReminderRow(row);
        },
      });
    }

    if (canManage && onCollect) {
      actions.push({
        key: 'collect-now',
        icon: Banknote,
        label: 'تحصيل الآن — سند قبض مُعبّأ لهذا العميل',
        colorClasses:
          'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 shadow-sm',
        onAction: () => {
          onCollect(row);
        },
      });
    }

    actions.push({
      key: 'timeline',
      icon: History,
      label: 'خط تحصيل العميل — سجل الأنشطة',
      colorClasses:
        'bg-slate-500/10 text-slate-600 hover:bg-slate-500 hover:text-white dark:text-slate-400 shadow-sm',
      onAction: () => {
        setTimelineRow(row);
      },
    });

    if (canManage) {
      actions.push({
        key: 'payment-promise',
        icon: Handshake,
        label: 'تسجيل وعد سداد',
        colorClasses:
          'bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white dark:text-amber-400 shadow-sm',
        onAction: () => {
          setPromiseRow(row);
        },
      });
    }

    return actions;
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--app-border)] p-14 text-center text-sm text-[var(--app-text-secondary)] max-md:p-6">
        لا توجد سجلات في هذا التصنيف
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm md:block print:block print:overflow-visible">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-[var(--app-surface-hover)]/50 border-b border-[var(--app-border)] text-[10px] font-bold text-[var(--app-text-secondary)]">
              <th className="px-4 py-3 max-md:px-2 max-md:py-2">العميل</th>
              <th className="px-4 py-3 max-md:px-2 max-md:py-2">التصنيف</th>
              <th className="px-4 py-3 text-left max-md:px-2 max-md:py-2">الرصيد</th>
              <th className="px-4 py-3 max-md:px-2 max-md:py-2">أقدم استحقاق</th>
              <th className="px-4 py-3 max-md:px-2 max-md:py-2">أيام التأخير</th>
              <th className="px-4 py-3 max-md:px-2 max-md:py-2">حالة التذكير</th>
              <th className="px-4 py-3 text-center max-md:px-2 max-md:py-2">الإجراءات والتحصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {rows.map(row => {
              const classification =
                CLASSIFICATION_META[row.classification] ?? CLASSIFICATION_META.current;
              const reminder =
                REMINDER_STATUS_META[row.reminder_status] ?? REMINDER_STATUS_META.needs_reminder;

              return (
                <tr
                  key={`${row.party_id}-${row.currency_code}`}
                  className="transition-colors hover:bg-[var(--app-surface-hover)]"
                >
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    <p className="whitespace-nowrap text-xs font-bold text-[var(--app-text)]">
                      {row.party_name}
                    </p>
                    {row.party_phone !== null && row.party_phone !== '' && (
                      <p
                        className="font-mono text-[10px] text-[var(--app-text-secondary)]"
                        dir="ltr"
                      >
                        {row.party_phone}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    <StatusBadge {...classification} />
                  </td>
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    <span className="font-mono text-xs font-bold text-[var(--app-text)]" dir="ltr">
                      {formatCurrency(row.outstanding_balance, row.currency_code)}
                    </span>
                    {row.has_broken_promise && (
                      <span className="mt-0.5 block text-[10px] font-bold text-rose-500">
                        ⚠️ وعد مخلَف
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    {row.oldest_due_date !== null && row.oldest_due_date !== '' ? (
                      <span
                        className="font-mono text-xs text-[var(--app-text-secondary)]"
                        dir="ltr"
                      >
                        {row.oldest_due_date}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--app-text-secondary)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    {row.days_overdue > 0 ? (
                      <span className="text-xs font-extrabold text-orange-600">
                        {row.days_overdue} يوم
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--app-text-secondary)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    <StatusBadge {...reminder} />
                    <span
                      title="مرحلة التصعيد المقترحة حسب أيام التأخير"
                      className={`mt-1 block rounded-lg border px-1.5 py-0.5 text-[10px] font-bold ${
                        escalationBadgeMeta(row.escalation_stage).badgeClass
                      }`}
                    >
                      {escalationBadgeMeta(row.escalation_stage).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    <RowActions
                      actions={getRowActions(row)}
                      variant="table"
                      className="justify-center"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards — بديل الجدول على الهاتف (مكوّن موحّد) */}
      <MobileCardList>
        {rows.map(row => {
          const classification =
            CLASSIFICATION_META[row.classification] ?? CLASSIFICATION_META.current;
          const reminder =
            REMINDER_STATUS_META[row.reminder_status] ?? REMINDER_STATUS_META.needs_reminder;
          return (
            <MobileCardRow
              key={`${row.party_id}-${row.currency_code}`}
              id={`${row.party_id}-${row.currency_code}`}
              title={row.party_name}
              subtitle={row.party_phone}
              badge={
                <>
                  <StatusBadge {...classification} />
                  <StatusBadge {...reminder} />
                </>
              }
              badgeSecondary={
                <>
                  {row.has_broken_promise ? (
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                      ⚠️ وعد مخلَف
                    </span>
                  ) : null}
                  <span
                    title="مرحلة التصعيد المقترحة حسب أيام التأخير"
                    className={`rounded-lg border px-1.5 py-0.5 text-[10px] font-bold ${
                      escalationBadgeMeta(row.escalation_stage).badgeClass
                    }`}
                  >
                    {escalationBadgeMeta(row.escalation_stage).label}
                  </span>
                </>
              }
              meta={
                <>
                  <span className="font-mono text-sm font-bold text-[var(--app-text)]" dir="ltr">
                    {formatCurrency(row.outstanding_balance, row.currency_code)}
                  </span>
                  {row.days_overdue > 0 && (
                    <span className="text-[11px] font-extrabold text-orange-600">
                      {row.days_overdue} يوم تأخير
                    </span>
                  )}
                  {row.oldest_due_date !== null && row.oldest_due_date !== '' && (
                    <span
                      className="font-mono text-[10px] text-[var(--app-text-secondary)]"
                      dir="ltr"
                    >
                      {row.oldest_due_date}
                    </span>
                  )}
                </>
              }
              actions={<RowActions actions={getRowActions(row)} variant="card" />}
            />
          );
        })}
      </MobileCardList>

      {/* Collection timeline modal (Phase 2A) */}
      {timelineRow && (
        <CollectionTimelineModal
          isOpen
          onClose={() => {
            setTimelineRow(null);
          }}
          row={timelineRow}
          canManage={canManage}
        />
      )}

      {/* Reminder Modal */}
      {reminderRow && (
        <ReminderModal
          isOpen
          onClose={() => {
            setReminderRow(null);
          }}
          row={reminderRow}
        />
      )}

      {/* Promise Modal */}
      {promiseRow && (
        <PromiseFormModal
          isOpen
          onClose={() => {
            setPromiseRow(null);
          }}
          partyId={promiseRow.party_id}
          partyName={promiseRow.party_name}
        />
      )}

      {/* AI Risk Modal */}
      {aiRiskRow && (
        <AIDebtRiskModal
          isOpen
          onClose={() => {
            setAiRiskRow(null);
          }}
          row={aiRiskRow}
          onOpenReminder={r => {
            setAiRiskRow(null);
            setReminderRow(r);
          }}
        />
      )}
    </>
  );
};

export default FollowUpTable;
