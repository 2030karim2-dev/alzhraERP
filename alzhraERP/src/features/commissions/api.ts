import { supabase } from '../../lib/supabaseClient';
import { logger } from '../../core/utils/logger';
import type { Json } from '../../core/database.types';
import type { CommissionCalculation, CommissionEngineResult, CommissionPeriod, PendingInvoice, CommissionPlan, CommissionRule, CommissionTier, CommissionPeriodState } from './types';
import { parseCommissionCalculation, parseCommissionPeriod, parseCommissionPlan, parseCommissionRule, parsePendingInvoice } from './api/parsers';

const db = supabase;

function safeError(error: unknown, fallback: string): Error {
  const message = error instanceof Error ? error.message : fallback;
  logger.warn('commission-api', fallback, { message });
  return new Error(fallback);
}


export async function listCommissionPeriods(companyId: string): Promise<CommissionPeriod[]> {
  const { data, error } = await db
    .from('incentive_periods')
    .select(
      'id, company_id, branch_id, period_label, period_start, period_end, state, is_test_period, currency_code, calculated_at'
    )
    .eq('company_id', companyId)
    .order('period_start', { ascending: false })
    .limit(24);
  if (error) throw safeError(error, 'تعذر تحميل فترات العمولات');
  return data.map(parseCommissionPeriod);
}

export async function listCommissionCalculations(
  companyId: string,
  periodId: string
): Promise<CommissionCalculation[]> {
  const { data, error } = await db
    .from('incentive_calculations')
    .select(
      'id, period_id, user_id, gross_sales, net_sales, collected_amount, invoice_count, customer_count, base_commission, bonus_amount, adjustment_amount, deduction_amount, total_commission, currency_code, status'
    )
    .eq('company_id', companyId)
    .eq('period_id', periodId)
    .not('status', 'in', '(cancelled,reversed)')
    .order('total_commission', { ascending: false })
    .limit(500);
  if (error) throw safeError(error, 'تعذر تحميل حسابات العمولات');
  return data.map(parseCommissionCalculation);
}

export async function listPendingInvoices(companyId: string): Promise<PendingInvoice[]> {
  const { data, error } = await db
    .from('incentive_pending_invoices')
    .select('id, invoice_id, branch_id, status, detected_at, reason')
    .eq('company_id', companyId)
    .in('status', ['pending', 'assigned'])
    .order('detected_at', { ascending: false })
    .limit(500);
  if (error) throw safeError(error, 'تعذر تحميل قائمة الفواتير المعلقة');
  return data.map(parsePendingInvoice);
}

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
    p_threshold_min: input.threshold_min ?? null,
    p_threshold_max: input.threshold_max ?? null,
    p_rate: input.rate ?? null,
    p_fixed_amount: input.fixed_amount ?? null,
    p_priority: input.priority ?? 0,
    p_conditions: input.conditions ?? null,
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
    p_description: input.description ?? null,
    p_calculation_basis: input.calculation_basis,
    p_currency_code: input.currency_code,
    p_collection_mode: input.collection_mode ?? 'on_collected_only',
    p_tier_method: input.tier_method ?? 'flat',
    p_tier_currency_code: null,
    p_effective_from: null,
    p_effective_to: null,
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
    p_name: patch.name ?? null,
    p_description: patch.description ?? null,
    p_calculation_basis: null,
    p_status: patch.status ?? null,
    p_effective_to: patch.effective_to ?? null,
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

export async function calculateCommissionPeriod(
  companyId: string,
  periodId: string
): Promise<CommissionEngineResult> {
  const { data, error } = await db.rpc('incentive_calculate_period', {
    p_company_id: companyId,
    p_period_id: periodId,
  });
  if (error) throw safeError(error, 'تعذر تشغيل محرك العمولات لهذه الفترة');
  return { success: true, calculations_created: data };
}

export async function createEngineerLink(input: {
  invoiceId: string;
  companyId: string;
  userId: string;
  allocationPct: number;
  assignmentType?: 'direct' | 'historical' | 'temporary';
  reason?: string | null;
  source?: 'manual' | 'historical' | 'import';
}): Promise<string> {
  const { data, error } = await db.rpc('incentive_create_engineer_link', {
    p_invoice_id: input.invoiceId,
    p_company_id: input.companyId,
    p_user_id: input.userId,
    p_allocation_pct: input.allocationPct,
    p_assignment_type: input.assignmentType ?? 'direct',
    p_reason: input.reason ?? null,
    p_source: input.source ?? 'manual',
  });
  if (error)
    throw safeError(error, 'تعذر حفظ توزيع المهندس؛ يجب أن يكتمل مجموع التوزيعات ذريًا إلى 100٪');
  return data;
}

export async function resolvePendingInvoice(input: {
  pendingId: string;
  companyId: string;
  status: 'resolved' | 'ignored';
  reason?: string | null;
}): Promise<void> {
  const { error } = await db.rpc('incentive_mark_pending_resolved', {
    p_pending_id: input.pendingId,
    p_company_id: input.companyId,
    p_status: input.status,
    p_reason: input.reason ?? null,
  });
  if (error) throw safeError(error, 'تعذر تحديث حالة الفاتورة المعلقة');
}

export async function getCommissionSummary(companyId: string, periodId: string): Promise<{
  calculations: CommissionCalculation[];
  pending: PendingInvoice[];
  totalCommission: number;
  collectedAmount: number;
  invoiceCount: number;
}> {
  const [calculations, pending] = await Promise.all([
    listCommissionCalculations(companyId, periodId),
    listPendingInvoices(companyId),
  ]);
  return {
    calculations,
    pending,
    totalCommission: calculations.reduce((sum, row) => sum + (row.total_commission || 0), 0),
    collectedAmount: calculations.reduce((sum, row) => sum + (row.collected_amount || 0), 0),
    invoiceCount: calculations.reduce((sum, row) => sum + (row.invoice_count || 0), 0),
  };
}

export async function transitionCommissionPeriod(input: {
  periodId: string;
  companyId: string;
  newState: CommissionPeriodState;
  permission: string;
}): Promise<void> {
  const { error } = await db.rpc('incentive_period_transition', {
    p_period_id: input.periodId,
    p_company_id: input.companyId,
    p_new_state: input.newState,
    p_by_permission: input.permission,
  });
  if (error)
    throw safeError(error, 'تعذر انتقال الفترة؛ قد تكون الحالة غير مسموحة أو الفترة تجريبية محمية');
}

export async function detectPendingInvoices(
  companyId: string,
  branchId?: string | null
): Promise<number> {
  const { data, error } = await db.rpc('incentive_detect_pending_invoices', {
    p_company_id: companyId,
    p_branch_id: branchId ?? null,
  });
  if (error) throw safeError(error, 'تعذر تحديث قائمة الفواتير المعلقة');
  return data;
}
