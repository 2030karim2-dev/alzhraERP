import type { Product, Warehouse } from '../../inventory/types';
import type { Branch } from '../../settings/types';

export type SuggestionPriority = 'critical' | 'high' | 'rebalance';

export interface TransferBranchNode {
  id: string;
  name: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
}

export interface TransferSuggestion {
  id: string;
  product: Product;
  fromBranch: TransferBranchNode & { surplus: number };
  toBranch: TransferBranchNode & { deficit: number };
  suggestedQty: number;
  priority: SuggestionPriority;
  priorityLabel: string;
  reason: string;
  financialImpact: number;
}

export interface RebalancingSummary {
  totalSuggestions: number;
  totalUnitsToTransfer: number;
  estimatedCapitalSaved: number;
  criticalCount: number;
  highCount: number;
  rebalanceCount: number;
}

export interface EngineInput {
  products: Product[];
  warehouses: Warehouse[];
  branches?: Branch[];
  activeBranchId?: string | null;
  limit?: number;
}

/**
 * Computes intelligent cross-branch stock transfer suggestions.
 * Evaluates branch supply and demand imbalance, calculates safe surplus
 * without breaching minimum stock levels, and prioritizes core & zero-stock items.
 */
export function computeTransferSuggestions({
  products,
  warehouses,
  branches = [],
  activeBranchId = null,
  limit = 15,
}: EngineInput): {
  suggestions: TransferSuggestion[];
  summary: RebalancingSummary;
} {
  if (!products || products.length === 0 || !warehouses || warehouses.length < 2) {
    return {
      suggestions: [],
      summary: {
        totalSuggestions: 0,
        totalUnitsToTransfer: 0,
        estimatedCapitalSaved: 0,
        criticalCount: 0,
        highCount: 0,
        rebalanceCount: 0,
      },
    };
  }

  // Quick lookup maps
  const warehouseMap = new Map<string, Warehouse>();
  warehouses.forEach(w => warehouseMap.set(w.id, w));

  const branchMap = new Map<string, Branch>();
  branches.forEach(b => branchMap.set(b.id, b));

  const rawSuggestions: TransferSuggestion[] = [];

  for (const product of products) {
    const dist = product.warehouse_distribution;
    if (!dist || dist.length < 2) continue;

    const threshold = Number(product.min_stock_level) > 0 ? Number(product.min_stock_level) : 3;

    // Group stock by branch
    const branchStockMap = new Map<
      string,
      {
        branchId: string;
        branchName: string;
        warehouseId: string;
        warehouseName: string;
        totalQty: number;
      }
    >();

    for (const wd of dist) {
      const wh = warehouseMap.get(wd.warehouse_id);
      const branchId = wd.branch_id || wh?.branch_id || wd.warehouse_id;
      const branch = branchMap.get(branchId);
      const branchName =
        wd.branch_name || branch?.name || wh?.name_ar || wd.warehouse_name || 'فرع غير معروف';
      const qty = Number(wd.quantity) || 0;

      const existing = branchStockMap.get(branchId);
      if (existing) {
        existing.totalQty += qty;
      } else {
        branchStockMap.set(branchId, {
          branchId,
          branchName,
          warehouseId: wd.warehouse_id,
          warehouseName: wd.warehouse_name || wh?.name_ar || 'المستودع الرئيسي',
          totalQty: qty,
        });
      }
    }

    const branchNodes = Array.from(branchStockMap.values());
    if (branchNodes.length < 2) continue;

    // Separate into deficit branches and surplus branches
    const deficitNodes = branchNodes.filter(b => b.totalQty <= threshold);
    const surplusNodes = branchNodes.filter(b => b.totalQty > threshold + 1);

    if (deficitNodes.length === 0 || surplusNodes.length === 0) continue;

    for (const deficit of deficitNodes) {
      // Calculate needed quantity up to target stock buffer
      const targetBuffer = threshold * 2;
      const neededQty = Math.max(1, targetBuffer - deficit.totalQty);

      // Find best surplus donor (highest surplus first)
      const sortedSurplus = [...surplusNodes].sort((a, b) => b.totalQty - a.totalQty);

      for (const donor of sortedSurplus) {
        if (donor.branchId === deficit.branchId) continue;

        // Safe surplus: leave donor with at least its threshold
        const safeSurplus = Math.floor(donor.totalQty - threshold);
        if (safeSurplus < 1) continue;

        const transferQty = Math.min(safeSurplus, neededQty);
        if (transferQty < 1) continue;

        // Determine Priority
        let priority: SuggestionPriority = 'rebalance';
        let priorityLabel = 'إعادة توازن';

        if (deficit.totalQty === 0 && product.is_core) {
          priority = 'critical';
          priorityLabel = 'عاجل جداً (صنف رئيسي نفد)';
        } else if (deficit.totalQty === 0) {
          priority = 'critical';
          priorityLabel = 'نفاد تام';
        } else if (product.is_core || deficit.totalQty <= 1) {
          priority = 'high';
          priorityLabel = 'أولوية مرتفعة';
        }

        const reason =
          deficit.totalQty === 0
            ? `نفاد تام في ${deficit.branchName}، يتوفر فائض (${donor.totalQty}) في ${donor.branchName}`
            : `رصيد منخفض (${deficit.totalQty}/${threshold}) في ${deficit.branchName} مقابل فائض (${donor.totalQty}) في ${donor.branchName}`;

        const unitValue = Number(product.cost_price) || Number(product.sale_price) || 0;
        const financialImpact = Math.round(transferQty * unitValue);

        rawSuggestions.push({
          id: `${product.id}-${donor.branchId}-${deficit.branchId}`,
          product,
          fromBranch: {
            id: donor.branchId,
            name: donor.branchName,
            warehouseId: donor.warehouseId,
            warehouseName: donor.warehouseName,
            currentStock: donor.totalQty,
            surplus: safeSurplus,
          },
          toBranch: {
            id: deficit.branchId,
            name: deficit.branchName,
            warehouseId: deficit.warehouseId,
            warehouseName: deficit.warehouseName,
            currentStock: deficit.totalQty,
            deficit: neededQty,
          },
          suggestedQty: transferQty,
          priority,
          priorityLabel,
          reason,
          financialImpact,
        });

        // Break donor loop for this deficit once satisfied
        break;
      }
    }
  }

  // Sort suggestions:
  // 1. If activeBranchId provided, items where toBranch is activeBranchId come first
  // 2. Priority: critical > high > rebalance
  // 3. Higher financial impact first
  const priorityRank: Record<SuggestionPriority, number> = {
    critical: 3,
    high: 2,
    rebalance: 1,
  };

  const sorted = rawSuggestions.sort((a, b) => {
    if (activeBranchId) {
      const aIsActiveTarget = a.toBranch.id === activeBranchId;
      const bIsActiveTarget = b.toBranch.id === activeBranchId;
      if (aIsActiveTarget && !bIsActiveTarget) return -1;
      if (!aIsActiveTarget && bIsActiveTarget) return 1;
    }

    const rankDiff = priorityRank[b.priority] - priorityRank[a.priority];
    if (rankDiff !== 0) return rankDiff;

    return b.financialImpact - a.financialImpact;
  });

  const finalSuggestions = sorted.slice(0, limit);

  // Compute summary metrics across all generated suggestions
  const summary: RebalancingSummary = {
    totalSuggestions: finalSuggestions.length,
    totalUnitsToTransfer: finalSuggestions.reduce((sum, s) => sum + s.suggestedQty, 0),
    estimatedCapitalSaved: finalSuggestions.reduce((sum, s) => sum + s.financialImpact, 0),
    criticalCount: finalSuggestions.filter(s => s.priority === 'critical').length,
    highCount: finalSuggestions.filter(s => s.priority === 'high').length,
    rebalanceCount: finalSuggestions.filter(s => s.priority === 'rebalance').length,
  };

  return {
    suggestions: finalSuggestions,
    summary,
  };
}
