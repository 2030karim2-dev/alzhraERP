import { describe, expect, it } from 'vitest';
import { expensesService } from './service';
import type { Expense } from './types';

const makeExpense = (overrides: Partial<Expense>): Expense => ({
  id: 'exp-1',
  category_id: 'cat-1',
  description: 'مصروف اختباري',
  amount: 100,
  currency_code: 'SAR',
  exchange_rate: 1,
  expense_date: '2026-08-20',
  status: 'paid',
  payment_method: 'cash',
  is_recurring: false,
  ...overrides,
});

describe('expensesService.calculateStats', () => {
  it('returns all-zero stats for an empty list', () => {
    const stats = expensesService.calculateStats([]);
    expect(stats).toEqual({
      totalExpenses: 0,
      paidExpenses: 0,
      pendingExpenses: 0,
      categoriesCount: 0,
    });
  });

  it('counts posted + paid as paid and draft as pending', () => {
    const expenses = [
      makeExpense({ id: '1', status: 'paid', amount: 100 }),
      makeExpense({ id: '2', status: 'posted', amount: 50 }),
      makeExpense({ id: '3', status: 'draft', amount: 25 }),
    ];
    const stats = expensesService.calculateStats(expenses);
    expect(stats.totalExpenses).toBe(175);
    expect(stats.paidExpenses).toBe(150);
    expect(stats.pendingExpenses).toBe(25);
  });

  it('counts distinct categories', () => {
    const expenses = [
      makeExpense({ id: '1', category_id: 'cat-1' }),
      makeExpense({ id: '2', category_id: 'cat-1' }),
      makeExpense({ id: '3', category_id: 'cat-2' }),
    ];
    expect(expensesService.calculateStats(expenses).categoriesCount).toBe(2);
  });

  it('treats a corrupt exchange rate as 0 instead of throwing', () => {
    const expenses = [makeExpense({ id: '1', amount: 100, exchange_rate: 0 })];
    const stats = expensesService.calculateStats(expenses);
    expect(stats.totalExpenses).toBe(0);
  });

  it('excludes voided expenses from totalExpenses, paidExpenses, and categoriesCount', () => {
    const expenses = [
      makeExpense({ id: '1', status: 'posted', amount: 100, category_id: 'cat-1' }),
      makeExpense({ id: '2', status: 'void', amount: 50, category_id: 'cat-2' }),
    ];
    const stats = expensesService.calculateStats(expenses);
    expect(stats.totalExpenses).toBe(100);
    expect(stats.paidExpenses).toBe(100);
    expect(stats.categoriesCount).toBe(1); // cat-2 is void, excluded
  });
});

describe('expensesService.getCategoryBreakdown', () => {
  it('groups totals by category name in base currency', () => {
    const expenses = [
      makeExpense({ id: '1', category_id: 'c1', category_name: 'إيجار', amount: 100 }),
      makeExpense({ id: '2', category_id: 'c1', category_name: 'إيجار', amount: 50 }),
      makeExpense({ id: '3', category_id: 'c2', category_name: 'رواتب', amount: 30 }),
    ];
    const breakdown = expensesService.getCategoryBreakdown(expenses);
    expect(breakdown.find(b => b.name === 'إيجار')?.value).toBe(150);
    expect(breakdown.find(b => b.name === 'رواتب')?.value).toBe(30);
  });

  it('falls back to "أخرى" when a category name is missing', () => {
    const expenses = [
      makeExpense({ id: '1', category_id: 'c1', category_name: undefined, amount: 10 }),
    ];
    const breakdown = expensesService.getCategoryBreakdown(expenses);
    expect(breakdown.find(b => b.name === 'أخرى')?.value).toBe(10);
  });

  it('strictly excludes void expenses from category breakdown', () => {
    const expenses = [
      makeExpense({ id: '1', category_name: 'رواتب', amount: 100, status: 'posted' }),
      makeExpense({ id: '2', category_name: 'رواتب', amount: 50, status: 'void' }),
    ];
    const breakdown = expensesService.getCategoryBreakdown(expenses);
    expect(breakdown.find(b => b.name === 'رواتب')?.value).toBe(100);
  });

  it('correctly normalizes YER expenses using divide operator (410 rate)', () => {
    const expenses = [
      makeExpense({
        id: '1',
        category_name: 'مصاريف عمال',
        amount: 4100,
        currency_code: 'YER',
        exchange_rate: 410,
        status: 'posted',
      }),
    ];
    const stats = expensesService.calculateStats(expenses);
    expect(stats.totalExpenses).toBe(10); // 4100 / 410 = 10 SAR, NOT 4100 SAR!
  });
});
