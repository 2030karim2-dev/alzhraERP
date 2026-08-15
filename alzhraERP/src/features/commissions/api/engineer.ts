import type { PendingInvoice } from '../types';
import { parsePendingInvoice } from './parsers';
import { db, safeError } from './shared';

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
