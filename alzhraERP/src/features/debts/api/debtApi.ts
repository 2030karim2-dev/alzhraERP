/**
 * Debt & Collection module — API layer.
 * Architecture: Component → Hook → Service → API → Supabase.
 * All Supabase calls live here. Errors are re-thrown as PostgrestError
 * (an Error subclass) and surfaced to the user by the hooks layer.
 */
import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type { Database } from '../../../core/database.types';
import type {
  DebtFollowupConfig,
  DebtFollowupConfigUpdate,
  PaymentPromise,
  PaymentPromiseInsert,
  PaymentPromiseUpdate,
  PaymentPromiseWithParty,
  FollowUpDashboardRow,
  TodayTask,
  PartyDebtOverview,
  PartyBalanceByCurrency,
  ReminderRecord,
  DebtMessageTemplate,
  DebtMessageTemplateInsert,
  DebtMessageTemplateUpdate,
  DebtMessageLogWithParty,
  PartyOpeningBalance,
  PartyOpeningBalanceInsert,
  CollectionActivityRecord,
  CompleteDebtTaskResult,
  DebtChannelConfig,
  DebtChannelConfigPatch,
  DebtCollector,
  DebtFollowupAction,
  DebtReminderQueueRow,
  DebtTaskQueueRow,
  PartyTimelineEntry,
} from '../types';

/** إعدادات قنوات الإرسال الفارغة (افتراضي قبل أي ضبط) — بلا أي مفاتيح. */
export const EMPTY_CHANNEL_CONFIG: DebtChannelConfig = {
  whatsapp_enabled: false,
  whatsapp_api_url: '',
  whatsapp_phone: '',
  has_whatsapp_key: false,
  sms_enabled: false,
  sms_api_url: '',
  sms_sender_id: '',
  has_sms_key: false,
};

/** Engine defaults — also the migration defaults; kept in sync. */
export const DEBT_ENGINE_DEFAULTS = {
  dueSoonDays: 7,
  criticalDays: 30,
  reminderWindowDays: 3,
} as const;

/** نوافذ محرك المتابعة — تُحل من إعدادات الشركة المحفوظة أو الافتراضي. */
export interface DebtEngineParams {
  dueSoonDays: number;
  criticalDays: number;
  reminderWindowDays: number;
}

