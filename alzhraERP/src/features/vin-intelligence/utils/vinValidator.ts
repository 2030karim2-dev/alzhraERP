/**
 * VIN Validation Utility
 * Enforces international VIN standards (ISO 3779 subset):
 * - 11-17 characters long (NHTSA + GCC/JDM variants)
 * - Only alphanumeric (A-Z, 0-9)
 * - Excludes the letters I, O, and Q
 *
 * SINGLE SOURCE OF TRUTH — mirrors the vin-decode Edge Function.
 */

export interface VinValidationResult {
  isValid: boolean;
  normalizedVin: string;
  error?: 'INVALID_LENGTH' | 'INVALID_CHARACTERS' | 'EMPTY_INPUT';
}

/** Valid VIN length range accepted by the decoder (GCC/JDM codes can be shorter) */
export const MIN_VIN_LENGTH = 11;
export const MAX_VIN_LENGTH = 17;

export function validateVin(input: string | null | undefined): VinValidationResult {
  if (!input || input.trim().length === 0) {
    return { isValid: false, normalizedVin: '', error: 'EMPTY_INPUT' };
  }

  // 1. Normalize: strip whitespace, hyphens, convert to uppercase
  const normalized = input.replace(/[\s\-]/g, '').toUpperCase();

  // 2. Length check (11-17 chars)
  if (normalized.length < MIN_VIN_LENGTH || normalized.length > MAX_VIN_LENGTH) {
    return { isValid: false, normalizedVin: normalized, error: 'INVALID_LENGTH' };
  }

  // 3. Character check: only A-Z, 0-9, excludes I, O, Q
  if (!new RegExp(`^[A-HJ-NPR-Z0-9]{${normalized.length}}$`).test(normalized)) {
    return { isValid: false, normalizedVin: normalized, error: 'INVALID_CHARACTERS' };
  }

  return { isValid: true, normalizedVin: normalized };
}
