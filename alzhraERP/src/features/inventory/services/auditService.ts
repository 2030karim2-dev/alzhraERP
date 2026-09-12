// Audit Service - Handles stock audit operations
import { supabase } from '../../../lib/supabaseClient';
import { parseError } from '@/core/utils/errorUtils';

export type DeleteAuditItemParams =
  | string
  | {
      itemId?: string | undefined;
      sessionId?: string | undefined;
      productId?: string | undefined;
    };

interface AuditItemInput {
  id?: string;
  product_id: string;
  counted_quantity: number | null;
}

interface AuditProductRow {
  name_ar?: string;
  sku?: string | null;
  part_number?: string | null;
  brand?: string | null;
  size?: string | null;
  product_categories?: { name?: string } | null;
}

export const auditService = {
  /**
   * Start a new audit session
   */
  startAudit: async (
    data: { warehouse_id: string; title: string },
    companyId: string,
    userId: string
  ) => {
    const response = await supabase
      .from('audit_sessions')
      .insert({
        company_id: companyId,
        warehouse_id: data.warehouse_id,
        title: data.title,
        created_by: userId,
        status: 'active',
      })
      .select()
      .single();

    const session = response.data as unknown as { id: string };
    const error = response.error;

    if (error) throw error;

    // The session starts empty, allowing the user to scan and add items manually.

    return session;
  },

  /**
   * Add a single item to an active audit session
   */
  addAuditItem: async (
    sessionId: string,
    productId: string,
    expectedQuantity = 0,
    companyId: string,
    userId: string
  ) => {
    try {
      const rpc = supabase.rpc as unknown as (
        fn: string,
        params: Record<string, unknown>
      ) => Promise<{ data: unknown; error: unknown }>;
      const { data: rpcData, error: rpcError } = await rpc('add_audit_session_item', {
        p_session_id: sessionId,
        p_product_id: productId,
      });
      if (!rpcError && rpcData) {
        return rpcData as Record<string, unknown>;
      }
    } catch {
      // fallback to legacy path below
    }

    // Fallback: Fetch session warehouse_id to get accurate warehouse-specific stock
    const { data: session } = await supabase
      .from('audit_sessions')
      .select('warehouse_id')
      .eq('id', sessionId)
      .single();
    let calculatedExpectedQuantity = expectedQuantity;

    if (session?.warehouse_id) {
      const { data: stockData } = await supabase
        .from('product_stock')
        .select('quantity')
        .eq('product_id', productId)
        .eq('warehouse_id', session.warehouse_id)
        .maybeSingle();

      if (stockData) {
        calculatedExpectedQuantity = Number(stockData.quantity) || 0;
      } else {
        calculatedExpectedQuantity = 0;
      }
    }

    const { data, error } = await supabase
      .from('audit_items')
      .insert({
        session_id: sessionId,
        product_id: productId,
        expected_quantity: calculatedExpectedQuantity,
        company_id: companyId,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Finalize an audit session
   */
  finalizeAudit: async (
    sessionId: string,
    items: AuditItemInput[],
    userId: string,
    _companyId?: string
  ) => {
    const payloadItems = (items || [])
      .map(i => {
        let qty: number | string | null = i.counted_quantity;
        if (typeof qty === 'string' && qty === '') qty = null;
        if (typeof qty === 'string' && !isNaN(Number(qty))) qty = Number(qty);
        if (typeof qty === 'number' && isNaN(qty)) qty = null;
        return {
          product_id: i.product_id,
          counted_quantity: qty,
        };
      })
      .filter(
        i => !!i.product_id && i.counted_quantity !== null && i.counted_quantity !== undefined
      );

    const { error } = await supabase.rpc('finalize_audit_session', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_items: payloadItems,
    });
    if (error) throw error;
  },

  /**
   * Get all audit sessions for a company
   */
  getAuditSessions: async (companyId: string) => {
    const { data, error } = await supabase
      .from('audit_sessions')
      .select('*, warehouses(name_ar)')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((s: Record<string, unknown>) => ({
      ...s,
      warehouse_name: (s.warehouses as { name_ar?: string })?.name_ar,
    }));
  },

  /**
   * Get details of a specific audit session
   */
  getAuditSessionDetails: async (sessionId: string) => {
    const { data: sessionRaw, error: sError } = await supabase
      .from('audit_sessions')
      .select('*, warehouses(name_ar)')
      .eq('id', sessionId)
      .single();
    if (sError) throw sError;
    const session = sessionRaw as Record<string, unknown>;

    const { data: items, error: iError } = await supabase
      .from('audit_items')
      .select('*, products(*, product_categories(name))')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (iError) throw iError;

    return {
      session: {
        ...session,
        warehouse_name: (session?.warehouses as { name_ar?: string })?.name_ar,
      } as Record<string, unknown>,
      items: (items || []).map((i: Record<string, unknown>) => {
        const pRaw = i.products as AuditProductRow | AuditProductRow[] | null | undefined;
        const p = Array.isArray(pRaw) ? pRaw[0] : pRaw;

        return {
          ...i,
          products: {
            name: p?.name_ar || 'بدون اسم',
            sku: p?.sku || '---',
            part_number: p?.part_number || null,
            brand: p?.brand || null,
            size: p?.size || null,
            category: p?.product_categories?.name || 'عام',
          },
        };
      }),
    };
  },

  /**
   * Save audit progress (intermediate counts) using atomic RPC or safe UPDATE
   */
  saveAuditProgress: async (
    payload: { sessionId?: string; items: AuditItemInput[] } | AuditItemInput[],
    explicitSessionId?: string
  ) => {
    let items: AuditItemInput[] = [];
    let sessionId: string | undefined = explicitSessionId;

    if (Array.isArray(payload)) {
      items = payload;
    } else if (payload && typeof payload === 'object') {
      items = payload.items || [];
      sessionId = payload.sessionId || explicitSessionId;
    }

    if (!items || items.length === 0) return;

    // Normalize items payload
    const normalizedItems = items
      .map(i => {
        let qty: number | string | null = i.counted_quantity;
        if (typeof qty === 'string' && qty === '') qty = null;
        if (typeof qty === 'string' && !isNaN(Number(qty))) qty = Number(qty);
        if (typeof qty === 'number' && isNaN(qty)) qty = null;
        return {
          id: i.id || undefined,
          product_id: i.product_id,
          counted_quantity: qty,
        };
      })
      .filter(i => !!i.id || !!i.product_id);

    if (normalizedItems.length === 0) return;

    // 1. Try atomic PostgreSQL RPC save_audit_progress first if sessionId is available
    if (sessionId) {
      try {
        const rpcClient = supabase as unknown as {
          rpc: (
            fn: string,
            params: Record<string, unknown>
          ) => Promise<{ data: unknown; error: unknown }>;
        };
        const { data, error } = await rpcClient.rpc('save_audit_progress', {
          p_session_id: sessionId,
          p_items: normalizedItems,
        });

        if (!error) {
          return data;
        }
      } catch {
        // Fall back to direct update below
      }
    }

    // 2. Resilient fallback: direct UPDATE on existing audit_items rows (never upsert without required columns)
    const updatePromises = normalizedItems.map(async item => {
      if (item.id) {
        // ID exists, do an exact update
        const { error: updateError } = await supabase
          .from('audit_items')
          .update({
            counted_quantity: item.counted_quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        if (updateError) throw updateError;
      } else if (sessionId && item.product_id) {
        // No ID, but we have session and product: check if exists first
        const { data: existing } = await supabase
          .from('audit_items')
          .select('id')
          .eq('session_id', sessionId)
          .eq('product_id', item.product_id)
          .maybeSingle();

        if (existing?.id) {
          const { error: updateError } = await supabase
            .from('audit_items')
            .update({
              counted_quantity: item.counted_quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (updateError) throw updateError;
        }
        // If it doesn't exist, we skip silently or log
      }
      return { error: null };
    });

    const results = await Promise.all(updatePromises);
    const firstError = results.find(r => r && r.error)?.error;
    if (firstError) throw parseError(firstError);
    return;
  },

  /**
   * Delete an item from an active audit session
   */
  deleteAuditItem: async (params: DeleteAuditItemParams): Promise<void> => {
    const itemId = typeof params === 'string' ? params : params.itemId;
    const sessionId = typeof params === 'object' ? params.sessionId : undefined;
    const productId = typeof params === 'object' ? params.productId : undefined;

    if (!itemId && !(sessionId && productId)) {
      throw new Error('بيانات حذف الصنف غير مكتملة (يتطلب معرف البند أو معرف الجلسة والمنتج)');
    }

    // 1. Try atomic RPC first
    if (sessionId && (itemId || productId)) {
      try {
        const rpcClient = supabase as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
        const { error } = await rpcClient.rpc('delete_audit_session_item', {
          p_session_id: sessionId,
          p_item_id: itemId || null,
          p_product_id: productId || null,
        });
        if (!error) return;
      } catch {
        // Fall back to direct delete query
      }
    }

    // 2. Fallback to direct delete query
    try {
      if (itemId) {
        let query = supabase.from('audit_items').delete().eq('id', itemId);
        if (sessionId) {
          query = query.eq('session_id', sessionId);
        }
        const { error } = await query;
        if (error) throw error;
      } else if (sessionId && productId) {
        const { error } = await supabase
          .from('audit_items')
          .delete()
          .eq('session_id', sessionId)
          .eq('product_id', productId);
        if (error) throw error;
      }
    } catch (err) {
      throw parseError(err);
    }
  },

  /**
   * Populate all active warehouse products into an active audit session atomically
   */
  populateWarehouseItems: async (sessionId: string) => {
    const rpcClient = supabase as unknown as {
      rpc: (
        fn: string,
        params: Record<string, unknown>
      ) => Promise<{ data: unknown; error: unknown }>;
    };
    const { data, error } = await rpcClient.rpc('populate_audit_session_warehouse', {
      p_session_id: sessionId,
    });
    if (error) throw parseError(error);
    return data;
  },

  /**
   * Delete (soft-delete) an audit session by marking it as cancelled.
   * Hard DELETE is blocked by RLS (admin-only policy), so we use status='cancelled'
   * and hide cancelled sessions from the UI. Also clears associated drafts.
   */
  deleteAuditSession: async (sessionId: string) => {
    const { error } = await supabase
      .from('audit_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId);
    if (error) throw parseError(error);

    // Clean up drafts
    try {
      await supabase.from('inventory_session_drafts').delete().eq('session_id', sessionId);
      sessionStorage.removeItem(`inventory_session_draft_${sessionId}`);
      sessionStorage.removeItem('inventory_session_draft');
    } catch {
      // Non-blocking cleanup
    }
  },
};

export default auditService;
