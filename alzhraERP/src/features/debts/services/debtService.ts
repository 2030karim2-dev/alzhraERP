/**
 * Debt & Collection module — service layer.
 * Orchestrates the API for hooks and prepares display data.
 * Business decisions (classification, aging, reminder window) live in SQL;
 * this layer only maps and filters for presentation.
 */
import {
  debtApi,
  debtMessageApi,
  DEBT_ENGINE_DEFAULTS,
  type DebtEngineParams,
} from '../api/debtApi';
import { logger } from '../../../core/utils/logger';
import { renderReminderTemplate } from '../lib/messageTemplate';
import {
  buildWhatsAppLink,
  hasValidWhatsAppPhone,
  normalizePhoneForWhatsApp,
} from '../lib/whatsapp';
import type { DebtAnalytics, FollowUpDashboardRow, FollowUpTab } from '../types';

export interface PreparedReminder {
  message: string;
  recipient: string;
  whatsappLink: string | null;
  phoneMissing: boolean;
}

/** شكل مرن لإعدادات المحرك — يقبل صف الإعدادات الكامل أو قيماً جزئية. */
export interface DebtEngineConfigLike {
  due_soon_days?: number | null;
  critical_days?: number | null;
  reminder_window_days?: number | null;
}

/** يدمج إعدادات الشركة المحفوظة مع الافتراضي — دالة نقية قابلة للاختبار. */
export const resolveEngineParams = (
  config: DebtEngineConfigLike | null | undefined
): DebtEngineParams => ({
  dueSoonDays: config?.due_soon_days ?? DEBT_ENGINE_DEFAULTS.dueSoonDays,
  criticalDays: config?.critical_days ?? DEBT_ENGINE_DEFAULTS.criticalDays,
  reminderWindowDays: config?.reminder_window_days ?? DEBT_ENGINE_DEFAULTS.reminderWindowDays,
});

export const debtsService = {
  /**
   * Follow-up dashboard rows, already classified by the database.
   * تُمرَّر نوافذ المحرك المحفوظة صراحةً حتى تعمل إعدادات «الإعدادات»
   * حتى مع قاعدة بيانات حية لم تُطبّق الهجرة الخادمية بعد (التوافقين).
   */
  getDashboard: async (
    companyId: string,
    branchId?: string | null
  ): Promise<FollowUpDashboardRow[]> => {
    let engine: DebtEngineParams = { ...DEBT_ENGINE_DEFAULTS };
    try {
      const config = await debtApi.getFollowupConfig(companyId);
      if (config) engine = resolveEngineParams(config);
    } catch (err) {
      logger.warn('DebtService', 'تعذر قراءة إعدادات المتابعة — استخدام الافتراضي', err);
    }
    return debtApi.getDashboard(companyId, branchId, engine);
  },

  getAnalytics: async (companyId: string, branchId?: string | null): Promise<DebtAnalytics> => {
    const raw = await debtApi.getAnalytics(companyId, branchId);
    return (raw ?? {}) as unknown as DebtAnalytics;
  },

  getTodayTasks: (companyId: string, branchId?: string | null) =>
    debtApi.getTodayTasks(companyId, branchId),

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
        return rows.filter(r => r.reminder_status === 'needs_reminder');
      case 'reminded':
        return rows.filter(r => r.reminder_status === 'reminded');
      case 'overdue':
        return rows.filter(r => r.classification === 'overdue' || r.classification === 'critical');
      case 'today':
        return rows.filter(r => r.classification === 'due_today');
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
