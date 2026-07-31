import { Database } from '../../database.types';

export type Tables = Database['public']['Tables'];
export type Views = Database['public']['Views'];
export type Enums = Database['public']['Enums'];

/**
 * Extracts the Row type for a given table
 */
export type TableRow<T extends keyof Tables> = Tables[T]['Row'];

/**
 * Extracts the Insert type for a given table
 */
export type TableInsert<T extends keyof Tables> = Tables[T]['Insert'];

/**
 * Extracts the Update type for a given table
 */
export type TableUpdate<T extends keyof Tables> = Tables[T]['Update'];

/**
 * Common shared properties across most tables
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
  company_id: string;
}
