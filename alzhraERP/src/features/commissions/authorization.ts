import type { CommissionPeriod } from './types';

export type CommissionRole = 'engineer' | 'branch_manager' | 'finance_manager' | 'admin' | 'owner';

export interface CommissionActor {
  id: string;
  company_id: string;
  role: CommissionRole;
  branch_id?: string | null;
}

const PLAN_ROLES: ReadonlySet<CommissionRole> = new Set(['finance_manager', 'admin', 'owner']);
const GLOBAL_ROLES: ReadonlySet<CommissionRole> = new Set(['finance_manager', 'admin', 'owner']);

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
