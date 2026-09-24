/**
 * اختبارات حمولة كشف الحساب (M-4): ترويسة الشركة + حركات الكشف + خيارات المصدِّر.
 * الهدف: تثبيت التطبيع (null/'' → قيم آمنة) وأن رقم الهاتف لا يُمرَّر فارغاً.
 */
import { describe, it, expect } from 'vitest';
import { buildCompanyDoc, buildExportOptions, toStatementEntries } from './debtStatementExport';
import type { StatementMovement } from '../../parties/service';
import type { FollowUpDashboardRow } from '../types';

const makeRow = (partial: Partial<FollowUpDashboardRow> = {}): FollowUpDashboardRow => ({
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

const makeMovement = (partial: Partial<StatementMovement> = {}): StatementMovement => ({
  id: 'm1',
  date: '2026-09-01',
  ref: 'INV-100',
  desc: 'فاتورة بيع',
  type: 'invoice',
  debit: 1000,
  credit: 0,
  currency: 'SAR',
  ...partial,
});

describe('buildCompanyDoc', () => {
  it('يستخدم الاسم الاحتياطي ويُفرغ الحقول غير المتوفرة عند غياب الشركة', () => {
    const doc = buildCompanyDoc(null);

    expect(doc.name_ar).toBe('منظومة الزهراء المحاسبية');
    expect(doc.address).toBe('');
    expect(doc.phone).toBe('');
    expect(doc.tax_number).toBe('');
    expect(doc.commercial_reg).toBe('');
    expect(doc.bank_name).toBe('');
    expect(doc.bank_account_iban).toBe('');
  });

  it('يطبّع null والنص الفارغ إلى قيم آمنة ويُمرّر المتوفر كما هو', () => {
    const doc = buildCompanyDoc({
      name_ar: 'شركة الزهراء',
      address: null,
      phone: '777111222',
      tax_number: '',
      commercial_reg: undefined,
      bank_name: 'بنك التضامن',
      bank_account_iban: 'YE00 0000 0000',
    });

    expect(doc.name_ar).toBe('شركة الزهراء');
    expect(doc.address).toBe('');
    expect(doc.phone).toBe('777111222');
    expect(doc.tax_number).toBe('');
    expect(doc.commercial_reg).toBe('');
    expect(doc.bank_name).toBe('بنك التضامن');
    expect(doc.bank_account_iban).toBe('YE00 0000 0000');
  });
});

describe('toStatementEntries', () => {
  it('يحوّل حركات الكشف إلى صيغة المصدِّر (ref → reference_no و balance اختياري)', () => {
    const entries = toStatementEntries([
      makeMovement(),
      makeMovement({ id: 'm2', ref: 'PAY-7', operation_type: 'سند قبض', balance: 400 }),
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      date: '2026-09-01',
      reference_no: 'INV-100',
      operation_type: '',
      balance: 0,
      debit: 1000,
      credit: 0,
    });
    expect(entries[1]).toMatchObject({
      reference_no: 'PAY-7',
      operation_type: 'سند قبض',
      balance: 400,
    });
  });

  it('يعيد مصفوفة فارغة بلا حركات', () => {
    expect(toStatementEntries([])).toEqual([]);
  });
});

describe('buildExportOptions', () => {
  it('يمرّر العملة والتصنيف والنوع عميلاً مع هاتف الطرف عند وجوده', () => {
    const options = buildExportOptions(makeRow({ currency_code: 'YER', category: 'جملة' }));

    expect(options).toEqual({
      currencyCode: 'YER',
      partyCategory: 'جملة',
      partyType: 'customer',
      partyPhone: '777123456',
    });
  });

  it('يحذف رقم الهاتف حين يكون null أو فارغاً (لا خصائص undefined)', () => {
    const withoutPhone = buildExportOptions(makeRow({ party_phone: null }));
    const emptyPhone = buildExportOptions(makeRow({ party_phone: '' }));

    expect('partyPhone' in withoutPhone).toBe(false);
    expect('partyPhone' in emptyPhone).toBe(false);
  });
});
