import { describe, expect, it } from 'vitest';
import { formatCommissionDate, formatCommissionMoney, formatCommissionNumber } from './commissionLabels';

describe('commission display formatting', () => {
  it('formats numbers with English digits', () => {
    expect(formatCommissionNumber(1234567.89)).toBe('1,234,567.89');
  });

  it('formats commission money with English digits and Arabic currency context', () => {
    const formatted = formatCommissionMoney(1234.5, 'SAR');
    expect(formatted).toMatch(/[0-9]/);
    expect(formatted).not.toMatch(/[٠-٩]/);
  });

  it('keeps Arabic date context while using English digits', () => {
    const formatted = formatCommissionDate('2026-08-16T00:00:00.000Z');
    expect(formatted).toMatch(/[0-9]/);
    expect(formatted).not.toMatch(/[٠-٩]/);
  });
});
