
import { Product } from '../types';

export const stockAlertService = {
  /**
   * حساب معدل الاستهلاك اليومي (خوارزمية بسيطة)
   */
  calculateDailyVelocity: (salesHistory: { quantity: number }[], days: number = 30): number => {
    const totalQty = salesHistory.reduce((sum, sale) => sum + sale.quantity, 0);
    return totalQty / days;
  },

  /**
   * التنبؤ بعدد الأيام المتبقية قبل نفاد الصنف
   */
  predictDaysRemaining: (product: Product, dailyVelocity: number): number => {
    if (dailyVelocity <= 0) return 999; // لا يوجد سحب
    return product.stock_quantity / dailyVelocity;
  },

  /**
   * فلترة الأصناف التي تتطلب "طلب شراء" فوراً
   */
  getRestockCandidates: (products: Product[]) => {
    return products.filter(p =>
      p.stock_quantity <= p.min_stock_level ||
      ((p as unknown as Record<string, unknown>).predictedDaysRemaining as number) < 7 // تنبيه إذا كان المخزون يكفي لأقل من أسبوع
    );
  }
};
