
import { Product } from '../types';

export const valuationService = {
  /**
   * حساب القيمة الإجمالية للمخزون بسعر التكلفة (Inventory Asset Value)
   */
  getTotalValueAtCost: (products: Product[]): number => {
    return products.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0);
  },

  /**
   * حساب القيمة السوقية المتوقعة (Potential Revenue)
   */
  getTotalMarketValue: (products: Product[]): number => {
    return products.reduce((sum, p) => sum + (p.stock_quantity * (p.sale_price ?? p.selling_price ?? 0)), 0);
  },

  /**
   * تحليل الربح الإجمالي المتوقع في المستودع
   */
  getProjectedGrossProfit: (products: Product[]) => {
    const cost = valuationService.getTotalValueAtCost(products);
    const revenue = valuationService.getTotalMarketValue(products);
    return {
      profit: revenue - cost,
      margin: cost > 0 ? ((revenue - cost) / revenue) * 100 : 0
    };
  }
};