export const debtApi = {
  // ── Follow-up engine (RPCs — server-classified, display only) ──
  getDashboard: async (
    companyId: string,
    branchId?: string | null,
    engine?: DebtEngineParams
  ): Promise<FollowUpDashboardRow[]> => {
    // نوافذ المحرك: قيم الشركة المحفوظة (من الطبقة الخدمية) أو الافتراضي.
    // الخادم أيضاً يسقط لإعدادات debt_followup_config عند تمرير NULL.
    const params: DebtEngineParams = engine ?? DEBT_ENGINE_DEFAULTS;
    const { data, error } = await supabase.rpc('get_debt_followup_dashboard', {
      p_company_id: companyId,
      p_due_soon_days: params.dueSoonDays,
      p_critical_days: params.criticalDays,
      p_reminder_window_days: params.reminderWindowDays,
      p_branch_id: branchId ?? null,
    });
    if (error) throw error;
    return data;
  },

  getAnalytics: async (
    companyId: string,
    branchId?: string | null
  ): Promise<Record<string, unknown> | null> => {
    const { data, error } = await supabase.rpc('get_debt_analytics_summary', {
      p_company_id: companyId,
      p_branch_id: branchId ?? null,
    });
    if (error) {
      // Graceful degradation (same pattern as getTodayTasks): on a database
      // without the RPC, return null instead of throwing (TanStack Query
      // would retry and spam 400s).
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) {
        logger.warn('DebtAPI', 'get_debt_analytics_summary RPC not found on server', { companyId });
        return null;
      }
      throw error;
    }
    return data as Record<string, unknown>;
  },

  getTodayTasks: async (companyId: string, branchId?: string | null): Promise<TodayTask[]> => {
    const { data, error } = await supabase.rpc('get_debt_today_tasks', {
      p_company_id: companyId,
      p_branch_id: branchId ?? null,
    });
    if (error) {
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) {
        logger.warn(
          'DebtAPI',
          'get_debt_today_tasks RPC not found on server — apply migration 20260814000006',
          { companyId }
        );
        return [];
      }
      throw error;
    }
    return data ?? [];
  },

  getPartyOverview: async (
    companyId: string,
    partyId: string
  ): Promise<PartyDebtOverview | null> => {
    const { data, error } = await supabase.rpc('get_debt_party_overview', {
      p_company_id: companyId,
      p_party_id: partyId,
    });
    if (error) throw error;
    return data.length > 0 ? data[0] : null;
  },

  getPartyBalances: async (
    companyId: string,
    partyId: string
  ): Promise<PartyBalanceByCurrency[]> => {
    const { data, error } = await supabase.rpc('get_party_all_balances', {
      p_company_id: companyId,
      p_party_id: partyId,
    });
    if (error) throw error;
    return data;
  },

  // ── Follow-up configuration ──
  getFollowupConfig: async (companyId: string): Promise<DebtFollowupConfig | null> => {
    const { data, error } = await supabase
      .from('debt_followup_config')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  upsertFollowupConfig: async (
    companyId: string,
    config: DebtFollowupConfigUpdate
  ): Promise<DebtFollowupConfig> => {
    const { data, error } = await supabase
      .from('debt_followup_config')
      .upsert({ company_id: companyId, ...config }, { onConflict: 'company_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Payment promises ──
  getPromises: async (
    companyId: string,
    filters?: { partyId?: string; status?: string; branchId?: string | null }
  ): Promise<PaymentPromiseWithParty[]> => {
    let query = supabase
      .from('debt_payment_promises')
      .select('*, parties!inner(name, phone, branch_id)')
      .eq('company_id', companyId)
      .order('promise_date', { ascending: true });
    if (filters?.partyId != null) query = query.eq('party_id', filters.partyId);
    if (filters?.status != null) query = query.eq('status', filters.status);
    if (filters?.branchId) query = query.eq('parties.branch_id', filters.branchId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  createPromise: async (payload: PaymentPromiseInsert): Promise<PaymentPromise> => {
    const { data, error } = await supabase
      .from('debt_payment_promises')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updatePromise: async (
    companyId: string,
    id: string,
    payload: PaymentPromiseUpdate
  ): Promise<PaymentPromise> => {
    const { data, error } = await supabase
      .from('debt_payment_promises')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId) // دفاع عمق: منع تعديل وعود شركة أخرى
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deletePromise: async (companyId: string, id: string): Promise<void> => {
    const { error } = await supabase
      .from('debt_payment_promises')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId); // دفاع عمق: منع حذف وعود شركة أخرى
    if (error) throw error;
  },

  breakOverduePromises: async (companyId: string): Promise<string[]> => {
    const { data, error } = await supabase.rpc('break_overdue_promises', {
      p_company_id: companyId,
    });
    if (error) throw error;
    return data;
  },

  completePromise: async (
    companyId: string,
    promiseId: string,
    paymentId?: string
  ): Promise<void> => {
    const { error } = await supabase.rpc('complete_promise', {
      p_company_id: companyId,
      p_promise_id: promiseId,
      ...(paymentId ? { p_payment_id: paymentId } : {}),
    });
    if (error) throw error;
  },
};

export const debtMessageApi = {
  // ── Message templates ──
  getTemplates: async (companyId: string, activeOnly = true): Promise<DebtMessageTemplate[]> => {
    let query = supabase.from('debt_message_templates').select('*').eq('company_id', companyId);
    if (activeOnly) query = query.eq('is_active', true);
    query = query.order('name', { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  saveTemplate: async (payload: DebtMessageTemplateInsert): Promise<DebtMessageTemplate> => {
    const { data, error } = await supabase
      .from('debt_message_templates')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateTemplate: async (
    companyId: string,
    id: string,
    payload: DebtMessageTemplateUpdate
  ): Promise<DebtMessageTemplate> => {
    const { data, error } = await supabase
      .from('debt_message_templates')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId) // دفاع عمق: منع تعديل قوالب شركة أخرى
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteTemplate: async (companyId: string, id: string): Promise<void> => {
    const { error } = await supabase
      .from('debt_message_templates')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId); // دفاع عمق: منع حذف قوالب شركة أخرى
    if (error) throw error;
  },

  // ── Message log / outbox ──
  getMessageLog: async (
    companyId: string,
    status?: string,
    limit = 200
  ): Promise<DebtMessageLogWithParty[]> => {
    let query = supabase
      .from('debt_message_log')
      .select('*, parties(name, phone)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // ── Reminder recording (single transaction in SQL) ──
  recordReminder: async (params: {
    companyId: string;
    partyId: string;
    messageText: string;
    channel?: string | undefined;
    templateId?: string | null | undefined;
    recipient?: string | null | undefined;
    relatedEntityType?: string | null | undefined;
    relatedEntityId?: string | null | undefined;
    /** مفتاح عدم التكرار: يمنع تسجيل نفس التذكير مرتين (نقر مزدوج/إعادة محاولة). */
    idempotencyKey?: string | null | undefined;
  }): Promise<ReminderRecord> => {
    const { data, error } = await supabase.rpc('record_debt_reminder', {
      p_company_id: params.companyId,
      p_party_id: params.partyId,
      p_message_text: params.messageText,
      ...(params.channel ? { p_channel: params.channel } : {}),
      ...(params.templateId ? { p_template_id: params.templateId } : {}),
      ...(params.recipient ? { p_recipient: params.recipient } : {}),
      ...(params.relatedEntityType ? { p_related_entity_type: params.relatedEntityType } : {}),
      ...(params.relatedEntityId ? { p_related_entity_id: params.relatedEntityId } : {}),
      ...(params.idempotencyKey != null ? { p_idempotency_key: params.idempotencyKey } : {}),
    });
    if (error) throw error;
    if (data.length === 0) throw new Error('تعذر تسجيل التذكير');
    return data[0];
  },

  // ── Collection activity log (Phase 2A) ──
  /** يسجّل نشاط تحصيل منجزاً (+ إجراء تالٍ مجدول اختياري) في معاملة SQL واحدة. */
  logCollectionActivity: async (params: {
    companyId: string;
    partyId: string;
    activityType: string;
    subject: string;
    outcome?: string | null | undefined;
    notes?: string | null | undefined;
    nextActionDate?: string | null | undefined;
    priority?: string | undefined;
  }): Promise<CollectionActivityRecord> => {
    const { data, error } = await supabase.rpc('log_collection_activity', {
      p_company_id: params.companyId,
      p_party_id: params.partyId,
      p_activity_type: params.activityType,
      p_subject: params.subject,
      ...(params.outcome != null ? { p_outcome: params.outcome } : {}),
      ...(params.notes != null ? { p_notes: params.notes } : {}),
      ...(params.nextActionDate != null ? { p_next_action_date: params.nextActionDate } : {}),
      ...(params.priority != null ? { p_priority: params.priority } : {}),
    });
    if (error) throw error;
    if (data.length === 0) throw new Error('تعذر تسجيل نشاط التحصيل');
    return data[0];
  },

  /** الخط الزمني لآخر أنشطة الطرف — يتحلل بصمت على قاعدة بلا RPC جديد. */
  getPartyTimeline: async (
    companyId: string,
    partyId: string,
    limit = 20
  ): Promise<PartyTimelineEntry[]> => {
    const { data, error } = await supabase.rpc('get_party_collection_timeline', {
      p_company_id: companyId,
      p_party_id: partyId,
      p_limit: limit,
    });
    if (error) {
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) {
        logger.warn('DebtAPI', 'get_party_collection_timeline RPC not found on server', {
          companyId,
        });
        return [];
      }
      throw error;
    }
    return data ?? [];
  },

  // ── Scheduled follow-up actions (S1) ──
  /**
   * الإجراءات المجدولة المعلّقة (customer_activities.pending) — قراءة فقط.
   * تُغلق فجوة «الكتابة بلا قارئ»: log_collection_activity يُنشئ إجراءً تالياً
   * لم تكن أي شاشة تعرضه. تتحلل بصمت على قاعدة بلا الدالة الجديدة.
   */
  getFollowupActions: async (
    companyId: string,
    branchId?: string | null,
    limit = 50
  ): Promise<DebtFollowupAction[]> => {
    const { data, error } = await supabase.rpc('get_debt_followup_actions', {
      p_company_id: companyId,
      p_limit: limit,
      ...(branchId !== undefined ? { p_branch_id: branchId } : {}),
    });
    if (error) {
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) {
        logger.warn('DebtAPI', 'get_debt_followup_actions RPC not found on server', {
          companyId,
        });
        return [];
      }
      throw error;
    }
    return data ?? [];
  },

  // ── Work queue & collector assignment (S2) ──
  /**
   * طابور المهام الموحّد: كل الالتزامات المستحقة والقريبة (فواتير، وعود،
   * إجراءات مجدولة، ديون حرجة، رسائل فاشلة) مع المسؤول ومرحلة التصعيد.
   * collectorId = «عملائي» فقط.
   */
  getTaskQueue: async (
    companyId: string,
    options: {
      branchId?: string | null;
      collectorId?: string | null;
      windowDays?: number;
      limit?: number;
    } = {}
  ): Promise<DebtTaskQueueRow[]> => {
    const { data, error } = await supabase.rpc('get_debt_task_queue', {
      p_company_id: companyId,
      p_limit: options.limit ?? 200,
      p_window_days: options.windowDays ?? 7,
      ...(options.branchId != null ? { p_branch_id: options.branchId } : {}),
      ...(options.collectorId != null ? { p_collector_id: options.collectorId } : {}),
    });
    if (error) {
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) {
        logger.warn('DebtAPI', 'get_debt_task_queue RPC not found on server', { companyId });
        return [];
      }
      throw error;
    }
    return data ?? [];
  },

  /** أعضاء المنشأة القابلون للإسناد (قائمة المحصّلين). */
  getCollectors: async (companyId: string): Promise<DebtCollector[]> => {
    const { data, error } = await supabase.rpc('get_debt_collectors', {
      p_company_id: companyId,
    });
    if (error) {
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) {
        logger.warn('DebtAPI', 'get_debt_collectors RPC not found on server', { companyId });
        return [];
      }
      throw error;
    }
    return data ?? [];
  },

  /** إتمام مهمة مجدولة (+ إجراء تالٍ اختياري) — idempotent على الخادم. */
  completeTask: async (params: {
    activityId: string;
    outcome?: string | null;
    notes?: string | null;
    nextActionDate?: string | null;
  }): Promise<CompleteDebtTaskResult> => {
    const { data, error } = await supabase.rpc('complete_debt_task', {
      p_activity_id: params.activityId,
      ...(params.outcome != null ? { p_outcome: params.outcome } : {}),
      ...(params.notes != null ? { p_notes: params.notes } : {}),
      ...(params.nextActionDate != null ? { p_next_action_date: params.nextActionDate } : {}),
    });
    if (error) throw error;
    if (data.length === 0) throw new Error('تعذر إتمام المهمة');
    return data[0];
  },

  /**
   * إسناد مجموعة عملاء لمحصّل (collectorId = null يعني إلغاء الإسناد).
   * يعيد عدد الصفوف المتأثرة.
   */
  assignParties: async (params: {
    companyId: string;
    partyIds: string[];
    collectorId: string | null;
    priority?: string;
    notes?: string | null;
  }): Promise<number> => {
    const { data, error } = await supabase.rpc('assign_debt_parties', {
      p_company_id: params.companyId,
      p_party_ids: params.partyIds,
      ...(params.collectorId != null ? { p_collector_id: params.collectorId } : {}),
      ...(params.priority != null ? { p_priority: params.priority } : {}),
      ...(params.notes != null ? { p_notes: params.notes } : {}),
    });
    if (error) throw error;
    return data ?? 0;
  },

  // ── Template library (S3-prep) ──
  /** يستورد المكتبة القياسية للقوالب — idempotent، ويعيد عدد القوالب المُدرَجة. */
  seedDefaultTemplates: async (companyId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('seed_default_debt_templates', {
      p_company_id: companyId,
    });
    if (error) throw error;
    return data ?? 0;
  },

  // ── Outbound queue & channel configuration (S3) ──
  /** طابور الإرسال (S3) — للمراقبة في صفحة الرسائل. */
  getReminderQueue: async (
    companyId: string,
    status?: string,
    limit = 100
  ): Promise<DebtReminderQueueRow[]> => {
    const { data, error } = await supabase.rpc('get_debt_reminder_queue', {
      p_company_id: companyId,
      p_limit: limit,
      ...(status != null && status !== '' ? { p_status: status } : {}),
    });
    if (error) {
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) {
        return [];
      }
      throw error;
    }
    return data ?? [];
  },

  /** إعدادات قنوات الإرسال (messaging_config) بصيغة مسطّحة. */
  getChannelConfig: async (companyId: string): Promise<DebtChannelConfig> => {
    const { data, error } = await supabase
      .from('messaging_config')
      .select(
        'whatsapp_enabled, whatsapp_api_url, whatsapp_api_key, whatsapp_phone, sms_enabled, sms_api_url, sms_api_key, sms_sender_id'
      )
      .eq('company_id', companyId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return EMPTY_CHANNEL_CONFIG;
    // المفاتيح تُقرأ من الخادم للتعرّف على وجودها فقط ثم تُسقَط فوراً:
    // لا تصل إلى الـ DOM ولا إلى حالة الواجهة (write-only secrets).
    return {
      whatsapp_enabled: Boolean(data.whatsapp_enabled),
      whatsapp_api_url: data.whatsapp_api_url ?? '',
      whatsapp_phone: data.whatsapp_phone ?? '',
      has_whatsapp_key: Boolean(data.whatsapp_api_key),
      sms_enabled: Boolean(data.sms_enabled),
      sms_api_url: data.sms_api_url ?? '',
      sms_sender_id: data.sms_sender_id ?? '',
      has_sms_key: Boolean(data.sms_api_key),
    };
  },

  /** يحدّث إعدادات القنوات (تحديث أولاً ثم إدراج عند عدم وجود صف). */
  updateChannelConfig: async (companyId: string, patch: DebtChannelConfigPatch): Promise<void> => {
    type MessagingConfigUpdate = Database['public']['Tables']['messaging_config']['Update'];
    const updatePayload: MessagingConfigUpdate = {};
    if (patch.whatsapp_enabled !== undefined)
      updatePayload.whatsapp_enabled = patch.whatsapp_enabled;
    if (patch.whatsapp_api_url !== undefined)
      updatePayload.whatsapp_api_url = patch.whatsapp_api_url;
    // سرّ write-only: القيمة الفارغة أو الغائبة لا تمسح المفتاح المحفوظ
    if (patch.whatsapp_api_key) updatePayload.whatsapp_api_key = patch.whatsapp_api_key;
    if (patch.whatsapp_phone !== undefined) updatePayload.whatsapp_phone = patch.whatsapp_phone;
    if (patch.sms_enabled !== undefined) updatePayload.sms_enabled = patch.sms_enabled;
    if (patch.sms_api_url !== undefined) updatePayload.sms_api_url = patch.sms_api_url;
    // سرّ write-only: القيمة الفارغة أو الغائبة لا تمسح المفتاح المحفوظ
    if (patch.sms_api_key) updatePayload.sms_api_key = patch.sms_api_key;
    if (patch.sms_sender_id !== undefined) updatePayload.sms_sender_id = patch.sms_sender_id;

    const { data: updated, error } = await supabase
      .from('messaging_config')
      .update(updatePayload)
      .eq('company_id', companyId)
      .select('id');
    if (error) throw error;
    if ((updated ?? []).length > 0) return;
    const { error: insertError } = await supabase
      .from('messaging_config')
      .insert({ company_id: companyId, ...updatePayload });
    if (insertError) throw insertError;
  },

  // ── Opening balances (legacy debts) ──
  getOpeningBalances: async (
    companyId: string,
    partyId?: string
  ): Promise<PartyOpeningBalance[]> => {
    let query = supabase.from('party_opening_balances').select('*').eq('company_id', companyId);
    if (partyId) query = query.eq('party_id', partyId);
    const { data, error } = await query.order('entry_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  upsertOpeningBalance: async (
    payload: PartyOpeningBalanceInsert
  ): Promise<PartyOpeningBalance> => {
    const { data, error } = await supabase
      .from('party_opening_balances')
      .upsert(payload, { onConflict: 'company_id,party_id,currency_code' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
