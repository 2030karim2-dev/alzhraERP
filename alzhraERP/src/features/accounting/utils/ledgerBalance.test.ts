import { describe, it, expect } from 'vitest';
import { getLedgerBalanceLabel, isDebitNormalAccount } from './ledgerBalance';

describe('isDebitNormalAccount', () => {
  it('asset/expense are debit-normal', () => {
    expect(isDebitNormalAccount('asset')).toBe(true);
    expect(isDebitNormalAccount('expense')).toBe(true);
  });
  it('liability/equity/revenue are credit-normal', () => {
    expect(isDebitNormalAccount('liability')).toBe(false);
    expect(isDebitNormalAccount('equity')).toBe(false);
    expect(isDebitNormalAccount('revenue')).toBe(false);
  });
  it('unknown account type falls back to debit-normal', () => {
    expect(isDebitNormalAccount()).toBe(true);
    expect(isDebitNormalAccount('weird')).toBe(true);
  });
});

describe('getLedgerBalanceLabel', () => {
  it('asset with positive balance → مدين (debit)', () => {
    expect(getLedgerBalanceLabel(500, 'asset')).toEqual({ label: 'مدين', isCredit: false });
  });
  it('asset with negative balance → دائن (credit)', () => {
    expect(getLedgerBalanceLabel(-200, 'asset')).toEqual({ label: 'دائن', isCredit: true });
  });
  it('liability with positive balance → دائن (credit) [the H2 bug case]', () => {
    expect(getLedgerBalanceLabel(300, 'liability')).toEqual({ label: 'دائن', isCredit: true });
  });
  it('liability with negative balance → مدين (debit)', () => {
    expect(getLedgerBalanceLabel(-300, 'liability')).toEqual({ label: 'مدين', isCredit: false });
  });
  it('revenue with positive balance → دائن', () => {
    expect(getLedgerBalanceLabel(100, 'revenue').label).toBe('دائن');
  });
  it('expense with positive balance → مدين', () => {
    expect(getLedgerBalanceLabel(100, 'expense').label).toBe('مدين');
  });
  it('zero balance → مدين (neutral, debit-normal)', () => {
    expect(getLedgerBalanceLabel(0, 'asset').label).toBe('مدين');
    expect(getLedgerBalanceLabel(0, 'liability').label).toBe('مدين');
  });
});
