/**
 * Debt & Collection module — service layer.
 * Orchestrates the API for hooks and prepares display data.
 * Business decisions (classification, aging, reminder window) live in SQL;
 * this layer only maps and filters for presentation.
 */
import { debtApi, debtMessageApi, DEBT_ENGINE_DEFAULTS } from '../api/debtApi';
import { renderReminderTemplate } from '../lib/messageTemplate';
import { buildWhatsAppLink, hasValidWhatsAppPhone, normalizePhoneForWhatsApp } from '../lib/whatsapp';
import type {
  DebtAnalytics,
  FollowUpDashboardRow,
  FollowUpTab,
} from '../types';

export interface PreparedReminder {
  message: string;
  recipient: string;
  whatsappLink: string | null;
  phoneMissing: boolean;
}

export const debtsService = {
  /** Follow-up dashboard rows, already classified by the database. */
  getDashboard: (companyId: string) => debtApi.getDashboard(companyId),

  getAnalytics: async (companyId: string): Promise<DebtAnalytics> => {
    const raw = await debtApi.getAnalytics(companyId);
    return (raw ?? {}) as unknown as DebtAnalytics;
  },

  getTodayTasks: (companyId: string) => debtApi.getTodayTasks(companyId),

  getPartyOverview: (companyId: string, partyId: string) =>
    debtApi.getPartyOverview(companyId, partyId),

  /**
   * Pure presentation grouping of server-classified rows into follow-up tabs.
   * The classification itself is authoritative (from SQL); this only selects.
   */
  filterByTab(rows: FollowUpDashboardRow[], tab: FollowUpTab): FollowUpDashboardRow[] {
    switch (tab) {
      case 'all':
        return rows;
      case 'needs_reminder':
        return rows.filter((r) => r.reminder_status === 'needs_reminder');
      case 'reminded':
        return rows.filter((r) => r.reminder_status === 'reminded');
      case 'overdue':
        return rows.filter(
          (r) => r.classification === 'overdue' || r.classification === 'critical'
        );
      case 'today':
        return rows.filter((r) => r.classification === 'due_today');
      default:
        return rows;
    }
  },

  /**
   * Prepare a WhatsApp reminder for a dashboard row:
   * render the template → build the wa.me deep link → record payload.
   */
  prepareReminder(
    row: FollowUpDashboardRow,
    templateBody: string,
    options: { companyName?: string | undefined; signature?: string | null | undefined }
  ): PreparedReminder {
    const dueDate = row.oldest_due_date ?? row.next_due_date;
    const message = renderReminderTemplate(templateBody, {
      customerName: row.party_name,
      amount: row.outstanding_balance,
      currency: row.currency_code,
      ...(dueDate != null ? { dueDate } : {}),
      daysOverdue: row.days_overdue,
      ...(options.companyName !== undefined ? { companyName: options.companyName } : {}),
      ...(options.signature !== undefined ? { signature: options.signature } : {}),
    });

    const phone = row.party_phone ?? '';
    const phoneMissing = !hasValidWhatsAppPhone(phone);
    const recipient = normalizePhoneForWhatsApp(phone);

    return {
      message,
      recipient,
      whatsappLink: phoneMissing ? null : buildWhatsAppLink(phone, message),
      phoneMissing,
    };
  },

  /** Engine defaults exposed for the settings form before a config row exists. */
  getEngineDefaults: () => ({ ...DEBT_ENGINE_DEFAULTS }),
};

export { debtApi, debtMessageApi };
