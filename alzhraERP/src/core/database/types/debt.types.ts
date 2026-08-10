// ============================================
// Debt & Receivables Module Types
// ============================================

// Party Opening Balances
export interface PartyOpeningBalance {
  id: string;
  company_id: string;
  party_id: string;
  currency_code: string;
  amount: number;
  direction: 'debit' | 'credit';
  entry_date: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PartyOpeningBalanceInsert {
  company_id: string;
  party_id: string;
  currency_code: string;
  amount: number;
  direction?: 'debit' | 'credit';
  entry_date?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
}

export interface PartyOpeningBalanceUpdate {
  amount?: number;
  direction?: 'debit' | 'credit';
  entry_date?: string;
  reference_number?: string;
  notes?: string;
}

// Party Balances By Currency (VIEW)
export interface PartyBalanceByCurrency {
  party_id: string;
  company_id: string;
  currency_code: string;
  balance: number;
  transaction_count: number;
  last_activity_date: string | null;
}

// Payment Promises
export interface PaymentPromise {
  id: string;
  company_id: string;
  party_id: string;
  amount: number;
  currency_code: string;
  promise_date: string;
  status: 'pending' | 'completed' | 'broken' | 'cancelled';
  reference_type?: 'invoice' | 'opening_balance' | 'manual';
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  completed_at?: string;
  cancelled_at?: string;
  updated_at: string;
}

export interface PaymentPromiseInsert {
  company_id: string;
  party_id: string;
  amount: number;
  currency_code: string;
  promise_date: string;
  status?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
}

export interface PaymentPromiseUpdate {
  amount?: number;
  promise_date?: string;
  status?: string;
  notes?: string;
  completed_at?: string;
  cancelled_at?: string;
}

// Follow-up Configuration
export interface FollowupConfig {
  id: string;
  company_id: string;
  due_soon_days: number;
  overdue_critical_days: number;
  auto_reminder_enabled: boolean;
  reminder_channels: string[];
  created_at: string;
  updated_at: string;
}

// Message Templates
export interface MessageTemplate {
  id: string;
  company_id: string;
  name: string;
  subject?: string;
  body: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'in_app';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplateInsert {
  company_id: string;
  name: string;
  body: string;
  subject?: string;
  channel?: string;
}

// Message Log / Outbox
export interface MessageLog {
  id: string;
  company_id: string;
  party_id: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'in_app';
  template_id?: string;
  message_text: string;
  status: 'draft' | 'queued' | 'sent' | 'failed' | 'cancelled';
  recipient?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  error_info?: string;
  created_by?: string;
  created_at: string;
  sent_at?: string;
}

export interface MessageLogInsert {
  company_id: string;
  party_id: string;
  channel: string;
  message_text: string;
  template_id?: string;
  status?: string;
  recipient?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

// Follow-up Dashboard Row (from RPC)
export interface FollowUpDashboardRow {
  party_id: string;
  party_name: string;
  party_phone: string | null;
  currency_code: string;
  outstanding_balance: number;
  overdue_balance: number;
  oldest_due_date: string | null;
  days_overdue: number;
  last_contact_date: string | null;
  has_broken_promise: boolean;
  promise_status: string | null;
  classification: 'current' | 'due_soon' | 'due_today' | 'overdue' | 'critical';
}

// Today's Task (from RPC)
export interface TodayTask {
  task_type: 'due_today' | 'promise_due' | 'broken_promise' | 'failed_message';
  party_id: string;
  party_name: string;
  party_phone: string | null;
  currency_code: string | null;
  amount: number | null;
  reference_info: string | null;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

// Debt Analytics Summary (from RPC)
export interface DebtAnalyticsSummary {
  total_receivables: number;
  total_payables: number;
  overdue_receivables: number;
  due_today: number;
  pending_promises: number;
  broken_promises: number;
  by_currency: Array<{
    currency: string;
    balance: number;
    count: number;
  }> | null;
}
