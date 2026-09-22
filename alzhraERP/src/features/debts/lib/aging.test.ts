import { describe, it, expect } from 'vitest';
import { AGING_ORDER, bucketForDays, getAgingMeta, isAgingKey } from './aging';

describe('bucketForDays', () => {
  it('treats current / missing overdue days as the first bucket', () => {
    expect(bucketForDays(null)).toBe('b0_30');
    expect(bucketForDays(undefined)).toBe('b0_30');
    expect(bucketForDays(0)).toBe('b0_30');
    expect(bucketForDays(30)).toBe('b0_30');
  });

  it('maps buckets at their inclusive upper bounds', () => {
    expect(bucketForDays(31)).toBe('b31_60');
    expect(bucketForDays(60)).toBe('b31_60');
    expect(bucketForDays(61)).toBe('b61_90');
    expect(bucketForDays(90)).toBe('b61_90');
    expect(bucketForDays(91)).toBe('b90_plus');
    expect(bucketForDays(3650)).toBe('b90_plus');
  });

  it('falls back to the first bucket for non-numeric input', () => {
    expect(bucketForDays(Number.NaN)).toBe('b0_30');
  });
});

describe('isAgingKey', () => {
  it('accepts only the four bucket keys used by the URL filter', () => {
    expect(isAgingKey('b0_30')).toBe(true);
    expect(isAgingKey('b31_60')).toBe(true);
    expect(isAgingKey('b61_90')).toBe(true);
    expect(isAgingKey('b90_plus')).toBe(true);
  });

  it('rejects anything else (nullish, empty, unknown)', () => {
    expect(isAgingKey(null)).toBe(false);
    expect(isAgingKey(undefined)).toBe(false);
    expect(isAgingKey('')).toBe(false);
    expect(isAgingKey('all')).toBe(false);
  });
});

describe('AGING_META', () => {
  it('covers every bucket in display order with a label', () => {
    expect(AGING_ORDER).toHaveLength(4);
    AGING_ORDER.forEach(key => {
      const meta = getAgingMeta(key);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.barClass.length).toBeGreaterThan(0);
    });
  });
});
