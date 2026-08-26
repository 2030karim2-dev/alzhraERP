import { describe, expect, it } from 'vitest';
import { MAKE_ALIASES, canonicalizeMake, canonicalizeModel } from './vehicleCanonicalizer';

describe('canonicalizeMake', () => {
  it('maps Arabic brands to canonical English ids', () => {
    expect(canonicalizeMake('تويوتا')).toBe('Toyota');
    expect(canonicalizeMake('هيونداي')).toBe('Hyundai');
    expect(canonicalizeMake('جمس')).toBe('GMC');
    expect(canonicalizeMake('مرسيدس بنز')).toBe('Mercedes-Benz');
    expect(canonicalizeMake('ايسوزو')).toBe('Isuzu');
  });

  it('is case/space tolerant on the lookup side', () => {
    expect(canonicalizeMake('  تويوتا ')).toBe('Toyota');
  });

  it('passes canonical and unknown makes through trimmed', () => {
    expect(canonicalizeMake('Toyota')).toBe('Toyota');
    expect(canonicalizeMake('  Ferrari ')).toBe('Ferrari');
  });

  it('returns empty string for nullish input', () => {
    expect(canonicalizeMake(null)).toBe('');
    expect(canonicalizeMake(undefined)).toBe('');
    expect(canonicalizeMake('   ')).toBe('');
  });
});

describe('canonicalizeModel', () => {
  it('maps known Arabic models to canonical ids', () => {
    expect(canonicalizeModel('كورولا')).toBe('Corolla');
    expect(canonicalizeModel('شاص')).toBe('Land Cruiser 70');
    expect(canonicalizeModel('سنتافي')).toBe('Santa Fe');
  });

  it('passes canonical and unknown models through', () => {
    expect(canonicalizeModel('Corolla')).toBe('Corolla');
    expect(canonicalizeModel('Unknown-X')).toBe('Unknown-X');
  });

  it('handles nullish input', () => {
    expect(canonicalizeModel(null)).toBe('');
  });
});

describe('dictionary hygiene', () => {
  it('no canonical VALUE collides with another KEY (stable round-trip)', () => {
    for (const value of Object.values(MAKE_ALIASES)) {
      expect(MAKE_ALIASES[value.toLowerCase()]).toBeUndefined();
    }
  });

  it('alias keys are unique after lowercase-normalization', () => {
    const keys = Object.keys(MAKE_ALIASES).map((k) => k.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });
});