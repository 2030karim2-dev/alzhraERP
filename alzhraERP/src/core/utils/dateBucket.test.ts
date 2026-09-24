import { describe, it, expect } from 'vitest';
import { daysDiffLocal } from './dateBucket';

describe('daysDiffLocal', () => {
  it('يحسب فرق الأيام بدلالة date-only بلا انزياح UTC', () => {
    expect(daysDiffLocal('2026-09-24', '2026-09-24')).toBe(0);
    expect(daysDiffLocal('2026-08-25', '2026-09-24')).toBe(30);
    expect(daysDiffLocal('2026-08-24', '2026-09-24')).toBe(31);
    expect(daysDiffLocal('2026-09-25', '2026-09-24')).toBe(-1);
  });

  it('يقبل مفاتيح ISO الكاملة بأخذ جزء التاريخ فقط', () => {
    expect(daysDiffLocal('2026-08-25T21:30:00+03:00', '2026-09-24')).toBe(30);
  });

  it('يعيد 0 للتاريخ غير الصالح (شريحة «حالية» آمنة)', () => {
    expect(daysDiffLocal('not-a-date', '2026-09-24')).toBe(0);
    expect(daysDiffLocal('', '2026-09-24')).toBe(0);
  });
});
