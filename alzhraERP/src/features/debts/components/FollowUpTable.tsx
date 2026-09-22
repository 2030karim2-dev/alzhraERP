import React, { useState } from 'react';
import {
  MessageSquare,
  Handshake,
  Sparkles,
  FileSpreadsheet,
  Loader2,
  Banknote,
} from 'lucide-react';
import { formatCurrency } from '../../../core/utils/currencyUtils';
import { CLASSIFICATION_META, REMINDER_STATUS_META } from '../lib/constants';
import { useCompany } from '../../settings/hooks';
import { useFeedbackStore } from '../../feedback/store';
import { partiesService } from '../../parties/service';
import { exportStatementToExcel } from '../../parties/utils/statementExcelExporter';
import StatusBadge from './StatusBadge';
import MobileCardList, { MobileCardRow } from '../../../ui/base/MobileCardList';
import ReminderModal from './ReminderModal';
import PromiseFormModal from './PromiseFormModal';
import AIDebtRiskModal from './AIDebtRiskModal';
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
  const [exportingPartyId, setExportingPartyId] = useState<string | null>(null);

  const handleExportExcel = async (row: FollowUpDashboardRow) => {
    try {
      setExportingPartyId(row.party_id);
      showToast('جاري إنشاء وتنسيق كشف الحساب الاحترافي (Excel)...', 'info');

      const statementEntries = await partiesService.getStatement(row.party_id, 'customer');

      const companyInfo = {
        name_ar: company?.name_ar || 'منظومة الزهراء المحاسبية',
        address: company?.address ?? '',
        phone: company?.phone ?? '',
        tax_number: company?.tax_number ?? '',
        commercial_reg: (company as any)?.commercial_reg ?? '',
        bank_name: (company as any)?.bank_name ?? '',
        bank_account_iban: (company as any)?.bank_account_iban ?? '',
      };

      const formattedEntries = statementEntries.map(e => ({
        date: e.date,
        operation_type: e.operation_type ?? '',
        reference_no: e.ref,
        desc: e.desc,
        debit: e.debit,
        credit: e.credit,
        balance: e.balance ?? 0,
      }));

      await exportStatementToExcel(companyInfo, row.party_name, formattedEntries, {
        currencyCode: row.currency_code,
        ...(row.party_phone ? { partyPhone: row.party_phone } : {}),
        partyCategory: row.category,
      });

      showToast('تم تحميل كشف الحساب بصيغة Excel بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تصدير كشف الحساب', 'error');
    } finally {
      setExportingPartyId(null);
    }
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
            {/* eslint-disable-next-line complexity -- تعقيد كتلة الإجراءات ناتج عن العرض الشرطي لأزرار (تحصيل/تذكير/وعد/تصدير/مخاطر) لا عن منطق حسابي */}
            {rows.map(row => {
              const classification =
                CLASSIFICATION_META[row.classification] ?? CLASSIFICATION_META.current;
              const reminder =
                REMINDER_STATUS_META[row.reminder_status] ?? REMINDER_STATUS_META.needs_reminder;
              const isExportingThis = exportingPartyId === row.party_id;

              return (
                <tr
                  key={`${row.party_id}-${row.currency_code}`}
                  className="transition-colors hover:bg-[var(--app-surface-hover)]"
                >
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    <p className="whitespace-nowrap text-xs font-bold text-[var(--app-text)]">
                      {row.party_name}
                    </p>
                    {row.party_phone && (
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
                      {formatCurrency(Number(row.outstanding_balance), row.currency_code)}
                    </span>
                    {row.has_broken_promise && (
                      <span className="mt-0.5 block text-[10px] font-bold text-rose-500">
                        ⚠️ وعد مخلَف
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    {row.oldest_due_date ? (
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
                  </td>
                  <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* AI Risk Analysis Button */}
                      <button
                        onClick={() => {
                          setAiRiskRow(row);
                        }}
                        title="التحليل الذكي للمخاطر (AI)"
                        className="rounded-xl bg-purple-500/10 p-2 text-purple-600 shadow-sm transition-all hover:bg-purple-600 hover:text-white dark:text-purple-400 max-md:p-1.5"
                      >
                        <Sparkles size={14} />
                      </button>

                      {/* Instant Professional Excel Statement */}
                      <button
                        onClick={() => handleExportExcel(row)}
                        disabled={isExportingThis}
                        title="تحميل كشف حساب إكسل احترافي (.xlsx)"
                        className="rounded-xl bg-blue-500/10 p-2 text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white disabled:opacity-50 dark:text-blue-400 max-md:p-1.5"
                      >
                        {isExportingThis ? (
                          <Loader2 size={14} className="animate-spin text-blue-600" />
                        ) : (
                          <FileSpreadsheet size={14} />
                        )}
                      </button>

                      {/* WhatsApp Reminder Button */}
                      {canRemind && (
                        <button
                          onClick={() => {
                            setReminderRow(row);
                          }}
                          title="تذكير واتساب ذكي"
                          className="rounded-xl bg-green-500/10 p-2 text-green-600 shadow-sm transition-all hover:bg-green-600 hover:text-white dark:text-green-400 max-md:p-1.5"
                        >
                          <MessageSquare size={14} />
                        </button>
                      )}

                      {/* Collect now → prefilled receipt bond */}
                      {canManage && onCollect && (
                        <button
                          onClick={() => {
                            onCollect(row);
                          }}
                          title="تحصيل الآن — سند قبض مُعبّأ لهذا العميل"
                          className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 shadow-sm transition-all hover:bg-emerald-600 hover:text-white dark:text-emerald-400 max-md:p-1.5"
                        >
                          <Banknote size={14} />
                        </button>
                      )}

                      {/* Payment Promise Button */}
                      {canManage && (
                        <button
                          onClick={() => {
                            setPromiseRow(row);
                          }}
                          title="تسجيل وعد سداد"
                          className="rounded-xl bg-amber-500/10 p-2 text-amber-600 shadow-sm transition-all hover:bg-amber-600 hover:text-white dark:text-amber-400 max-md:p-1.5"
                        >
                          <Handshake size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards — بديل الجدول على الهاتف (مكوّن موحّد) */}
      <MobileCardList>
        {/* eslint-disable-next-line complexity -- نفس مبرر جدول سطح المكتب: تعقيد عرض شرطي لأزرار الإجراءات */}
        {rows.map(row => {
          const classification =
            CLASSIFICATION_META[row.classification] ?? CLASSIFICATION_META.current;
          const reminder =
            REMINDER_STATUS_META[row.reminder_status] ?? REMINDER_STATUS_META.needs_reminder;
          const isExportingThis = exportingPartyId === row.party_id;
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
                row.has_broken_promise ? (
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                    ⚠️ وعد مخلَف
                  </span>
                ) : undefined
              }
              meta={
                <>
                  <span className="font-mono text-sm font-bold text-[var(--app-text)]" dir="ltr">
                    {formatCurrency(Number(row.outstanding_balance), row.currency_code)}
                  </span>
                  {row.days_overdue > 0 && (
                    <span className="text-[11px] font-extrabold text-orange-600">
                      {row.days_overdue} يوم تأخير
                    </span>
                  )}
                  {row.oldest_due_date && (
                    <span
                      className="font-mono text-[10px] text-[var(--app-text-secondary)]"
                      dir="ltr"
                    >
                      {row.oldest_due_date}
                    </span>
                  )}
                </>
              }
              actions={
                <>
                  <button
                    onClick={() => {
                      setAiRiskRow(row);
                    }}
                    title="التحليل الذكي للمخاطر (AI)"
                    className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 transition-all hover:bg-purple-600 hover:text-white active:scale-90 dark:text-purple-400"
                  >
                    <Sparkles size={16} />
                  </button>
                  <button
                    onClick={() => handleExportExcel(row)}
                    disabled={isExportingThis}
                    title="تحميل كشف حساب إكسل احترافي (.xlsx)"
                    className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 transition-all hover:bg-blue-600 hover:text-white active:scale-90 disabled:opacity-50 dark:text-blue-400"
                  >
                    {isExportingThis ? (
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                    ) : (
                      <FileSpreadsheet size={16} />
                    )}
                  </button>
                  {canRemind && (
                    <button
                      onClick={() => {
                        setReminderRow(row);
                      }}
                      title="تذكير واتساب ذكي"
                      className="rounded-xl bg-green-500/10 p-2.5 text-green-600 transition-all hover:bg-green-600 hover:text-white active:scale-90 dark:text-green-400"
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}
                  {canManage && onCollect && (
                    <button
                      onClick={() => {
                        onCollect(row);
                      }}
                      title="تحصيل الآن — سند قبض مُعبّأ لهذا العميل"
                      className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white active:scale-90 dark:text-emerald-400"
                    >
                      <Banknote size={16} />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => {
                        setPromiseRow(row);
                      }}
                      title="تسجيل وعد سداد"
                      className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 transition-all hover:bg-amber-600 hover:text-white active:scale-90 dark:text-amber-400"
                    >
                      <Handshake size={16} />
                    </button>
                  )}
                </>
              }
            />
          );
        })}
      </MobileCardList>

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
