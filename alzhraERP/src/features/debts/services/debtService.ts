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
import type {
  DebtAnalytics,
  FollowUpDashboardRow,
  FollowUpTab,
  CollectionActivityRecord,
  CompleteDebtTaskResult,
  DebtChannelConfig,
  DebtCollector,
  DebtFollowupAction,
  DebtReminderQueueRow,
  DebtTaskQueueRow,
  PartyTimelineEntry,
} from '../types';

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

  /** Phase 2A: تسجيل نشاط تحصيل (+ إجراء تالٍ) — معاملة واحدة في الخادم. */
  logCollectionActivity: (params: {
    companyId: string;
    partyId: string;
    activityType: string;
    subject: string;
    outcome?: string | null | undefined;
    notes?: string | null | undefined;
    nextActionDate?: string | null | undefined;
    priority?: string | undefined;
  }): Promise<CollectionActivityRecord> => debtMessageApi.logCollectionActivity(params),

  /** S3: طابور الإرسال للمراقبة في صفحة الرسائل. */
  getReminderQueue: (
    companyId: string,
    status?: string,
    limit?: number
  ): Promise<DebtReminderQueueRow[]> => debtMessageApi.getReminderQueue(companyId, status, limit),

  /** S3: إعدادات قنوات الإرسال. */
  getChannelConfig: (companyId: string): Promise<DebtChannelConfig> =>
    debtMessageApi.getChannelConfig(companyId),

  /** S3: تحديث إعدادات قنوات الإرسال. */
  updateChannelConfig: (companyId: string, patch: Partial<DebtChannelConfig>): Promise<void> =>
    debtMessageApi.updateChannelConfig(companyId, patch),

  /** S3-prep: استيراد المكتبة القياسية للقوالب (idempotent على الخادم). */
  seedDefaultTemplates: (companyId: string): Promise<number> =>
    debtMessageApi.seedDefaultTemplates(companyId),

  /** S2: طابور المهام الموحّد (فواتير/وعود/إجراءات/حرج/فاشل) مع المسؤول. */
  getTaskQueue: (
    companyId: string,
    options?: {
      branchId?: string | null;
      collectorId?: string | null;
      windowDays?: number;
      limit?: number;
    }
  ): Promise<DebtTaskQueueRow[]> => debtMessageApi.getTaskQueue(companyId, options),

  /** S2: قائمة المحصّلين (أعضاء المنشأة). */
  getCollectors: (companyId: string): Promise<DebtCollector[]> =>
    debtMessageApi.getCollectors(companyId),

  /** S2: إتمام مهمة مجدولة (+ إجراء تالٍ اختياري). */
  completeTask: (params: {
    activityId: string;
    outcome?: string | null;
    notes?: string | null;
    nextActionDate?: string | null;
  }): Promise<CompleteDebtTaskResult> => debtMessageApi.completeTask(params),

  /** S2: إسناد/إلغاء إسناد مجموعة عملاء (null = إلغاء). */
  assignParties: (params: {
    companyId: string;
    partyIds: string[];
    collectorId: string | null;
    priority?: string;
    notes?: string | null;
  }): Promise<number> => debtMessageApi.assignParties(params),

  /** S1: الإجراءات المجدولة المعلّقة (customer_activities.pending) — قراءة فقط. */
  getFollowupActions: (
    companyId: string,
    branchId?: string | null,
    limit?: number
  ): Promise<DebtFollowupAction[]> => debtMessageApi.getFollowupActions(companyId, branchId, limit),

  /** Phase 2A: الخط الزمني لآخر أنشطة الطرف. */
  getPartyTimeline: (
    companyId: string,
    partyId: string,
    limit?: number
  ): Promise<PartyTimelineEntry[]> => debtMessageApi.getPartyTimeline(companyId, partyId, limit),

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
