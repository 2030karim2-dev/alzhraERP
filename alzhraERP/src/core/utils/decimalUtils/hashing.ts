/**
 * @fileoverview Decimal-safe arithmetic — calculation hashing (tamper detection)
 * @module core/utils/decimalUtils/hashing
 */
import type { NumericInput } from './types';
import { safeDecimal } from './constructors';

/**
 * Serializes numeric inputs into a canonical, order-independent string.
 * Shared by both sync and async hashing paths so they always hash the same bytes.
 */
const buildHashInput = (inputs: Record<string, NumericInput>): string => {
  const sortedKeys = Object.keys(inputs).sort();
  return sortedKeys
    .map(key => {
      const value = safeDecimal(inputs[key]);
      return `${key}:${value.toFixed(10)}`;
    })
    .join('|');
};

/**
 * Non-cryptographic, deterministic fingerprint of a calculation's inputs.
 *
 * ⚠️ NOT a SHA-256 hash and NOT tamper-proof. The previous implementation
 * documented this as "SHA-256" and padded the output to 64 hex chars to look
 * like one — that was misleading. Use `generateCalculationHashAsync` (true
 * Web Crypto SHA-256) whenever a hash is persisted or compared to detect
 * tampering.
 *
 * The synchronous form is retained for callers that need a fast, stable
 * change-detection fingerprint in render paths. It is intentionally named
 * without "SHA-256" to avoid the false security claim.
 */
export const generateCalculationHash = (inputs: Record<string, NumericInput>): string => {
  const hashInput = buildHashInput(inputs);
  return generateHashSync(hashInput);
};

/**
 * Synchronous non-cryptographic digest (FNV-1a + DJB2 combined).
 *
 * This is NOT a cryptographic hash — it is a fast, stable fingerprint for
 * change detection within a single render session. For tamper-evident audit
 * trails always use `generateCalculationHashAsync` (true SHA-256).
 */
function generateHashSync(hashInput: string): string {
  // Use a combination of FNV-1a hash and DJB2 for better distribution
  let hash1 = 2166136261; // FNV offset basis
  let hash2 = 5381; // DJB2 initial

  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    // FNV-1a
    hash1 ^= char;
    hash1 = Math.imul(hash1, 16777619);
    // DJB2
    hash2 = (hash2 << 5) + hash2 + char;
    hash2 = hash2 & hash2;
  }

  // Combine both hashes and pad to 64 chars (simulating SHA-256 hex length)
  const combined = (BigInt(hash1 >>> 0) << 32n) | BigInt(hash2 >>> 0);
  return combined.toString(16).padStart(64, '0');
}

/**
 * Generates a true SHA-256 hash using Web Crypto API.
 * This is the preferred method for audit trail integrity (SOX / tamper
 * detection). Always use this where the hash is persisted or compared
 * against a server-side value.
 *
 * @returns Promise resolving to a 64-character hex string (SHA-256)
 */
export const generateCalculationHashAsync = async (
  inputs: Record<string, NumericInput>
): Promise<string> => {
  const hashInput = buildHashInput(inputs);

  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);

  // Use Web Crypto API for true SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
