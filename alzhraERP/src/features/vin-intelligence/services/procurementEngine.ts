import { VehicleCorePart, InventoryMatch, DemandInsight } from '../types';

/**
 * AI Procurement Engine
 * Analyzes inventory and VIN results to predict procurement needs.
 */

export interface ProcurementRecommendation {
  partId: string;
  partName: string;
  oemNumber: string;
  currentStock: number;
  recommendedOrder: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  predictedShortageDays: number;
}

export const analyzeProcurementNeeds = (
  coreParts: VehicleCorePart[],
  inventoryMatches: InventoryMatch[],
  demandInsights: DemandInsight[]
): ProcurementRecommendation[] => {
  const recommendations: ProcurementRecommendation[] = [];

  coreParts.forEach(part => {
    const inventory = inventoryMatches.find(m => m.productId === part.id) || { quantity: 0 };
    const insight = demandInsights.find(i => i.partId === part.id);
    
    let priority: ProcurementRecommendation['priority'] = 'LOW';
    let recommendedOrder = 0;
    let reason = '';
    let predictedShortageDays = 30;

    // Logic 1: Stock is zero and demand is high
    if (inventory.quantity === 0 && insight?.demandLevel === 'HIGH') {
      priority = 'CRITICAL';
      recommendedOrder = (insight.recommendedStock || 5) * 1.5;
      reason = 'نفاد المخزون مع طلب مرتفع جداً لهذا الموديل';
      predictedShortageDays = 0;
    } 
    // Logic 2: Stock is low (below recommended)
    else if (insight?.recommendedStock && inventory.quantity < insight.recommendedStock) {
      priority = 'HIGH';
      recommendedOrder = insight.recommendedStock - inventory.quantity;
      reason = 'المخزون الحالي أقل من الحد الآمن للطلب المتوقع';
      predictedShortageDays = Math.floor(inventory.quantity / (insight.salesCount / 30 || 1));
    }
    // Logic 3: Fast moving item
    else if (insight?.isFastMoving && inventory.quantity < 10) {
      priority = 'MEDIUM';
      recommendedOrder = 10;
      reason = 'صنف سريع الدوران، ينصح بتعزيز المخزون';
      predictedShortageDays = 15;
    }

    if (recommendedOrder > 0) {
      recommendations.push({
        partId: part.id,
        partName: part.canonicalPartName,
        oemNumber: part.oemNumbers[0] || 'N/A',
        currentStock: inventory.quantity,
        recommendedOrder: Math.ceil(recommendedOrder),
        priority,
        reason,
        predictedShortageDays
      });
    }
  });

  return recommendations.sort((a, b) => {
    const weights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return weights[b.priority] - weights[a.priority];
  });
};
