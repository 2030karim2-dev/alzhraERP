/**
 * Core Database Types Barrel File
 * 
 * Centralized exports for domain-specific database types mapped from 
 * the auto-generated Supabase database.types.ts file.
 * 
 * Importing from this barrel avoids coupling UI/Domain logic with 
 * deeply nested Supabase types (e.g. Database['public']['Tables']['...']['Row']).
 */

export * from './common.types';
export * from './inventory.types';
export * from './sales.types';
export * from './accounting.types';
export * from './auth.types';
