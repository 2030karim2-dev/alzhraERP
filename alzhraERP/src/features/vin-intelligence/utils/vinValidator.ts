/**
 * VIN Validation Utility
 * Enforces international VIN standards:
 * - 11-17 characters long (compatible with NHTSA, GCC, and JDM codes)
 * - Only alphanumeric characters (A-Z, 0-9)
 * - Excludes the letters I, O, and Q
 *
 * SINGLE SOURCE OF TRUTH — used by both client (VINSearch) and server (Edge Function).
 */

export interface VinValidationResult {
  isValid: boolean;
  normalizedVin: string;
  error?: 'INVALID_LENGTH' | 'INVALID_CHARACTERS' | 'EMPTY_INPUT';
}

/** Valid VIN lengths accepted by the NHTSA decoder and GCC/JDM variants */
export const VALID_VIN_LENGTHS: readonly number[] = [11, 12, 13, 17] as const;

export function validateVin(input: string | null | undefined): VinValidationResult {
  if (!input || input.trim().length === 0) {
    return { isValid: false, normalizedVin: '', error: 'EMPTY_INPUT' };
  }

  // 1. Normalize: Strip whitespace, hyphens, and convert to uppercase
  const normalized = input.replace(/[\s\-]/g, '').toUpperCase();

  // 2. Length check (11-17 chars — GCC/JDM codes can be shorter)
  if (!VALID_VIN_LENGTHS.includes(normalized.length)) {
    return { isValid: false, normalizedVin: normalized, error: 'INVALID_LENGTH' };
  }

  // 3. Character check: Only A-Z, 0-9, and excludes I, O, Q
  // Construct regex dynamically to match the actual length
  if (!new RegExp(`^[A-HJ-NPR-Z0-9]{${normalized.length}}$`).test(normalized)) {
    return { isValid: false, normalizedVin: normalized, error: 'INVALID_CHARACTERS' };
  }

  return { isValid: true, normalizedVin: normalized };
}
