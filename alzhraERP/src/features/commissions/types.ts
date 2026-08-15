export type CommissionPeriodState = 'open' | 'calculating' | 'calculated' | 'under_review' | 'approved' | 'locked' | 'paid';

export type CommissionCalculationStatus = 'draft' | 'calculated' | 'eligible' | 'approved' | 'partially_paid' | 'paid' | 'cancelled' | 'reversed';

export interface CommissionPeriod {
  id: string;
  company_id: string;
  branch_id: string | null;
  period_label: string;
  period_start: string;
  period_end: string;
  state: CommissionPeriodState;
  is_test_period: boolean;
  currency_code: string;
  calculated_at: string | null;
}

export interface CommissionCalculation {
  id: string;
  period_id: string;
  user_id: string;
  gross_sales: number;
  net_sales: number;
  collected_amount: number;
  invoice_count: number;
  customer_count: number;
  base_commission: number;
  bonus_amount: number;
  adjustment_amount: number;
  deduction_amount: number;
  total_commission: number;
  currency_code: string;
  status: CommissionCalculationStatus;
}

export interface PendingInvoice {
  id: string;
  invoice_id: string;
  branch_id: string | null;
  status: 'pending' | 'assigned' | 'resolved' | 'ignored';
  detected_at: string;
  reason: string | null;
}

export type CommissionPlanStatus = 'draft' | 'active' | 'inactive';
export type CommissionRuleType = 'sales' | 'profit' | 'collection' | 'invoice_count' | 'customer_count' | 'target_achievement' | 'product_category' | 'brand' | 'branch' | 'customer_type';
export type CommissionCalculationMethod = 'percentage' | 'fixed_amount' | 'tiered';

export interface CommissionPlan {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  calculation_basis: 'sales' | 'gross_profit' | 'collected_amount' | 'hybrid';
  currency_code: string;
  status: CommissionPlanStatus;
  effective_from: string | null;
  effective_to: string | null;
  collection_mode: 'on_collected_only' | 'pending_until_collected';
  tier_method: 'progressive' | 'flat';
  tier_currency_code: string | null;
}

export interface CommissionRule {
  id: string;
  company_id: string;
  plan_id: string;
  name: string;
  rule_type: CommissionRuleType;
  calculation_method: CommissionCalculationMethod;
  threshold_min: number | null;
  threshold_max: number | null;
  rate: number | null;
  fixed_amount: number | null;
  priority: number;
  conditions: Record<string, unknown> | null;
  is_active: boolean;
}

export interface CommissionTier {
  id: string;
  company_id: string;
  plan_id: string;
  rule_id: string | null;
  from_amount: number;
  to_amount: number | null;
  rate: number | null;
  fixed_bonus: number | null;
  tier_order: number;
  tier_currency_code: string;
}

export interface CommissionDashboardData {
  periods: CommissionPeriod[];
  calculations: CommissionCalculation[];
  pending: PendingInvoice[];
}

export interface CommissionEngineResult {
  success: boolean;
  calculations_created: number;
}
