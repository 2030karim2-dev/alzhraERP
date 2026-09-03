import { describe, it, expect } from 'vitest';
import { calcCacheHitRate } from './utils';

describe('calcCacheHitRate', () => {
  it('returns 0 when there is no activity', () => {
    expect(calcCacheHitRate(0, 0)).toBe(0);
    expect(calcCacheHitRate(undefined as unknown as number, undefined as unknown as number)).toBe(
      0
    );
  });

  it('computes the cache saving ratio = hits / (requests + hits)', () => {
    // مثال: 20 استدعاء خارج الكاش + 5 إجابات من الكاش → 5/25 = 20%
    expect(calcCacheHitRate(20, 5)).toBe(20);
    expect(calcCacheHitRate(0, 10)).toBe(100);
    expect(calcCacheHitRate(10, 0)).toBe(0);
  });

  it('handles partial/negative input defensively (clamps negatives to zero)', () => {
    // الطلبات السالبة تُعامل كصفر → النسبة تصبح كلها من الكاش
    expect(calcCacheHitRate(-5, 5)).toBe(100);
    // الكاش السالب يُعامل كصفر → لا نسبة توفير
    expect(calcCacheHitRate(5, -5)).toBe(0);
    expect(calcCacheHitRate(-5, -5)).toBe(0);
  });
});
