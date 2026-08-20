/**
 * Debt & Collection module — API layer.
 * Architecture: Component → Hook → Service → API → Supabase.
 * All Supabase calls live here. Errors are re-thrown as PostgrestError
 * (an Error subclass) and surfaced to the user by the hooks layer.
 */
import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
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
} from '../types';

/** Engine defaults — also the migration defaults; kept in sync. */
export const DEBT_ENGINE_DEFAULTS = {
  dueSoonDays: 7,
  criticalDays: 30,
  reminderWindowDays: 3,
} as const;

export const debtApi = {
  // ── Follow-up engine (RPCs — server-classified, display only) ──
  getDashboard: async (companyId: string): Promise<FollowUpDashboardRow[]> => {
    const { data, error } = await supabase.rpc('get_debt_followup_dashboard', {
      p_company_id: companyId,
      p_due_soon_days: DEBT_ENGINE_DEFAULTS.dueSoonDays,
      p_critical_days: DEBT_ENGINE_DEFAULTS.criticalDays,
      p_reminder_window_days: DEBT_ENGINE_DEFAULTS.reminderWindowDays,
    });
    if (error) throw error;
    return data;
  },

  getAnalytics: async (companyId: string): Promise<Record<string, unknown> | null> => {
    const { data, error } = await supabase.rpc('get_debt_analytics_summary', {
      p_company_id: companyId,
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

  getTodayTasks: async (companyId: string): Promise<TodayTask[]> => {
    const { data, error } = await supabase.rpc('get_debt_today_tasks', {
      p_company_id: companyId,
    });
    if (error) {
      // The RPC is created by the debt module migrations (20260819000002 /
      // 20260823000001). Until it exists on the server, degrade gracefully
      // (return []) instead of throwing — throwing makes TanStack Query retry
      // and spam 400s.
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) {
        logger.warn('DebtAPI', 'get_debt_today_tasks RPC not found on server — apply migration 20260814000006', { companyId });
        return [];
      }
      throw error;
    }
    return data ?? [];
  },

  getPartyOverview: async (companyId: string, partyId: string): Promise<PartyDebtOverview | null> => {
    const { data, error } = await supabase.rpc('get_debt_party_overview', {
      p_company_id: companyId,
      p_party_id: partyId,
    });
    if (error) throw error;
    return data.length > 0 ? data[0] : null;
  },

  getPartyBalances: async (companyId: string, partyId: string): Promise<PartyBalanceByCurrency[]> => {
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
    filters?: { partyId?: string; status?: string }
  ): Promise<PaymentPromiseWithParty[]> => {
    let query = supabase
      .from('debt_payment_promises')
      .select('*, parties(name, phone)')
      .eq('company_id', companyId)
      .order('promise_date', { ascending: true });
    if (filters?.partyId != null) query = query.eq('party_id', filters.partyId);
    if (filters?.status != null) query = query.eq('status', filters.status);
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

  updatePromise: async (id: string, payload: PaymentPromiseUpdate): Promise<PaymentPromise> => {
    const { data, error } = await supabase
      .from('debt_payment_promises')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deletePromise: async (id: string): Promise<void> => {
    const { error } = await supabase.from('debt_payment_promises').delete().eq('id', id);
    if (error) throw error;
  },

  breakOverduePromises: async (companyId: string): Promise<string[]> => {
    const { data, error } = await supabase.rpc('break_overdue_promises', {
      p_company_id: companyId,
    });
    if (error) throw error;
    return data;
  },

  completePromise: async (companyId: string, promiseId: string, paymentId?: string): Promise<void> => {
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
    let query = supabase
      .from('debt_message_templates')
      .select('*')
      .eq('company_id', companyId);
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
    id: string,
    payload: DebtMessageTemplateUpdate
  ): Promise<DebtMessageTemplate> => {
    const { data, error } = await supabase
      .from('debt_message_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    const { error } = await supabase.from('debt_message_templates').delete().eq('id', id);
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
    });
    if (error) throw error;
    if (data.length === 0) throw new Error('تعذر تسجيل التذكير');
    return data[0];
  },

  // ── Opening balances (legacy debts) ──
  getOpeningBalances: async (companyId: string, partyId?: string): Promise<PartyOpeningBalance[]> => {
    let query = supabase
      .from('party_opening_balances')
      .select('*')
      .eq('company_id', companyId);
    if (partyId) query = query.eq('party_id', partyId);
    const { data, error } = await query.order('entry_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  upsertOpeningBalance: async (payload: PartyOpeningBalanceInsert): Promise<PartyOpeningBalance> => {
    const { data, error } = await supabase
      .from('party_opening_balances')
      .upsert(payload, { onConflict: 'company_id,party_id,currency_code' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

