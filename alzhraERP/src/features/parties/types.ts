
import { Database } from '../../core/database.types';

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
  totalCount: number;
  totalBalance: number;
  activeCount: number;
  blockedCount: number;
}

export interface PartyCategory {
  id: string;
  name: string;
  type: PartyType;
  count?: number; // Optional for UI display
}
