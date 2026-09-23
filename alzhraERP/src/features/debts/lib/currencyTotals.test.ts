/**
 * اختبارات مجاميع شبكة الديون — القاعدة المحاسبية: كل مجموع بعملته.
 */
import { describe, it, expect } from 'vitest';
import { currencyCount, currencyTotals, debtRowId, totalsLabel } from './currencyTotals';
import type { FollowUpDashboardRow } from '../types';

const makeRow = (partial: Partial<FollowUpDashboardRow>): FollowUpDashboardRow => ({
  party_id: 'p1',
  party_name: 'عميل تجريبي',
  party_phone: '777123456',
  category: 'عام',
  credit_limit: 0,
  currency_code: 'SAR',
  outstanding_balance: 1500.5,
  overdue_amount: 250,
  oldest_due_date: '2026-07-01',
  next_due_date: '2026-09-01',
  days_overdue: 83,
  classification: 'overdue',
  reminder_status: 'needs_reminder',
  last_reminded_at: '2026-09-20T10:00:00Z',
  last_contact_date: null,
  has_broken_promise: false,
  pending_promise_count: 1,
  pending_promise_amount: 500,
  pending_promise_date: '2026-09-25',
  invoice_count: 2,
  opening_balance: 0,
  ...partial,
});

describe('debtRowId', () => {
  it('combines the party with its currency so one party can hold many balances', () => {
    expect(debtRowId(makeRow({ party_id: 'abc', currency_code: 'USD' }))).toBe('abc-USD');
    expect(debtRowId(makeRow({ party_id: 'abc', currency_code: 'YER' }))).toBe('abc-YER');
  });
});

describe('currencyTotals', () => {
  it('sums within each currency and never across currencies', () => {
    const totals = currencyTotals([
      makeRow({ party_id: 'a', currency_code: 'USD', outstanding_balance: 100 }),
      makeRow({ party_id: 'b', currency_code: 'USD', outstanding_balance: 250.5 }),
      makeRow({ party_id: 'c', currency_code: 'YER', outstanding_balance: 480000 }),
    ]);

    expect(totals.get('USD')).toBe(350.5);
    expect(totals.get('YER')).toBe(480000);
    expect(currencyCount([makeRow({ currency_code: 'USD' })])).toBe(1);
  });

  it('returns an empty map for an empty selection', () => {
    expect(currencyTotals([]).size).toBe(0);
    expect(currencyCount([])).toBe(0);
  });
});

describe('totalsLabel', () => {
  it('shows a dash when nothing is selected', () => {
    expect(totalsLabel([])).toBe('—');
  });

  it('labels a single-currency selection with that currency', () => {
    const label = totalsLabel([
      makeRow({ currency_code: 'USD', outstanding_balance: 1250 }),
      makeRow({ currency_code: 'USD', outstanding_balance: 250 }),
    ]);

    expect(label).toBe('$1,500.00');
  });

  it('lists one total per currency for a mixed selection', () => {
    const label = totalsLabel([
      makeRow({ currency_code: 'USD', outstanding_balance: 1250 }),
      makeRow({ currency_code: 'YER', outstanding_balance: 480000 }),
    ]);

    expect(label).toBe('$1,250.00 · 480,000.00 ر.ي');
  });
});
