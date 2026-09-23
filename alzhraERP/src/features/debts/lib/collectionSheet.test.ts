import { describe, it, expect } from 'vitest';
import { buildCollectionSheetCsv, collectionSheetFileName } from './collectionSheet';
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

describe('buildCollectionSheetCsv', () => {
  it('starts with a UTF-8 BOM and a header row', () => {
    const csv = buildCollectionSheetCsv([makeRow({})]);
    expect(csv.startsWith('\uFEFF')).toBe(true);

    const [header] = csv.slice(1).split('\r\n');
    expect(header).toContain('العميل');
    expect(header).toContain('أيام التأخير');
    expect(header.split(',')).toHaveLength(13);
  });

  it('writes amounts with two decimals and maps Arabic labels', () => {
    const csv = buildCollectionSheetCsv([makeRow({})]);
    const body = csv.slice(1).split('\r\n')[1] ?? '';

    expect(body).toContain('1500.50');
    expect(body).toContain('250.00');
    expect(body).toContain('متأخر'); // CLASSIFICATION_META.overdue
    expect(body).toContain('2026-09-20'); // last reminder date only
  });

  it('quotes cells that contain commas or quotes', () => {
    const csv = buildCollectionSheetCsv([makeRow({ party_name: 'شركة "الوفاء", المحدودة' })]);
    const body = csv.slice(1).split('\r\n')[1] ?? '';

    expect(body.startsWith('"شركة ""الوفاء"", المحدودة"')).toBe(true);
  });

  it('keeps an empty phone and the row count intact', () => {
    const csv = buildCollectionSheetCsv([
      makeRow({ party_phone: null }),
      makeRow({ party_id: 'p2' }),
    ]);
    const lines = csv.slice(1).split('\r\n');

    expect(lines).toHaveLength(3); // header + 2 rows
  });
});

describe('collectionSheetFileName', () => {
  it('builds a CSV file name for the given date', () => {
    expect(collectionSheetFileName('2026-09-22')).toBe('collection-sheet-2026-09-22.csv');
  });
});
