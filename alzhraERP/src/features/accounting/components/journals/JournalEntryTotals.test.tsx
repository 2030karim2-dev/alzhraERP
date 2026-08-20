
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import JournalEntryTotals from './JournalEntryTotals';

describe('JournalEntryTotals', () => {
  const baseProps = {
    totals: { debit_amount: 100, credit_amount: 100 },
    currencyCode: 'SAR',
    exchangeRate: 1,
    isDivide: false,
    difference: 0,
    isBalanced: true,
    errors: {},
  };

  it('renders debit/credit totals for a balanced entry without an error', () => {
    render(<JournalEntryTotals {...baseProps} />);
    expect(screen.getByText('إجمالي المدين')).toBeInTheDocument();
    expect(screen.getByText('إجمالي الدائن')).toBeInTheDocument();
    expect(screen.queryByText(/القيد غير متوازن/)).not.toBeInTheDocument();
  });

  it('shows the imbalance warning and difference when the entry is unbalanced', () => {
    render(
      <JournalEntryTotals
        {...baseProps}
        totals={{ debit_amount: 100, credit_amount: 90 }}
        difference={10}
        isBalanced={false}
      />
    );
    expect(screen.getByText('القيد غير متوازن')).toBeInTheDocument();
    expect(screen.getByText(/10\.00/)).toBeInTheDocument();
  });

  it('shows a zero-amount hint when no amounts are entered', () => {
    render(
      <JournalEntryTotals
        {...baseProps}
        totals={{ debit_amount: 0, credit_amount: 0 }}
        isBalanced={false}
      />
    );
    expect(screen.getByText('يجب إدخال مبالغ')).toBeInTheDocument();
  });
});
