/**
 * Debt & Collection module — feature types.
 * Single source of truth: generated types in core/database.types.ts.
 */
import type { Database } from '../../../core/database.types';

// ── Table row types ───────────────────────────────────────────
export type DebtFollowupConfig = Database['public']['Tables']['debt_followup_config']['Row'];
export type DebtFollowupConfigUpdate = Database['public']['Tables']['debt_followup_config']['Update'];

export type PaymentPromise = Database['public']['Tables']['debt_payment_promises']['Row'];
export type PaymentPromiseInsert = Database['public']['Tables']['debt_payment_promises']['Insert'];
export type PaymentPromiseUpdate = Database['public']['Tables']['debt_payment_promises']['Update'];

export type DebtMessageTemplate = Database['public']['Tables']['debt_message_templates']['Row'];
export type DebtMessageTemplateInsert = Database['public']['Tables']['debt_message_templates']['Insert'];
export type DebtMessageTemplateUpdate = Database['public']['Tables']['debt_message_templates']['Update'];

export type DebtMessageLog = Database['public']['Tables']['debt_message_log']['Row'];

export type PartyOpeningBalance = Database['public']['Tables']['party_opening_balances']['Row'];
export type PartyOpeningBalanceInsert = Database['public']['Tables']['party_opening_balances']['Insert'];

// ── RPC return shapes ─────────────────────────────────────────
type DashboardGenerated = Database['public']['Functions']['get_debt_followup_dashboard']['Returns'][number];

/**
 * Follow-up dashboard row with HONEST nullability.
 * The generated types mark columns like party_phone / oldest_due_date as
 * non-null, but the RPC intentionally returns NULL when no due date exists.
 */
export type FollowUpDashboardRow = Omit<
  DashboardGenerated,
  | 'oldest_due_date'
  | 'next_due_date'
  | 'party_phone'
  | 'credit_limit'
  | 'pending_promise_date'
  | 'last_reminded_at'
  | 'last_contact_date'
> & {
  oldest_due_date: string | null;
  next_due_date: string | null;
  party_phone: string | null;
  credit_limit: number | null;
  pending_promise_date: string | null;
  last_reminded_at: string | null;
  last_contact_date: string | null;
};

export type TodayTask = Database['public']['Functions']['get_debt_today_tasks']['Returns'][number];
export type PartyDebtOverview = Database['public']['Functions']['get_debt_party_overview']['Returns'][number];
export type PartyBalanceByCurrency = Database['public']['Functions']['get_party_all_balances']['Returns'][number];
export type ReminderRecord = Database['public']['Functions']['record_debt_reminder']['Returns'][number];

/** get_debt_analytics_summary returns Json — typed here for display. */
export interface DebtAnalytics {
  total_receivables: number;
  overdue_receivables: number;
  due_today: number;
  opening_balances_total: number;
  pending_promises: number;
  pending_promises_amount: number;
  broken_promises: number;
  broken_promises_amount: number;
  sent_messages: number;
  failed_messages: number;
  failed_messages_24h: number;
  total_debtors: number;
  needs_reminder: number;
  by_currency: Array<{ currency: string; balance: number; count: number }> | null;
}

/** Payment promise joined with the party display name. */
export interface PaymentPromiseWithParty extends PaymentPromise {
  parties?: { name: string; phone: string | null } | null;
}

/** Message log row joined with the party display name. */
export interface DebtMessageLogWithParty extends DebtMessageLog {
  parties?: { name: string; phone: string | null } | null;
}

// ── Feature enums ─────────────────────────────────────────────
export type FollowUpClassification = 'current' | 'due_soon' | 'due_today' | 'overdue' | 'critical';
export type ReminderStatus = 'needs_reminder' | 'reminded';
export type PromiseStatus = 'pending' | 'completed' | 'broken' | 'cancelled';

/** Follow-up tab identifiers (mirror of the SQL classification + message state). */
export type FollowUpTab =
  | 'all'
  | 'needs_reminder'
  | 'reminded'
  | 'overdue'
  | 'today';
