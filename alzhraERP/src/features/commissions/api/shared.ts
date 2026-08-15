import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';

/** Supabase client reference shared across commission API modules. */
export const db = supabase;

/** Uniform error wrapper: logs the real error and throws a user-facing fallback. */
export function safeError(error: unknown, fallback: string): Error {
  const message = error instanceof Error ? error.message : fallback;
  logger.warn('commission-api', fallback, { message });
  return new Error(fallback);
}
