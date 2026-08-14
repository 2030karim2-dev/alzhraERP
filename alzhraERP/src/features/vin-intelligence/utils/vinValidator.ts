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

  const checkDigitValid = normalized.length === 17 ? isValidVinCheckDigit(normalized) : undefined;
  return { isValid: true, normalizedVin: normalized, checkDigitValid };
}

/** ISO 3779 transliteration table for the check digit (I, O, Q excluded). */
const CHECK_DIGIT_MAP: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5,
  P: 7,
  R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

const CHECK_DIGIT_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Verifies the ISO 3779 check digit (position 9) of a 17-character VIN.
 * Returns true for non-17-char VINs (GCC/JDM variants have no check digit).
 */
export function isValidVinCheckDigit(vin: string): boolean {
  const normalized = vin.replace(/[\s-]/g, '').toUpperCase();
  if (normalized.length !== 17) return true;

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = normalized[i];
    const value = c >= '0' && c <= '9' ? c.charCodeAt(0) - 48 : (CHECK_DIGIT_MAP[c] ?? 0);
    sum += value * CHECK_DIGIT_WEIGHTS[i];
  }

  const expected = sum % 11;
  const checkChar = normalized[8];
  return expected === 10 ? checkChar === 'X' : checkChar === String(expected);
}
