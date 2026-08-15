import { describe, expect, it } from 'vitest';
import { canManagePlans, canTransitionPeriod, canViewCalculation, canViewPeriod, type CommissionActor } from './authorization';
import type { CommissionPeriod } from './types';

const period: CommissionPeriod = {
  id: 'p1', company_id: 'c1', branch_id: 'b1', period_label: 'أغسطس 2026',
  period_start: '2026-08-01', period_end: '2026-08-31', state: 'open',
  is_test_period: true, currency_code: 'SAR', calculated_at: null,
};

const owner: CommissionActor = { id: 'u1', company_id: 'c1', role: 'owner', branch_id: 'b1' };
const engineer: CommissionActor = { id: 'u2', company_id: 'c1', role: 'engineer', branch_id: 'b1' };

describe('commission authorization', () => {
  it('restricts plan management to finance roles', () => {
    expect(canManagePlans(owner)).toBe(true);
    expect(canManagePlans(engineer)).toBe(false);
  });

  it('enforces tenant and branch isolation for periods', () => {
    expect(canViewPeriod(owner, period)).toBe(true);
    expect(canViewPeriod({ ...engineer, branch_id: 'b2' }, period)).toBe(false);
    expect(canViewPeriod({ ...owner, company_id: 'c2' }, period)).toBe(false);
  });

  it('allows an engineer to see only their own calculation', () => {
    const calc = { company_id: 'c1', branch_id: 'b1', user_id: 'u2' };
    expect(canViewCalculation(engineer, calc)).toBe(true);
    expect(canViewCalculation(engineer, { ...calc, user_id: 'u3' })).toBe(false);
  });

  it('blocks lock and pay transitions for test periods', () => {
    expect(canTransitionPeriod(owner, period, 'calculating')).toBe(true);
    expect(canTransitionPeriod(owner, { ...period, state: 'approved' }, 'locked')).toBe(false);
    expect(canTransitionPeriod(owner, { ...period, state: 'locked' }, 'paid')).toBe(false);
  });
});
