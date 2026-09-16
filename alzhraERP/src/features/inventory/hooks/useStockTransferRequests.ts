import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BranchVisibilityPeer {
  branch_id: string;
  branch_name: string;
  integration_mode: string;
}

export type TransferRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface StockTransferRequest {
  id: string;
  company_id: string;
  requester_branch_id: string;
  requester_branch_name?: string;
  source_branch_id: string;
  source_branch_name?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  requested_quantity: number;
  status: TransferRequestStatus;
  notes?: string | null;
  review_notes?: string | null;
  created_by?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransferRequestDTO {
  productId: string;
  sourceBranchId: string;
  quantity: number;
  notes?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase raw helper — جداول branch_visibility_* غير موجودة بعد في types
// سيتم تحديث types بعد تطبيق المigration والتزامن مع CLI
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─────────────────────────────────────────────────────────────────────────────
// Hook: رؤية المخزون — يجلب الفروع التي يجوز لفرعي رؤية مخزونها
// ─────────────────────────────────────────────────────────────────────────────

export function useInventoryVisibilityGroup(branchId?: string | null) {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  return useQuery<BranchVisibilityPeer[]>({
    queryKey: ['branch_visibility_group', companyId, branchId],
    enabled: !!companyId && !!branchId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. أوجد المجموعات التي ينتمي إليها هذا الفرع
      const { data: memberOf, error: e1 } = await db
        .from('branch_visibility_members')
        .select('group_id')
        .eq('branch_id', branchId)
        .eq('company_id', companyId);

      if (e1) throw e1;
      if (!memberOf || memberOf.length === 0) return [];

      const groupIds = (memberOf as Array<{ group_id: string }>).map(m => m.group_id);

      // 2. أوجد بقية الأعضاء في تلك المجموعات
      const { data: peers, error: e2 } = await db
        .from('branch_visibility_members')
        .select('branch_id, branches:branches!branch_id(id, name, integration_mode)')
        .in('group_id', groupIds)
        .eq('company_id', companyId)
        .neq('branch_id', branchId);

      if (e2) throw e2;

      return (
        (peers || []) as Array<{
          branch_id: string;
          branches: { name: string; integration_mode: string } | null;
        }>
      ).map(p => ({
        branch_id: p.branch_id,
        branch_name: p.branches?.name ?? 'فرع غير معروف',
        integration_mode: p.branches?.integration_mode ?? 'independent',
      }));
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: طلبات نقل المخزون
// ─────────────────────────────────────────────────────────────────────────────

export function useStockTransferRequests(
  filter: 'all' | 'incoming' | 'outgoing' = 'all',
  branchId?: string | null
) {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: ['stock_transfer_requests', companyId, branchId, filter] as const,
    enabled: !!companyId,
    staleTime: 30_000,
    queryFn: async (): Promise<StockTransferRequest[]> => {
      let query = db
        .from('stock_transfer_requests')
        .select(
          `
          id, company_id, requester_branch_id, source_branch_id,
          product_id, requested_quantity, status, notes, review_notes,
          created_by, reviewed_by, created_at, updated_at,
          requester_branch:branches!requester_branch_id(name),
          source_branch:branches!source_branch_id(name),
          product:products!product_id(name_ar, sku)
        `
        )
        .eq('company_id', companyId);

      if (branchId) {
        if (filter === 'incoming') query = query.eq('source_branch_id', branchId);
        else if (filter === 'outgoing') query = query.eq('requester_branch_id', branchId);
        else query = query.or(`requester_branch_id.eq.${branchId},source_branch_id.eq.${branchId}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data || []) as any[]).map(
        (r: any) =>
          ({
            ...r,
            requester_branch_name: r.requester_branch?.name,
            source_branch_name: r.source_branch?.name,
            product_name: r.product?.name_ar,
            product_sku: r.product?.sku,
          }) as StockTransferRequest
      );
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation: إنشاء طلب نقل مخزون
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateStockTransferRequest() {
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requesterBranchId,
      dto,
    }: {
      requesterBranchId: string;
      dto: CreateTransferRequestDTO;
    }) => {
      if (!user?.company_id || !user?.id) {
        throw new Error('جلسة العمل منتهية، يرجى إعادة تسجيل الدخول');
      }
      const { data, error } = await db.rpc('create_stock_transfer_request', {
        p_company_id: user.company_id,
        p_requester_branch_id: requesterBranchId,
        p_source_branch_id: dto.sourceBranchId,
        p_product_id: dto.productId,
        p_quantity: dto.quantity,
        p_notes: dto.notes ?? null,
        p_user_id: user.id,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: () => {
      showToast('تم إرسال طلب نقل المخزون بنجاح ✅', 'success');
      qc.invalidateQueries({ queryKey: ['stock_transfer_requests'] });
    },
    onError: (err: Error) => {
      showToast(err.message || 'فشل في إرسال طلب النقل', 'error');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation: الاستجابة لطلب نقل (موافقة / رفض / إلغاء)
// ─────────────────────────────────────────────────────────────────────────────

export function useRespondToTransferRequest() {
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      action: 'approve' | 'reject' | 'cancel';
      reviewNotes?: string;
    }) => {
      if (!user?.company_id || !user?.id) {
        throw new Error('جلسة العمل منتهية، يرجى إعادة تسجيل الدخول');
      }
      const { error } = await db.rpc('respond_stock_transfer_request', {
        p_request_id: params.requestId,
        p_action: params.action,
        p_review_notes: params.reviewNotes ?? null,
        p_user_id: user.id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      const label =
        vars.action === 'approve' ? 'موافقة' : vars.action === 'reject' ? 'رفض' : 'إلغاء';
      showToast(`تمت ${label} طلب النقل بنجاح`, 'success');
      qc.invalidateQueries({ queryKey: ['stock_transfer_requests'] });
      if (vars.action === 'approve') {
        qc.invalidateQueries({ queryKey: ['products'] });
        qc.invalidateQueries({ queryKey: ['warehouse_distribution'] });
        qc.invalidateQueries({ queryKey: ['branches'] });
        qc.invalidateQueries({ queryKey: ['branch_inventory'] });
      }
    },
    onError: (err: Error) => {
      showToast(err.message || 'فشلت العملية', 'error');
    },
  });
}
