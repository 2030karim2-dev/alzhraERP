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
  /** Present for 17-char VINs: whether the ISO 3779 check digit is valid (non-blocking). */
  checkDigitValid?: boolean;
}

/** Valid VIN length range accepted by the decoder (GCC/JDM codes can be shorter) */
export const MIN_VIN_LENGTH = 11;
export const MAX_VIN_LENGTH = 17;

export function validateVin(input: string | null | undefined): VinValidationResult {
  if (input == null || input.trim().length === 0) {
    return { isValid: false, normalizedVin: '', error: 'EMPTY_INPUT' };
  }

  // 1. Normalize: strip whitespace, hyphens, convert to uppercase
  const normalized = input.replace(/[\s-]/g, '').toUpperCase();

  // 2. Length check (11-17 chars)
  if (normalized.length < MIN_VIN_LENGTH || normalized.length > MAX_VIN_LENGTH) {
    return { isValid: false, normalizedVin: normalized, error: 'INVALID_LENGTH' };
  }

  // 3. Character check: only A-Z, 0-9, excludes I, O, Q
  if (!/^[A-HJ-NPR-Z0-9]+$/.test(normalized)) {
    return { isValid: false, normalizedVin: normalized, error: 'INVALID_CHARACTERS' };
  }

  const checkDigitValid = normalized.length === 17 ? isValidVinCheckDigit(normalized) : undefined;
  return {
    isValid: true,
    normalizedVin: normalized,
    ...(checkDigitValid !== undefined ? { checkDigitValid } : {}),
  };
}

/** ISO 3779 transliteration table for the check digit (I, O, Q excluded). */
const CHECK_DIGIT_MAP = new Map<string, number>([
  ['A', 1],
  ['B', 2],
  ['C', 3],
  ['D', 4],
  ['E', 5],
  ['F', 6],
  ['G', 7],
  ['H', 8],
  ['J', 1],
  ['K', 2],
  ['L', 3],
  ['M', 4],
  ['N', 5],
  ['P', 7],
  ['R', 9],
  ['S', 2],
  ['T', 3],
  ['U', 4],
  ['V', 5],
  ['W', 6],
  ['X', 7],
  ['Y', 8],
  ['Z', 9],
]);

const CHECK_DIGIT_WEIGHTS = new Map<number, number>([
  [0, 8],
  [1, 7],
  [2, 6],
  [3, 5],
  [4, 4],
  [5, 3],
  [6, 2],
  [7, 10],
  [8, 0],
  [9, 9],
  [10, 8],
  [11, 7],
  [12, 6],
  [13, 5],
  [14, 4],
  [15, 3],
  [16, 2],
]);

/**
 * Verifies the ISO 3779 check digit (position 9) of a 17-character VIN.
 * Returns true for non-17-char VINs (GCC/JDM variants have no check digit).
 */
export function isValidVinCheckDigit(vin: string): boolean {
  const normalized = vin.replace(/[\s-]/g, '').toUpperCase();
  if (normalized.length !== 17) return true;

  let sum = 0;
  for (const [i, c] of Array.from(normalized).entries()) {
    const value = c >= '0' && c <= '9' ? c.charCodeAt(0) - 48 : (CHECK_DIGIT_MAP.get(c) ?? 0);
    sum += value * (CHECK_DIGIT_WEIGHTS.get(i) ?? 0);
  }

  const expected = sum % 11;
  const checkChar = normalized[8];
  return expected === 10 ? checkChar === 'X' : checkChar === String(expected);
}
