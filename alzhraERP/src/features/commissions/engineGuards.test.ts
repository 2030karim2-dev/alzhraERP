import { describe, expect, it } from 'vitest';
import {
  assertAllocationComplete,
  assertTestPeriodOperation,
  deriveTotalCommission,
  isEligibleAssignment,
} from './engineGuards';

describe('commission engine guards', () => {
  it('accepts exactly 100% allocation and rejects incomplete allocation', () => {
    expect(() => {
      assertAllocationComplete([
        { user_id: 'u1', allocation_pct: 70 },
        { user_id: 'u2', allocation_pct: 30 },
      ]);
    }).not.toThrow();
    expect(() => {
      assertAllocationComplete([{ user_id: 'u1', allocation_pct: 70 }]);
    }).toThrowError('allocation_overflow');
  });

  it('rejects invalid allocation percentages', () => {
    expect(() => {
      assertAllocationComplete([{ user_id: 'u1', allocation_pct: 101 }]);
    }).toThrowError('allocation_invalid');
    expect(() => {
      assertAllocationComplete([]);
    }).toThrowError('pending_assignment');
  });

  it('filters assignments outside the period', () => {
    expect(
      isEligibleAssignment(
        { status: 'active', effective_from: '2026-08-01', effective_to: null },
        '2026-08-01',
        '2026-08-31'
      )
    ).toBe(true);
    expect(
      isEligibleAssignment(
        { status: 'active', effective_from: '2026-09-01', effective_to: null },
        '2026-08-01',
        '2026-08-31'
      )
    ).toBe(false);
    expect(isEligibleAssignment({ status: 'inactive' }, '2026-08-01', '2026-08-31')).toBe(false);
  });

  it('blocks irreversible operations on test periods', () => {
    const period = { is_test_period: true, state: 'open' as const };
    expect(() => {
      assertTestPeriodOperation(period, 'calculate');
    }).not.toThrow();
    expect(() => {
      assertTestPeriodOperation(period, 'lock');
    }).toThrowError('test_period_operation_blocked');
    expect(() => {
      assertTestPeriodOperation(period, 'pay');
    }).toThrowError('test_period_operation_blocked');
    expect(() => {
      assertTestPeriodOperation(period, 'post');
    }).toThrowError('test_period_operation_blocked');
  });

  it('derives the protected total commission', () => {
    expect(deriveTotalCommission(1000, 150, 25, 75)).toBe(1100);
    expect(() => deriveTotalCommission(-1, 0, 0, 0)).toThrowError('commission_amount_invalid');
  });
});
