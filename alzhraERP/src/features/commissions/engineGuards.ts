import type { CommissionPeriodState } from './types';

export interface EngineerAllocation {
  user_id: string;
  allocation_pct: number;
  is_historical?: boolean;
}

export function assertAllocationComplete(allocations: EngineerAllocation[], tolerance = 0.0001): void {
  if (allocations.length === 0) throw new Error('pending_assignment');
  const total = allocations.reduce((sum, item) => sum + item.allocation_pct, 0);
  if (allocations.some(item => !Number.isFinite(item.allocation_pct) || item.allocation_pct <= 0 || item.allocation_pct > 100)) {
    throw new Error('allocation_invalid');
  }
  if (Math.abs(total - 100) > tolerance) throw new Error('allocation_overflow');
}

export function isEligibleAssignment(input: { status: string; effective_from?: string | null; effective_to?: string | null }, periodStart: string, periodEnd: string): boolean {
  if (input.status !== 'active') return false;
  if (input.effective_from !== undefined && input.effective_from !== null && input.effective_from > periodEnd) return false;
  if (input.effective_to !== undefined && input.effective_to !== null && input.effective_to < periodStart) return false;
  return true;
}

export function assertTestPeriodOperation(period: { is_test_period: boolean; state: CommissionPeriodState }, operation: 'assign' | 'review' | 'approve' | 'calculate' | 'lock' | 'pay' | 'post' | 'void'): void {
  if (period.is_test_period && ['lock', 'pay', 'post', 'void'].includes(operation)) {
    throw new Error('test_period_operation_blocked');
  }
}

export function deriveTotalCommission(base: number, bonus: number, adjustment: number, deduction: number): number {
  const values = [base, bonus, adjustment, deduction];
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw new Error('commission_amount_invalid');
  return Number((base + bonus + adjustment - deduction).toFixed(2));
}
