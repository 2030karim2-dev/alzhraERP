import type { Json } from '../../../core/database.types';
import type { CommissionPlan, CommissionRule, CommissionTier } from '../types';
import { parseCommissionPlan, parseCommissionRule } from './parsers';
import { db, safeError } from './shared';

export async function listCommissionPlans(companyId: string): Promise<CommissionPlan[]> {
  const { data, error } = await db
    .from('incentive_plans')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw safeError(error, 'تعذر تحميل خطط العمولات');
  return data.map(row => parseCommissionPlan(row));
}

export async function listCommissionRules(
  companyId: string,
  planId: string
): Promise<CommissionRule[]> {
  const { data, error } = await db
    .from('incentive_rules')
    .select('*')
    .eq('company_id', companyId)
    .eq('plan_id', planId)
    .is('deleted_at', null)
    .order('priority', { ascending: true })
    .limit(200);
  if (error) throw safeError(error, 'تعذر تحميل قواعد الخطة');
  return data.map(row => parseCommissionRule({
    ...row,
    conditions: row.conditions,
  }));
}

export async function listCommissionTiers(
  companyId: string,
  planId: string
): Promise<CommissionTier[]> {
  const { data, error } = await db
    .from('incentive_tiers')
    .select('*')
    .eq('company_id', companyId)
    .eq('plan_id', planId)
    .order('tier_order', { ascending: true })
    .limit(200);
  if (error) throw safeError(error, 'تعذر تحميل شرائح الخطة');
  return data;
}

export async function createCommissionRule(input: {
  company_id: string;
  plan_id: string;
  name: string;
  rule_type: CommissionRule['rule_type'];
  calculation_method: CommissionRule['calculation_method'];
  threshold_min?: number | null;
  threshold_max?: number | null;
  rate?: number | null;
  fixed_amount?: number | null;
  priority?: number;
  conditions?: Json | null;
}): Promise<CommissionRule> {
  const { data: ruleId, error } = await db.rpc('incentive_create_rule', {
    p_company_id: input.company_id,
    p_plan_id: input.plan_id,
    p_name: input.name.trim(),
    p_rule_type: input.rule_type,
    p_calculation_method: input.calculation_method,
    ...(input.threshold_min != null ? { p_threshold_min: input.threshold_min } : {}),
    ...(input.threshold_max != null ? { p_threshold_max: input.threshold_max } : {}),
    ...(input.rate != null ? { p_rate: input.rate } : {}),
    ...(input.fixed_amount != null ? { p_fixed_amount: input.fixed_amount } : {}),
    p_priority: input.priority ?? 0,
    ...(input.conditions != null ? { p_conditions: input.conditions } : {}),
  });
  if (error) throw safeError(error, 'تعذر إنشاء قاعدة العمولة عبر العملية الآمنة');
  const { data, error: readError } = await db
    .from('incentive_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('company_id', input.company_id)
    .eq('plan_id', input.plan_id)
    .single();
  if (readError) throw safeError(readError, 'تم إنشاء القاعدة لكن تعذر تحميل بياناتها');
  return parseCommissionRule(data);
}

export async function createCommissionPlan(input: {
  company_id: string;
  name: string;
  description?: string | null;
  calculation_basis: CommissionPlan['calculation_basis'];
  currency_code: string;
  collection_mode?: CommissionPlan['collection_mode'];
  tier_method?: CommissionPlan['tier_method'];
}): Promise<CommissionPlan> {
  const { data: planId, error } = await db.rpc('incentive_create_plan', {
    p_company_id: input.company_id,
    p_name: input.name,
    ...(input.description != null ? { p_description: input.description } : {}),
    p_calculation_basis: input.calculation_basis,
    p_currency_code: input.currency_code,
    p_collection_mode: input.collection_mode ?? 'on_collected_only',
    p_tier_method: input.tier_method ?? 'flat',
  });
  if (error) throw safeError(error, 'تعذر إنشاء خطة العمولات عبر العملية الآمنة');
  const { data, error: readError } = await db
    .from('incentive_plans')
    .select('*')
    .eq('id', planId)
    .eq('company_id', input.company_id)
    .single();
  if (readError) throw safeError(readError, 'تم إنشاء الخطة لكن تعذر تحميل بياناتها');
  return parseCommissionPlan(data);
}

export async function updateCommissionPlan(
  id: string,
  companyId: string,
  patch: Partial<
    Pick<
      CommissionPlan,
      | 'name'
      | 'description'
      | 'status'
      | 'effective_from'
      | 'effective_to'
    >
  >
): Promise<CommissionPlan> {
  const { error } = await db.rpc('incentive_update_plan', {
    p_plan_id: id,
    p_company_id: companyId,
    ...(patch.name != null ? { p_name: patch.name } : {}),
    ...(patch.description != null ? { p_description: patch.description } : {}),
    ...(patch.status != null ? { p_status: patch.status } : {}),
    ...(patch.effective_to != null ? { p_effective_to: patch.effective_to } : {}),
  });
  if (error) throw safeError(error, 'تعذر تحديث خطة العمولات عبر العملية الآمنة');
  const { data, error: readError } = await db
    .from('incentive_plans')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single();
  if (readError) throw safeError(readError, 'تم تحديث الخطة لكن تعذر تحميل بياناتها');
  return parseCommissionPlan(data);
}
