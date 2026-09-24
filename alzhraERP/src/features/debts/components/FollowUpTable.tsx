import React, { useState } from 'react';
import { formatCurrency } from '../../../core/utils/currencyUtils';
import { parseError } from '../../../core/utils/errorUtils';
import { CLASSIFICATION_META, REMINDER_STATUS_META, escalationBadgeMeta } from '../lib/constants';
import { buildDebtRowActions, type DebtRowActionHandlers } from '../lib/rowActions';
import { useCompany } from '../../settings/hooks';
import { useFeedbackStore } from '../../feedback/store';
import { partiesService } from '../../parties/service';
import { exportStatementToExcel } from '../../parties/utils/statementExcelExporter';
import StatusBadge from './StatusBadge';
import MobileCardList, { MobileCardRow } from '../../../ui/base/MobileCardList';
import RowActions from './RowActions';
import FollowUpExcelGrid from './FollowUpExcelGrid';
import ReminderModal from './ReminderModal';
import PromiseFormModal from './PromiseFormModal';
import AIDebtRiskModal from './AIDebtRiskModal';
import CollectionTimelineModal from './CollectionTimelineModal';
import type { FollowUpDashboardRow } from '../types';

interface FollowUpTableProps {
  rows: FollowUpDashboardRow[];
  /** Whether the user may create payment promises (debts:manage).
   *  Secure default: false — the parent must pass the checked value. */
  canManage?: boolean;
  /** Whether the user may send WhatsApp reminders (debts:remind).
   *  Secure default: false — the parent must pass the checked value. */
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
  canManage = false,
  canRemind = false,
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

  /**
   * Row action handlers shared by the desktop Excel grid and the mobile cards.
   * Single source of truth: permissions and labels live in lib/rowActions.ts.
   */
  const rowActionHandlers: DebtRowActionHandlers = {
    canManage,
    canRemind,
    exportingPartyId,
    onAiRisk: row => {
      setAiRiskRow(row);
    },
    onExportStatement: row => {
      void handleExportExcel(row);
    },
    onRemind: row => {
      setReminderRow(row);
    },
    onCollect,
    onTimeline: row => {
      setTimelineRow(row);
    },
    onPromise: row => {
      setPromiseRow(row);
    },
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
      {/* سطح المكتب: شبكة إكسل معيارية (ExcelTable) — أعمدة وتحديد ونسخ ومجاميع */}
      <FollowUpExcelGrid rows={rows} handlers={rowActionHandlers} />

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
              actions={
                <RowActions actions={buildDebtRowActions(row, rowActionHandlers)} variant="card" />
              }
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
