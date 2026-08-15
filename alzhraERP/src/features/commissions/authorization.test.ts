import { describe, expect, it } from 'vitest';
import {
  canCalculatePeriodByAccess,
  canManagePlans,
  canManagePlansByAccess,
  canTransitionPeriod,
  canViewCalculation,
  canViewPeriod,
  COMMISSION_PERMISSIONS,
  transitionPermission,
  type CommissionActor,
} from './authorization';
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

  it('grants plan management via the incentive permission or manager roles', () => {
    expect(canManagePlansByAccess([COMMISSION_PERMISSIONS.managePlans], 'engineer')).toBe(true);
    expect(canManagePlansByAccess([], 'admin')).toBe(true);
    expect(canManagePlansByAccess([], 'owner')).toBe(true);
    expect(canManagePlansByAccess([], 'manager')).toBe(true);
    expect(canManagePlansByAccess([], 'finance_manager')).toBe(true);
    expect(canManagePlansByAccess([], 'engineer')).toBe(false);
    expect(canManagePlansByAccess([], undefined)).toBe(false);
  });

  it('grants period calculation via the incentive permission or manager roles', () => {
    expect(canCalculatePeriodByAccess([COMMISSION_PERMISSIONS.calculatePeriod], 'engineer')).toBe(true);
    expect(canCalculatePeriodByAccess([], 'admin')).toBe(true);
    expect(canCalculatePeriodByAccess([], 'engineer')).toBe(false);
    expect(canCalculatePeriodByAccess([], undefined)).toBe(false);
  });

  it('maps each period state to its RPC transition permission', () => {
    expect(transitionPermission('open')).toBe('incentive:period_calculating');
    expect(transitionPermission('calculating')).toBe('incentive:period_calculated');
    expect(transitionPermission('calculated')).toBe('incentive:period_under_review');
    expect(transitionPermission('under_review')).toBe('incentive:period_approved');
    expect(transitionPermission('approved')).toBe('incentive:period_locked');
    expect(transitionPermission('locked')).toBe('incentive:period_paid');
    expect(transitionPermission('paid')).toBe('incentive:period_paid');
  });
});
