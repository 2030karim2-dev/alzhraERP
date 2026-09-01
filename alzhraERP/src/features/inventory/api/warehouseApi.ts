import { supabase } from '../../../lib/supabaseClient';
import { TableInsert } from '@/core/types/supabase-helpers';

/** Warehouse and stock management */
export const warehouseApi = {
  getWarehouses: async (companyId: string, branchId?: string | null) => {
    return await supabase.rpc('get_warehouses_with_stats', {
      p_company_id: companyId,
      ...(branchId ? { p_branch_id: branchId } : {}),
    });
  },

  createInventoryTransactions: async (transactions: TableInsert<'inventory_transactions'>[]) => {
    return await supabase.from('inventory_transactions').insert(transactions);
  },

  getProductMovements: async (productId: string, from?: string, to?: string) => {
    let query = supabase
      .from('inventory_transactions')
      .select('*') // Fix: removed invalid created_by(*) relation
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (from) {
      query = query.gte('created_at', from);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', toDate.toISOString());
    }

    return await query;
  },

  recordTransaction: async (
    companyId: string,
    userId: string,
    tx: Omit<TableInsert<'inventory_transactions'>, 'company_id' | 'created_by'>
  ) => {
    return await supabase.from('inventory_transactions').insert({
      ...tx,
      company_id: companyId,
      created_by: userId,
    } as TableInsert<'inventory_transactions'>);
  },

  initializeStock: async (
    companyId: string,
    userId: string,
    stockData: { product_id: string; warehouse_id: string; quantity: number }
  ) => {
    return await supabase.from('inventory_transactions').insert({
      company_id: companyId,
      created_by: userId,
      product_id: stockData.product_id,
      warehouse_id: stockData.warehouse_id,
      quantity: stockData.quantity,
      total_cost: 0,
      unit_cost: 0,
      transaction_type: 'initial',
      reference_type: 'opening_balance',
    });
  },

  updateStock: async (
    companyId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    userId?: string
  ) => {
    // ⚡ RPC ذري (يقرأ المخزون ويُدرج التسوية داخل معاملة واحدة) — إصلاح TOCTOU.
    // الهجرة: supabase/migrations/20260901000004_fix_update_stock_atomic.sql
    // ملاحظة: الاسم غير مُدرج بعد في database.types.ts (يُزامَن عند توليد الأنواع) —
    // نمرر عبر cast ضيّق بدل تعديل ملف الأنواع المولّد يدوياً.
    const rpc = supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>
    ) => Promise<{
      data: unknown;
      error: { code?: string; message?: string } | null;
    }>;
    const { data, error } = await rpc('adjust_stock_atomic', {
      p_company_id: companyId,
      p_product_id: productId,
      p_warehouse_id: warehouseId,
      p_target_quantity: quantity,
      p_user_id: userId ?? null,
    });

    // Fallback: RPC غير منشور بعد على الخادم (42883/PGRST202) → المسار القديم.
    const isMissingRpc =
      error !== null &&
      (error.code === 'PGRST202' ||
        error.code === '42883' ||
        (error.message ?? '').includes('does not exist'));
    if (isMissingRpc) {
      const { data: currentStock } = await supabase
        .from('product_stock')
        .select('quantity')
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .maybeSingle();

      const currentQty = currentStock?.quantity || 0;
      const adjustment = quantity - currentQty;

      if (adjustment === 0) return { data: null, error: null };

      return await supabase.from('inventory_transactions').insert({
        company_id: companyId,
        ...(userId ? { created_by: userId } : {}),
        product_id: productId,
        warehouse_id: warehouseId,
        quantity: adjustment,
        total_cost: 0,
        unit_cost: 0,
        transaction_type: 'adjustment',
        reference_type: 'manual_update',
      });
    }

    return { data, error };
  },

  saveWarehouse: async (
    companyId: string,
    data: { id?: string; name_ar: string; location: string; branch_id?: string | null }
  ) => {
    const { id, ...formData } = data;
    if (id) {
      return await supabase.from('warehouses').update(formData).eq('id', id);
    } else {
      return await supabase.from('warehouses').insert({
        ...formData,
        company_id: companyId,
        status: 'active',
      });
    }
  },

  /** Simple warehouse list (settings forms/dropdowns) — no stats. */
  fetchWarehouses: async (companyId: string) => {
    return await supabase
      .from('warehouses')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name_ar', { ascending: true });
  },

  upsertWarehouse: async (data: Record<string, unknown>) => {
    return await supabase
      .from('warehouses')
      .upsert(data as TableInsert<'warehouses'>)
      .select()
      .single();
  },

  deleteWarehouse: async (id: string) => {
    return await supabase
      .from('warehouses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },

  /** مخزون منتج عبر كل المستودعات/الفروع (مع فلتر company_id صريح). */
  getProductStockByCompany: async (companyId: string, productId: string) => {
    return await supabase
      .from('product_stock')
      .select(
        `
                quantity,
                warehouse_id,
                warehouses!inner(
                    id,
                    name_ar,
                    branch_id,
                    branches:branch_id(id, name)
                )
            `
      )
      .eq('company_id', companyId)
      .eq('product_id', productId)
      .gt('quantity', 0);
  },

  /** كل المستودعات مع معلومات فروعها (لفلاتر POS) — مع فلتر company_id صريح. */
  getWarehousesWithBranchesData: async (companyId: string) => {
    return await supabase
      .from('warehouses')
      .select(
        `
                id,
                name_ar,
                location,
                branch_id,
                branches:branch_id(id, name)
            `
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name_ar', { ascending: true });
  },
};
