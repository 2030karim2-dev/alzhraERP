/**
 * Debt & Receivables - Feature Types
 * Re-exports from core database types for convenience.
 * Single source of truth: @/core/database/types/debt.types
 */
export type {
  PartyBalanceByCurrency,
  PartyOpeningBalance,
  PartyOpeningBalanceInsert,
  PaymentPromise,
  PaymentPromiseInsert,
  PaymentPromiseUpdate,
  FollowupConfig,
  FollowUpDashboardRow,
  TodayTask,
  DebtAnalyticsSummary as DebtAnalytics,
  MessageTemplate,
  MessageLog,
} from '@/core/database/types/debt.types';

// Feature-specific UI types
export type FollowUpClassification = 'current' | 'due_soon' | 'due_today' | 'overdue' | 'critical';

export interface CurrencyBalance {
  currency_code: string;
  balance: number;
  transaction_count: number;
  last_activity_date: string | null;
}

export interface DebtTab {
  id: string;
  labelKey: string;
}

