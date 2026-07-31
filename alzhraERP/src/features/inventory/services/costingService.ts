import { Product } from '../types';
import Decimal from 'decimal.js';

export const costingService = {
  /**
   * حساب المتوسط المرجح للتكلفة (Weighted Average Cost)
   * يضمن أن تكلفة الصنف في المستودع تعكس القيمة الحقيقية بعد الشراء بأسعار مختلفة
   */
  calculateNewAverageCost: (
    currentStock: number,
    currentAvgCost: number,
    newQty: number,
    newUnitPrice: number
  ): number => {
    if (newQty <= 0) return currentAvgCost; // No change on negative/zero qty (returns/adjustments out)
    
    const stock = new Decimal(currentStock);
    const cost = new Decimal(currentAvgCost);
    const qty = new Decimal(newQty);
    const price = new Decimal(newUnitPrice);
    
    const totalQty = stock.plus(qty);
    if (totalQty.lte(0)) return price.toNumber();

    const totalCurrentValue = stock.times(cost);
    const totalNewValue = qty.times(price);
    
    const newWac = totalCurrentValue.plus(totalNewValue).dividedBy(totalQty);
    return newWac.toDecimalPlaces(4).toNumber();
  },

  /**
   * تقدير قيمة المخزون الحالية بالكامل
   */
  getInventoryAssetValue: (products: Product[]): number => {
    return products.reduce((acc, p) => acc + new Decimal(p.stock_quantity || 0).times(p.cost_price || 0).toNumber(), 0);
  },

  /**
   * تحليل الربحية لكل صنف بناءً على آخر تكلفة
   */
  getProductProfitability: (product: Product) => {
    const sellingPrice = new Decimal(product.sale_price ?? product.selling_price ?? 0);
    const costPrice = new Decimal(product.cost_price || 0);
    const profit = sellingPrice.minus(costPrice);
    const margin = sellingPrice.gt(0) ? profit.dividedBy(sellingPrice).times(100).toNumber() : 0;
    return {
      profit: profit.toNumber(),
      margin,
      isViable: margin > 10
    };
  }
};
