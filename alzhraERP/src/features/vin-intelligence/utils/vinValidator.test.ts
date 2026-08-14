import { describe, it, expect } from 'vitest';
import { validateVin, isValidVinCheckDigit, MIN_VIN_LENGTH, MAX_VIN_LENGTH } from './vinValidator';

describe('validateVin', () => {
  it('accepts a valid 17-char VIN', () => {
    const r = validateVin('JTDBR32E100001234');
    expect(r.isValid).toBe(true);
    expect(r.normalizedVin).toBe('JTDBR32E100001234');
  });

  it('normalizes lowercase, spaces and hyphens', () => {
    const r = validateVin('  jtd-br32e 100001234 ');
    expect(r.isValid).toBe(true);
    expect(r.normalizedVin).toBe('JTDBR32E100001234');
  });

  it('rejects empty / null / undefined input', () => {
    expect(validateVin('').error).toBe('EMPTY_INPUT');
    expect(validateVin('   ').error).toBe('EMPTY_INPUT');
    expect(validateVin(null).error).toBe('EMPTY_INPUT');
    expect(validateVin(undefined).error).toBe('EMPTY_INPUT');
  });

  it('rejects VINs shorter than 11 chars', () => {
    expect(validateVin('ABC123').error).toBe('INVALID_LENGTH');
  });

  it('rejects VINs longer than 17 chars', () => {
    expect(validateVin('ABC123XYZ789012345678').error).toBe('INVALID_LENGTH');
  });

  it('rejects the forbidden letters I, O, Q', () => {
    expect(validateVin('JTDBRI2E100001234').error).toBe('INVALID_CHARACTERS');
    expect(validateVin('JTDBRO2E100001234').error).toBe('INVALID_CHARACTERS');
    expect(validateVin('JTDBRQ2E100001234').error).toBe('INVALID_CHARACTERS');
  });

  it('accepts 11-char GCC/JDM VINs', () => {
    expect(validateVin('JN1CA21DXTK').isValid).toBe(true);
  });

  it('exposes the length range constants', () => {
    expect(MIN_VIN_LENGTH).toBe(11);
    expect(MAX_VIN_LENGTH).toBe(17);
  });

  it('verifies the ISO 3779 check digit for 17-char VINs', () => {
    expect(isValidVinCheckDigit('1M8GDM9AXKP042788')).toBe(true); // X is the correct check digit
    expect(isValidVinCheckDigit('1M8GDM9A0KP042788')).toBe(false); // 0 is wrong
  });

  it('skips check digit for non-17-char VINs', () => {
    expect(isValidVinCheckDigit('JN1CA21DXTK')).toBe(true); // 11-char: no check digit
  });

  it('surfaces checkDigitValid only for 17-char VINs', () => {
    expect(validateVin('1M8GDM9AXKP042788').checkDigitValid).toBe(true);
    expect(validateVin('1M8GDM9A0KP042788').checkDigitValid).toBe(false);
    expect(validateVin('JN1CA21DXTK').checkDigitValid).toBeUndefined();
  });
});
