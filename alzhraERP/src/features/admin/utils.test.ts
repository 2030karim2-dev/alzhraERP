import { describe, it, expect } from 'vitest';
import {
  calcCacheHitRate,
  canExtendCompanyTrial,
  companyStatusLabel,
  deriveStatusAfterToggle,
  localDateTimeInputValueToIso,
  subscriptionStatusLabel,
  toCsv,
  toLocalDateTimeInputValue,
} from './utils';

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

  it('preserves cancelled/past_due status when suspending so reactivation can restore it', () => {
    // إصلاح D1: التعليق لا يمحو الحالة الملغاة/المتأخرة (is_active=false يكفي للحجب)
    expect(deriveStatusAfterToggle({ ...base, subscription_status: 'cancelled' }, false)).toBe(
      'cancelled'
    );
    expect(deriveStatusAfterToggle({ ...base, subscription_status: 'past_due' }, false)).toBe(
      'past_due'
    );
  });

  it('restores trial when reactivating a suspended company with a live trial and no plan', () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    expect(
      deriveStatusAfterToggle(
        { ...base, subscription_status: 'suspended', trial_ends_at: future },
        true
      )
    ).toBe('trial');
  });

  it('goes to active on reactivation when a plan is assigned', () => {
    expect(
      deriveStatusAfterToggle(
        {
          ...base,
          subscription_status: 'suspended',
          plan_id: '00000000-0000-0000-0000-000000000001',
        },
        true
      )
    ).toBe('active');
  });

  it('preserves cancelled/past_due statuses on reactivation', () => {
    expect(deriveStatusAfterToggle({ ...base, subscription_status: 'cancelled' }, true)).toBe(
      'cancelled'
    );
    expect(deriveStatusAfterToggle({ ...base, subscription_status: 'past_due' }, true)).toBe(
      'past_due'
    );
  });

  it('flags an expired trial as past_due when reactivating without a plan', () => {
    const expired = new Date(Date.now() - 1000).toISOString();
    expect(
      deriveStatusAfterToggle(
        { ...base, subscription_status: 'suspended', trial_ends_at: expired },
        true
      )
    ).toBe('past_due');
  });

  it('falls back to active when there is no trial window at all and no plan', () => {
    expect(deriveStatusAfterToggle({ ...base, subscription_status: 'suspended' }, true)).toBe(
      'active'
    );
  });

  it('does not restore an expired trial status on reactivation (trial → past_due)', () => {
    const expired = new Date(Date.now() - 86400_000).toISOString();
    expect(
      deriveStatusAfterToggle(
        { ...base, subscription_status: 'trial', trial_ends_at: expired },
        true
      )
    ).toBe('past_due');
  });

  it('restores a still-live trial status on reactivation (trial → trial)', () => {
    const future = new Date(Date.now() + 3 * 86400_000).toISOString();
    expect(
      deriveStatusAfterToggle(
        { ...base, subscription_status: 'trial', trial_ends_at: future },
        true
      )
    ).toBe('trial');
  });
});

describe('canExtendCompanyTrial', () => {
  it('allows extension for active trial/past_due companies', () => {
    expect(canExtendCompanyTrial({ is_active: true, subscription_status: 'trial' })).toBe(true);
    expect(canExtendCompanyTrial({ is_active: true, subscription_status: 'past_due' })).toBe(true);
    expect(canExtendCompanyTrial({ is_active: true, subscription_status: 'active' })).toBe(true);
  });

  it('rejects extension for suspended/cancelled/inactive companies (B3)', () => {
    expect(canExtendCompanyTrial({ is_active: true, subscription_status: 'cancelled' })).toBe(
      false
    );
    expect(canExtendCompanyTrial({ is_active: true, subscription_status: 'suspended' })).toBe(
      false
    );
    expect(canExtendCompanyTrial({ is_active: false, subscription_status: 'suspended' })).toBe(
      false
    );
    expect(canExtendCompanyTrial({ is_active: false, subscription_status: 'trial' })).toBe(false);
    expect(canExtendCompanyTrial({ is_active: false, subscription_status: 'past_due' })).toBe(
      false
    );
  });
});

describe('companyStatusLabel', () => {
  it('shows the actual status for active companies', () => {
    expect(companyStatusLabel({ is_active: true, subscription_status: 'active' })).toBe('نشطة');
    expect(companyStatusLabel({ is_active: true, subscription_status: 'trial' })).toBe('تجريبية');
    expect(companyStatusLabel({ is_active: true, subscription_status: 'past_due' })).toBe(
      'متأخرة السداد'
    );
    expect(companyStatusLabel({ is_active: true, subscription_status: 'cancelled' })).toBe('ملغاة');
  });

  it('shows "موقوفة" for inactive legacy active/trial rows and preserves cancelled/past_due', () => {
    expect(companyStatusLabel({ is_active: false, subscription_status: 'suspended' })).toBe(
      'موقوفة'
    );
    expect(companyStatusLabel({ is_active: false, subscription_status: 'active' })).toBe('موقوفة');
    expect(companyStatusLabel({ is_active: false, subscription_status: 'trial' })).toBe('موقوفة');
    expect(companyStatusLabel({ is_active: false, subscription_status: 'cancelled' })).toBe(
      'ملغاة'
    );
    expect(companyStatusLabel({ is_active: false, subscription_status: 'past_due' })).toBe(
      'متأخرة السداد'
    );
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

describe('toLocalDateTimeInputValue / localDateTimeInputValueToIso', () => {
  it('round-trips an ISO instant through the local datetime-local value', () => {
    const iso = '2026-09-05T09:30:00.000Z';
    const localValue = toLocalDateTimeInputValue(iso);
    // الصيغة الصالحة لحقل datetime-local: YYYY-MM-DDTHH:mm
    expect(localValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(localDateTimeInputValueToIso(localValue)).toBe(iso);
  });

  it('returns empty string for missing/invalid input', () => {
    expect(toLocalDateTimeInputValue(null)).toBe('');
    expect(toLocalDateTimeInputValue('')).toBe('');
    expect(toLocalDateTimeInputValue('not-a-date')).toBe('');
  });

  it('returns null for missing/invalid datetime-local values', () => {
    expect(localDateTimeInputValueToIso('')).toBeNull();
    expect(localDateTimeInputValueToIso(null)).toBeNull();
    expect(localDateTimeInputValueToIso('garbage')).toBeNull();
  });
});
