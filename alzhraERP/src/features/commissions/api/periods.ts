import type {
  CommissionCalculation,
  CommissionEngineResult,
  CommissionPeriod,
  CommissionPeriodState,
} from '../types';
import { parseCommissionCalculation, parseCommissionPeriod } from './parsers';
import { db, safeError } from './shared';
import { listPendingInvoices } from './engineer';

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

export async function getCommissionSummary(companyId: string, periodId: string): Promise<{
  calculations: CommissionCalculation[];
  pending: Awaited<ReturnType<typeof listPendingInvoices>>;
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
