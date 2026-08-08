/**
 * VIN Validation Utility
 * Enforces international VIN standards:
 * - Exactly 17 characters long
 * - Only alphanumeric characters (A-Z, 0-9)
 * - Excludes the letters I, O, and Q
 */

export interface VinValidationResult {
  isValid: boolean;
  normalizedVin: string;
  error?: 'INVALID_LENGTH' | 'INVALID_CHARACTERS' | 'EMPTY_INPUT';
}

export function validateVin(input: string | null | undefined): VinValidationResult {
  if (!input) {
    return { isValid: false, normalizedVin: '', error: 'EMPTY_INPUT' };
  }

  // 1. Normalize: Strip whitespace, hyphens, and convert to uppercase
  const normalized = input.replace(/[\s\-]/g, '').toUpperCase();

  // 2. Length check
  if (normalized.length !== 17) {
    return { isValid: false, normalizedVin: normalized, error: 'INVALID_LENGTH' };
  }

  // 3. Character check: Only A-Z, 0-9, and excludes I, O, Q
  // The regex ^[A-HJ-NPR-Z0-9]{17}$ strictly matches valid VIN characters.
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) {
    return { isValid: false, normalizedVin: normalized, error: 'INVALID_CHARACTERS' };
  }

  return { isValid: true, normalizedVin: normalized };
}
