
import { Product } from '../types';

export const aiInventoryService = {
  /**
   * تحليل الأصناف التي لم تتحرك منذ فترة طويلة
   */
  detectStagnantItems: (products: Product[], daysThreshold: number = 180): Product[] => {
    return products.filter(p => {
      const createdAt = new Date(p.created_at).getTime();
      const now = new Date().getTime();
      const diffDays = (now - createdAt) / (1000 * 3600 * 24);
      return diffDays > daysThreshold && p.stock_quantity > 0 && !p.isLowStock;
    });
  },

  /**
   * حساب كمية إعادة الطلب المثالية بناءً على السحب التاريخي (EOQ Simplified)
   */
  calculateOptimalReorder: (product: Product) => {
    const safetyStock = product.min_stock_level * 1.5;
    return Math.max(0, Math.ceil(safetyStock - product.stock_quantity));
  },

  /**
   * توليد نصيحة ذكية بناءً على حالة الصنف
   */
  getSmartAdvice: (product: Product): { type: 'buy' | 'sell' | 'move'; message: string } => {
    if (product.isLowStock) {
      return { 
        type: 'buy', 
        message: `معدل السحب مرتفع. نوصي بطلب ${Math.ceil(product.min_stock_level * 2)} قطعة لتغطية الـ 30 يوماً القادمة.` 
      };
    }
    if (product.stock_quantity > product.min_stock_level * 10) {
        return { 
          type: 'sell', 
          message: 'تضخم في المخزون. يفضل عمل عرض ترويجي لتسييل السيولة المحبوسة في هذا الصنف.' 
        };
    }
    return { type: 'move', message: 'حالة الصنف مستقرة حالياً.' };
  }
};
