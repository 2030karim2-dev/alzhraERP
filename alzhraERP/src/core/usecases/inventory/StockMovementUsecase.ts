import { inventoryApi } from '../../../features/inventory/api';
import { supabase } from '../../../lib/supabaseClient';

interface MovementParams {
  productId: string;
  warehouseId: string;
  quantity: number; // موجبة للوارد، سالبة للصادر
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';
  unitPrice?: number; // مطلوب فقط في حالات التوريد (IN) لتحديث التكلفة
  referenceType: string;
  referenceId: string;
  userId: string;
  companyId: string;
}

export class StockMovementUsecase {
  static async execute(params: MovementParams) {
    if (!params.productId) {
      throw new Error("لم يتم تحديدرقم مرجعي للمنتج (Product ID missing)");
    }

    // 1. إذا كانت الحركة توريد (IN)، نقوم بتحديث متوسط التكلفة أولاً
    if (params.type === 'IN' && params.unitPrice !== undefined && params.quantity > 0) {
      // Execute Atomic Database RPC instead of calculating in JS memory to prevent race conditions
      const { error: wacError } = await supabase.rpc('calculate_and_update_wac', {
          p_product_id: params.productId,
          p_added_qty: params.quantity,
          p_unit_price: params.unitPrice
      });
      if (wacError) {
        console.error("RPC calculate_and_update_wac error:", wacError);
        throw new Error("فشل في تقييم متوسط التكلفة الآلي للمخزون");
      }
    }

    // 2. تسجيل العملية في سجل الحركات (Transactions)
    // Fix: Corrected method name from 'adjustStock' to 'createInventoryTransactions' and wrapped payload in an array.
    const { error: txError } = await inventoryApi.createInventoryTransactions([{
      company_id: params.companyId,
      product_id: params.productId,
      warehouse_id: params.warehouseId,
      quantity: params.quantity,
      transaction_type: StockMovementUsecase.mapTransactionType(params.type, params.quantity),
      reference_type: params.referenceType,
      reference_id: params.referenceId,
      created_by: params.userId
    }]);

    if (txError) throw txError;

    // 3. تحديث الرصيد اللحظي في المستودع المحدد (تم عبر Trigger في SQL ولكن هنا نؤكده للبيئة المحلية)
    // ملاحظة: الـ SupabaseClient المحلي يقوم بالمحاكاة يدوياً
    return { success: true };
  }

  /**
   * Map internal movement types to DB-valid transaction_type values
   */
  private static mapTransactionType(type: string, quantity: number): string {
    switch (type) {
      case 'IN': return 'purchase';
      case 'OUT': return 'sale';
      case 'ADJUSTMENT': return quantity > 0 ? 'adj_in' : 'adj_out';
      case 'RETURN': return quantity > 0 ? 'return_purchase' : 'return_sale';
      default: return type; // already a valid DB value
    }
  }
}
