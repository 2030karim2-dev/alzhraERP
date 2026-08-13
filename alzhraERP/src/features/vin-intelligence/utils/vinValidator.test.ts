import { describe, it, expect } from 'vitest';
import { validateVin, MIN_VIN_LENGTH, MAX_VIN_LENGTH } from './vinValidator';

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
});
