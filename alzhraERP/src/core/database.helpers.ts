
import { Database } from './database.types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
// export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type InsertDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Helper to extract Row type safely
export type DbRow<T extends keyof Database['public']['Tables']> = Tables<T>;

// Common Entity Status Enum Helper (if used across tables)
export type EntityStatus = 'active' | 'inactive' | 'deleted' | 'archived';
