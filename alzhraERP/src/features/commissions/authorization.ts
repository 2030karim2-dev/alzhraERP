import type { CommissionPeriod, CommissionPeriodState } from './types';

export type CommissionRole = 'engineer' | 'branch_manager' | 'finance_manager' | 'manager' | 'admin' | 'owner';

export interface CommissionActor {
  id: string;
  company_id: string;
  role: CommissionRole;
  branch_id?: string | null;
}

const PLAN_ROLES: ReadonlySet<CommissionRole> = new Set(['finance_manager', 'manager', 'admin', 'owner']);
const GLOBAL_ROLES: ReadonlySet<CommissionRole> = new Set(['finance_manager', 'manager', 'admin', 'owner']);

// ---------------------------------------------------------------------------
// Unified commission permission contract (prefix `incentive:*`)
// Mirrors the RPC-side permission names in alzhra100 so the UI and the
// PostgreSQL functions stay consistent.
// ---------------------------------------------------------------------------

export const COMMISSION_PERMISSIONS = {
  managePlans: 'incentive:manage_plans',
  calculatePeriod: 'incentive:calculate_period',
  period: {
    calculating: 'incentive:period_calculating',
    calculated: 'incentive:period_calculated',
    underReview: 'incentive:period_under_review',
    approved: 'incentive:period_approved',
    locked: 'incentive:period_locked',
    paid: 'incentive:period_paid',
  },
} as const;

/**
 * Roles treated as commission managers in the frontend. `finance_manager` is a
 * commission-domain role; on the server it maps to the `admin`/`manager` system
 * roles (see `user_is_admin_or_manager()`). `owner` always bypasses.
 */
const FRONTEND_MANAGER_ROLES: ReadonlySet<string> = new Set(['admin', 'owner', 'finance_manager', 'manager']);

/** UI gate for managing plans/rules/tiers. Server enforces the real check. */
export function canManagePlansByAccess(permissions: readonly string[], role: string | undefined): boolean {
  return permissions.includes(COMMISSION_PERMISSIONS.managePlans) || (role !== undefined && FRONTEND_MANAGER_ROLES.has(role));
}

/** UI gate for running the atomic period calculation. Server enforces the real check. */
export function canCalculatePeriodByAccess(permissions: readonly string[], role: string | undefined): boolean {
  return permissions.includes(COMMISSION_PERMISSIONS.calculatePeriod) || (role !== undefined && FRONTEND_MANAGER_ROLES.has(role));
}

/** Permission required to move a period INTO the given state (RPC contract). */
export function transitionPermission(state: CommissionPeriodState): string {
  switch (state) {
    case 'open': return COMMISSION_PERMISSIONS.period.calculating;
    case 'calculating': return COMMISSION_PERMISSIONS.period.calculated;
    case 'calculated': return COMMISSION_PERMISSIONS.period.underReview;
    case 'under_review': return COMMISSION_PERMISSIONS.period.approved;
    case 'approved': return COMMISSION_PERMISSIONS.period.locked;
    case 'locked': return COMMISSION_PERMISSIONS.period.paid;
    case 'paid': return COMMISSION_PERMISSIONS.period.paid;
  }
}

export function canManagePlans(actor: CommissionActor): boolean {
  return PLAN_ROLES.has(actor.role);
}

export function canViewPeriod(actor: CommissionActor, period: CommissionPeriod): boolean {
  if (actor.company_id !== period.company_id) return false;
  if (GLOBAL_ROLES.has(actor.role)) return true;
  if (actor.role === 'branch_manager') return actor.branch_id !== null && actor.branch_id === period.branch_id;
  return false;
}

export function canViewCalculation(actor: CommissionActor, calculation: { company_id?: string; user_id: string; branch_id?: string | null }): boolean {
  if (actor.company_id !== calculation.company_id) return false;
  if (GLOBAL_ROLES.has(actor.role)) return true;
  if (actor.role === 'engineer') return actor.id === calculation.user_id;
  return actor.role === 'branch_manager' && actor.branch_id !== null && actor.branch_id === calculation.branch_id;
}

export function canTransitionPeriod(actor: CommissionActor, period: CommissionPeriod, target: CommissionPeriod['state']): boolean {
  if (!canViewPeriod(actor, period) || !GLOBAL_ROLES.has(actor.role)) return false;
  if (period.is_test_period && ['locked', 'paid'].includes(target)) return false;
  const transitions: Record<CommissionPeriod['state'], Array<CommissionPeriod['state']>> = {
    open: ['calculating'],
    calculating: ['calculated'],
    calculated: ['under_review'],
    under_review: ['approved'],
    approved: ['locked'],
    locked: ['paid'],
    paid: [],
  };
  return transitions[period.state].includes(target);
}
