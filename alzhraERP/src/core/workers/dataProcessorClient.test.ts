import { describe, it, expect } from 'vitest';
import { dataProcessorClient } from './dataProcessorClient';

describe('DataProcessorClient', () => {
  it('correctly filters datasets using filter criteria', async () => {
    const items = [
      { id: '1', name: 'Brake Pad Front', category: 'brakes' },
      { id: '2', name: 'Oil Filter', category: 'filters' },
      { id: '3', name: 'Brake Disc Rear', category: 'brakes' },
    ];

    const result = await dataProcessorClient.runTask('FILTER_DATASET', {
      items,
      filterCriteria: { name: 'brake' },
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });

  it('calculates totals accurately across numeric fields', async () => {
    const items = [
      { price: 100, qty: 2, tax: 15 },
      { price: 250, qty: 1, tax: 37.5 },
      { price: 50, qty: 4, tax: 7.5 },
    ];

    const totals = await dataProcessorClient.runTask('CALCULATE_TOTALS', {
      items,
      numericFields: ['price', 'qty', 'tax'],
    });

    expect(totals.price).toBe(400);
    expect(totals.qty).toBe(7);
    expect(totals.tax).toBe(60);
  });

  it('aggregates ledger debits, credits and verifies balance equality', async () => {
    const entries = [
      { debit: 1500, credit: 0 },
      { debit: 0, credit: 1000 },
      { debit: 0, credit: 500 },
    ];

    const summary = await dataProcessorClient.runTask('AGGREGATE_LEDGER', {
      entries,
    });

    expect(summary.totalDebit).toBe(1500);
    expect(summary.totalCredit).toBe(1500);
    expect(summary.balance).toBe(0);
    expect(summary.isBalanced).toBe(true);
  });
});
