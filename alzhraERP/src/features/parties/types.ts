import type { Database } from '../../core/database.types';

export type PartyType = 'customer' | 'supplier';
export type PartyStatus = 'active' | 'blocked';
export type PartyView = 'list' | 'statements' | 'categories';

export type Party = Database['public']['Tables']['parties']['Row'] & {
  category?: string;
  status?: PartyStatus;
  email?: string;
  tax_number?: string;
  address?: string;
  balance?: number;
  balances_by_currency?: Array<{ currency: string; balance: number; transaction_count?: number }>;
  portal_token?: string | null;
};

export interface PartyFormData {
  name: string;
  type: PartyType;
  phone?: string;
  email?: string;
  tax_number?: string;
  address?: string;
  status: PartyStatus;
  category?: string;
  category_id?: string | null;
}

export interface PartyStats {
  /** Total number of parties (active + blocked). */
  totalCount: number;
  /** Sum of `balance` across all parties, in the default currency. */
  totalBalance: number;
  /** Count of parties whose `status` is `active`. */
  activeCount: number;
  /** Count of parties whose `status` is `blocked`. */
  blockedCount: number;
  /** Breakdown of total balances by currency (e.g. SAR, YER). */
  byCurrency?: Array<{ currency: string; balance: number; count: number }>;
}

export interface PartyCategory {
  id: string;
  name: string;
  type: PartyType;
  count?: number; // Optional for UI display
}
