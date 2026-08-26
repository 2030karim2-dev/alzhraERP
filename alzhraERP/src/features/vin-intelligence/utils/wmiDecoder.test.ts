import { describe, it, expect } from 'vitest';
import { preDecodeVin, resolveModelYear } from './wmiDecoder';

describe('preDecodeVin', () => {
  it('returns null for too-short input', () => {
    expect(preDecodeVin('JT')).toBeNull();
  });

  it('decodes a Toyota Japan WMI', () => {
    const r = preDecodeVin('JTD12345678901234');
    expect(r?.make).toBe('Toyota');
    expect(r?.makeAr).toBe('تويوتا');
    expect(r?.country).toBe('Japan');
  });

  it('decodes a Lexus Japan WMI', () => {
    const r = preDecodeVin('JTH12345678901234');
    expect(r?.make).toBe('Lexus');
  });

  it('decodes a Hyundai Korea WMI', () => {
    const r = preDecodeVin('KMH12345678901234');
    expect(r?.make).toBe('Hyundai');
  });

  it('decodes a Ford USA WMI', () => {
    const r = preDecodeVin('1FA12345678901234');
    expect(r?.make).toBe('Ford');
    expect(r?.country).toBe('USA');
  });

  it('parses model year from index 9 (T = 2026)', () => {
    const r = preDecodeVin('JTD123456T901234');
    expect(r?.year).toBe(2026);
  });

  it('parses model year A = 2010', () => {
    const r = preDecodeVin('JTD123456A901234');
    expect(r?.year).toBe(2010);
  });

  it('returns null year for non-mapped year char', () => {
    const r = preDecodeVin('JTD123456Z901234');
    expect(r?.year).toBeNull();
  });

  it('falls back to country for unknown WMI starting with J (Japan)', () => {
    const r = preDecodeVin('JZZ12345678901234');
    expect(r?.make).toBe('غير محدد');
    expect(r?.country).toBe('اليابان');
  });

  it('decodes 11-char GCC VIN and parses year from index 9 (when long enough)', () => {
    // 11-char: index 9 is "1" (2001) — year parsing still works at index 9.
    const r = preDecodeVin('JTD1234M012');
    expect(r?.make).toBe('Toyota');
    expect(r?.year).toBe(2001);
  });

  it('handles 17-char VIN with year at index 9', () => {
    // J T D 1 2 3 4 M 8 9 0 1 2 3 4 5 6
    // 0 1 2 3 4 5 6 7 8 9 ...
    //                          year char at index 9 = '9' -> 2009
    const r = preDecodeVin('JTD1234M890123456');
    expect(r?.year).toBe(2009);
  });

  it('normalizes spaces and hyphens', () => {
    const r = preDecodeVin('jtd 123-a5678 901234');
    expect(r?.make).toBe('Toyota');
  });
});

describe('resolveModelYear — 30-year cycle windowing', () => {
  it('returns the base year while it is still plausible', () => {
    expect(resolveModelYear('T', 2026)).toBe(2026); // T=2026 ≤ now+1
    expect(resolveModelYear('A', 2020)).toBe(2010);
  });

  it('rolls forward a full cycle once the base goes stale', () => {
    expect(resolveModelYear('A', 2042)).toBe(2040); // base 2010 stale → +30
    expect(resolveModelYear('9', 2038)).toBe(2039); // base 2009 → 2039 (≤ 2039 ceiling)
    expect(resolveModelYear('Y', 2042)).toBe(2030); // base 2000 → next cycle 2030
  });

  it('never returns a year beyond nowYear + 1 (keeps the highest in-window candidate)', () => {
    expect(resolveModelYear('X', 2056)).toBe(2029); // next cycle 2059 > 2057 ceiling
    expect(resolveModelYear('T', 2024)).toBe(2026); // 2056 > 2025 ceiling → stays on base
  });

  it('handles lowercase chars and unknown chars', () => {
    expect(resolveModelYear('t', 2026)).toBe(2026);
    expect(resolveModelYear('Z', 2026)).toBeNull();
    expect(resolveModelYear('', 2026)).toBeNull();
  });
});
