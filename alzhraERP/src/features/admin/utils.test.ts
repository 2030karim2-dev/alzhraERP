import { describe, it, expect } from 'vitest';
import { calcCacheHitRate, deriveStatusAfterToggle, subscriptionStatusLabel, toCsv } from './utils';

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

describe('deriveStatusAfterToggle', () => {
  const base = {
    subscription_status: 'active' as const,
    plan_id: null,
    trial_ends_at: null,
  };

  it('suspending always results in suspended', () => {
    expect(deriveStatusAfterToggle(base, false)).toBe('suspended');
  });

  it('restores trial when reactivating a suspended company with a live trial and no plan', () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    expect(
      deriveStatusAfterToggle({ ...base, subscription_status: 'suspended', trial_ends_at: future }, true)
    ).toBe('trial');
  });

  it('goes to active on reactivation when a plan is assigned', () => {
    expect(
      deriveStatusAfterToggle(
        { ...base, subscription_status: 'suspended', plan_id: '00000000-0000-0000-0000-000000000001' },
        true
      )
    ).toBe('active');
  });

  it('preserves cancelled/past_due statuses on reactivation', () => {
    expect(
      deriveStatusAfterToggle({ ...base, subscription_status: 'cancelled' }, true)
    ).toBe('cancelled');
    expect(
      deriveStatusAfterToggle({ ...base, subscription_status: 'past_due' }, true)
    ).toBe('past_due');
  });

  it('falls back to active when there is no live trial and no plan', () => {
    const expired = new Date(Date.now() - 1000).toISOString();
    expect(
      deriveStatusAfterToggle({ ...base, subscription_status: 'suspended', trial_ends_at: expired }, true)
    ).toBe('active');
  });
});

describe('toCsv', () => {
  it('prepends a BOM so Arabic opens correctly in Excel', () => {
    const csv = toCsv(['الاسم'], [['منشأة تجريبية']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('منشأة تجريبية');
  });

  it('escapes commas, quotes and newlines inside cells', () => {
    const csv = toCsv(['a', 'b'], [['x,1', 'say "hi"']]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[1]).toBe('"x,1","say ""hi"""');
  });

  it('renders nullish cells as empty strings', () => {
    const csv = toCsv(['a', 'b', 'c'], [[null, undefined, 7]]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[1]).toBe(',,7');
  });
});

describe('subscriptionStatusLabel', () => {
  it('maps every subscription status to a readable Arabic label', () => {
    expect(subscriptionStatusLabel('active')).toBe('نشطة');
    expect(subscriptionStatusLabel('trial')).toBe('تجريبية');
    expect(subscriptionStatusLabel('past_due')).toBe('متأخرة السداد');
    expect(subscriptionStatusLabel('cancelled')).toBe('ملغاة');
    expect(subscriptionStatusLabel('suspended')).toBe('موقوفة');
  });
});
