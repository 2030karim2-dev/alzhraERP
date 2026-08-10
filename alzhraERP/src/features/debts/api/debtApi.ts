import { supabase } from '@/lib/supabaseClient';
import { parseError } from '@/core/utils/errorUtils';
import type {
  PartyBalanceByCurrency,
  PartyOpeningBalanceInsert,
  PaymentPromise,
  PaymentPromiseInsert,
  PaymentPromiseUpdate,
  FollowupConfig,
  FollowUpDashboardRow,
  TodayTask,
  DebtAnalyticsSummary,
  MessageTemplate,
  MessageTemplateInsert,
  MessageLog,
  MessageLogInsert,
} from '@/core/database/types/debt.types';

export const debtApi = {
  getPartyBalances: async (companyId: string, partyId: string) => {
    const { data, error } = await supabase
      .rpc('get_party_all_balances', { p_company_id: companyId, p_party_id: partyId });
    if (error) throw parseError(error);
    return (data || []) as PartyBalanceByCurrency[];
  },

  getPartyBalanceByCurrency: async (companyId: string, partyId: string, currencyCode: string) => {
    const { data, error } = await supabase
      .rpc('get_party_balance_by_currency', { p_company_id: companyId, p_party_id: partyId, p_currency_code: currencyCode });
    if (error) throw parseError(error);
    return (data || []) as PartyBalanceByCurrency[];
  },

  getOpeningBalances: async (companyId: string, partyId?: string) => {
    let query = supabase.from('party_opening_balances').select('*').eq('company_id', companyId);
    if (partyId) query = query.eq('party_id', partyId);
    const { data, error } = await query.order('entry_date', { ascending: false });
    if (error) throw parseError(error);
    return (data || []) as PartyOpeningBalance[];
  },

  upsertOpeningBalance: async (payload: PartyOpeningBalanceInsert) => {
    const { data, error } = await supabase
      .from('party_opening_balances').upsert(payload, { onConflict: 'company_id,party_id,currency_code' }).select().single();
    if (error) throw parseError(error);
    return data as PartyOpeningBalance;
  },

  getPromises: async (companyId: string, filters?: { partyId?: string; status?: string }) => {
    let query = supabase.from('debt_payment_promises').select('*').eq('company_id', companyId);
    if (filters?.partyId) query = query.eq('party_id', filters.partyId);
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('promise_date', { ascending: true });
    if (error) throw parseError(error);
    return (data || []) as PaymentPromise[];
  },

  createPromise: async (payload: PaymentPromiseInsert) => {
    const { data, error } = await supabase.from('debt_payment_promises').insert(payload).select().single();
    if (error) throw parseError(error);
    return data as PaymentPromise;
  },

  updatePromise: async (id: string, payload: PaymentPromiseUpdate) => {
    const { data, error } = await supabase.from('debt_payment_promises').update(payload).eq('id', id).select().single();
    if (error) throw parseError(error);
    return data as PaymentPromise;
  },

  getFollowupConfig: async (companyId: string) => {
    const { data, error } = await supabase.from('debt_followup_config').select('*').eq('company_id', companyId).maybeSingle();
    if (error) throw parseError(error);
    return data as FollowupConfig | null;
  },

  upsertFollowupConfig: async (companyId: string, config: Partial<FollowupConfig>) => {
    const { data, error } = await supabase.from('debt_followup_config')
      .upsert({ company_id: companyId, ...config }, { onConflict: 'company_id' }).select().single();
    if (error) throw parseError(error);
    return data as FollowupConfig;
  },

  getFollowUpDashboard: async (companyId: string, dueSoonDays = 7, criticalDays = 30) => {
    const { data, error } = await supabase
      .rpc('get_debt_followup_dashboard', { p_company_id: companyId, p_due_soon_days: dueSoonDays, p_critical_days: criticalDays });
    if (error) throw parseError(error);
    return (data || []) as FollowUpDashboardRow[];
  },

  getTodayTasks: async (companyId: string) => {
    const { data, error } = await supabase.rpc('get_debt_today_tasks', { p_company_id: companyId });
    if (error) throw parseError(error);
    return (data || []) as TodayTask[];
  },

  getDebtAnalytics: async (companyId: string) => {
    const { data, error } = await supabase.rpc('get_debt_analytics_summary', { p_company_id: companyId });
    if (error) throw parseError(error);
    return data as DebtAnalyticsSummary;
  },

  getMessageTemplates: async (companyId: string) => {
    const { data, error } = await supabase.from('debt_message_templates').select('*').eq('company_id', companyId).eq('is_active', true);
    if (error) throw parseError(error);
    return (data || []) as MessageTemplate[];
  },

  getOutbox: async (companyId: string, status?: string) => {
    let query = supabase.from('debt_message_log').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw parseError(error);
    return (data || []) as MessageLog[];
  },

  createMessage: async (payload: MessageLogInsert) => {
    const { data, error } = await supabase.from('debt_message_log').insert(payload).select().single();
    if (error) throw parseError(error);
    return data as MessageLog;
  },

  updateMessageStatus: async (id: string, status: string, errorInfo?: string) => {
    const update: Record<string, unknown> = { status };
    if (status === 'sent') update.sent_at = new Date().toISOString();
    if (errorInfo) update.error_info = errorInfo;
    const { error } = await supabase.from('debt_message_log').update(update).eq('id', id);
    if (error) throw parseError(error);
  },

  getPartyStatement: async (companyId: string, partyId: string, currencyCode?: string) => {
    const { data, error } = await supabase
      .rpc('get_party_statement', { p_company_id: companyId, p_party_id: partyId });
    if (error) throw parseError(error);
    const rows = ((data as any[]) || []).map((m: any) => ({
      id: m.line_id || m.id,
      date: m.entry_date || m.date,
      ref: m.ref || '',
      desc: m.description || m.desc || '',
      debit: Number(m.debit) || 0,
      credit: Number(m.credit) || 0,
      currency: m.currency || '',
      balance: Number(m.balance) || 0,
      operation_type: m.operation_type || '',
    }));
    if (currencyCode) return rows.filter((r: any) => r.currency === currencyCode);
    return rows;
  },

  getPartyInfo: async (companyId: string, partyId: string) => {
    const { data, error } = await supabase.from('parties')
      .select('name, phone, credit_limit').eq('company_id', companyId).eq('id', partyId).single();
    if (error) throw parseError(error);
    return data as { name: string; phone: string | null; credit_limit: number | null };
  },

  getCustomerActivities: async (companyId: string, customerId: string) => {
    const { data, error } = await supabase.from('customer_activities')
      .select('*').eq('company_id', companyId).eq('customer_id', customerId)
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw parseError(error);
    return (data || []) as Array<{
      id: string; activity_type: string; subject: string; description?: string;
      status?: string; priority?: string; scheduled_at?: string; completed_at?: string;
      created_at: string; created_by?: string;
    }>;
  },
};
