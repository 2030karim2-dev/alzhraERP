import type { Json } from '../../../core/database.types';
import type {
  CommissionCalculationStatus,
  CommissionPeriod,
  CommissionPeriodState,
  CommissionPlan,
  CommissionPlanStatus,
  CommissionRule,
  CommissionRuleType,
  CommissionCalculationMethod,
  PendingInvoice,
} from '../types';

export const periodStates = ['open', 'calculating', 'calculated', 'under_review', 'approved', 'locked', 'paid'] as const satisfies readonly CommissionPeriodState[];
export const calculationStatuses = ['draft', 'calculated', 'eligible', 'approved', 'partially_paid', 'paid', 'cancelled', 'reversed'] as const satisfies readonly CommissionCalculationStatus[];
export const planStatuses = ['draft', 'active', 'inactive'] as const satisfies readonly CommissionPlanStatus[];
export const planBases = ['sales', 'gross_profit', 'collected_amount', 'hybrid'] as const;
export const collectionModes = ['on_collected_only', 'pending_until_collected'] as const;
export const tierMethods = ['progressive', 'flat'] as const;
export const ruleTypes = ['sales', 'profit', 'collection', 'invoice_count', 'customer_count', 'target_achievement', 'product_category', 'brand', 'branch', 'customer_type'] as const satisfies readonly CommissionRuleType[];
export const calculationMethods = ['percentage', 'fixed_amount', 'tiered'] as const satisfies readonly CommissionCalculationMethod[];
export const pendingInvoiceStatuses = ['pending', 'assigned', 'resolved', 'ignored'] as const;

export function parseEnum<T extends string>(value: string, allowed: readonly T[], field: string): T {
  if (allowed.includes(value as T)) return value as T;
  throw new Error(`قيمة ${field} غير مدعومة: ${value}`);
}

export function parseCommissionPlan(row: Omit<CommissionPlan, 'calculation_basis' | 'status' | 'collection_mode' | 'tier_method'> & {
  calculation_basis: string;
  status: string;
  collection_mode: string;
  tier_method: string;
}): CommissionPlan {
  return {
    ...row,
    calculation_basis: parseEnum(row.calculation_basis, planBases, 'أساس الحساب'),
    status: parseEnum(row.status, planStatuses, 'حالة الخطة'),
    collection_mode: parseEnum(row.collection_mode, collectionModes, 'طريقة التحصيل'),
    tier_method: parseEnum(row.tier_method, tierMethods, 'طريقة الشرائح'),
  };
}

export function parseCommissionRule(row: Omit<CommissionRule, 'rule_type' | 'calculation_method' | 'conditions'> & {
  rule_type: string;
  calculation_method: string;
  conditions: Json | null;
}): CommissionRule {
  return {
    ...row,
    rule_type: parseEnum(row.rule_type, ruleTypes, 'نوع القاعدة'),
    calculation_method: parseEnum(row.calculation_method, calculationMethods, 'طريقة الحساب'),
    conditions: row.conditions as CommissionRule['conditions'],
  };
}

export function parseCommissionPeriod(row: Omit<CommissionPeriod, 'state'> & { state: string }): CommissionPeriod {
  return { ...row, state: parseEnum(row.state, periodStates, 'حالة الفترة') };
}

export function parseCommissionCalculation<T extends { status: string }>(row: T): Omit<T, 'status'> & { status: CommissionCalculationStatus } {
  return { ...row, status: parseEnum(row.status, calculationStatuses, 'حالة الحساب') };
}

export function parsePendingInvoice<T extends { status: string }>(row: T): Omit<T, 'status'> & { status: PendingInvoice['status'] } {
  return { ...row, status: parseEnum(row.status, pendingInvoiceStatuses, 'حالة الفاتورة') };
}
