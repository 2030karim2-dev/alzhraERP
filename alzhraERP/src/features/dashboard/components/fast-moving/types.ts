/* eslint-disable complexity, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition */
import type { TopProduct } from '../TopPerformers';

export type SortField =
  'index' | 'name' | 'stock' | 'quantity' | 'cost' | 'revenue' | 'profit' | 'margin';

export type SortDirection = 'asc' | 'desc';
export type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative_stock';
export type DisplayCurrency = 'YER' | 'SAR';

export interface ProductValues {
  rev: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface FastMovingSummary {
  totalQty: number;
  totalRev: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
  negativeStockCount: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export function getProductValues(p: TopProduct, currency: DisplayCurrency): ProductValues {
  const isYer = currency === 'YER';
  const rev = isYer ? (p.revenue_yer ?? p.revenue * 410) : p.revenue;
  const cost = isYer ? (p.cost_yer ?? (p.cost ?? 0) * 410) : (p.cost ?? 0);
  const profit = isYer
    ? (p.gross_profit_yer ?? (p.gross_profit ?? 0) * 410)
    : (p.gross_profit ?? 0);
  const margin =
    p.margin_percentage !== undefined && p.margin_percentage !== null
      ? p.margin_percentage
      : rev > 0
        ? Math.round(((rev - cost) / rev) * 1000) / 10
        : 0;

  return { rev, cost, profit, margin };
}
