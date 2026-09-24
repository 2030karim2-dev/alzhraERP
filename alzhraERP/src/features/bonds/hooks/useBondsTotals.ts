/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import { useMemo } from 'react';
import type { Bond } from '../types';
import type { BondsQuickAnalytics, BondsQuickTotals } from '../components/BondsQuickKpiBar';

export function useBondsTotals(
  serverAnalytics: unknown,
  allBondsData: Bond[] | undefined
): { totals: BondsQuickTotals; analytics: BondsQuickAnalytics } {
  const analytics = useMemo(() => {
    const safeAnalytics = serverAnalytics as Record<string, unknown> | null;
    const serverCount = (safeAnalytics?.count as number) || 0;
    const serverTotal = (safeAnalytics?.totalAmount as number) || 0;

    // Local computation from ALL loaded bonds as fallback
    const allBonds = allBondsData || [];
    const localTotal = allBonds.reduce((sum, b) => sum + (b.base_amount || b.amount || 0), 0);
    const localCount = allBonds.length;

    const resolvedTotal = serverTotal > 0 ? serverTotal : localTotal;
    const resolvedCount = serverCount > 0 ? serverCount : localCount;
    const serverAvg = (safeAnalytics?.avgAmount as number) || 0;
    const resolvedAvg =
      serverAvg > 0 ? serverAvg : resolvedCount > 0 ? resolvedTotal / resolvedCount : 0;

    return {
      avgAmount: Math.round(resolvedAvg * 100) / 100,
      count: resolvedCount,
    };
  }, [serverAnalytics, allBondsData]);

  const totals = useMemo(() => {
    const safeAnalytics = serverAnalytics as Record<string, unknown> | null;
    const safeTotals = (safeAnalytics?.totals as Record<string, number>) || {};

    // Server data has real values — use it
    if (safeTotals && (safeTotals.receiptAmount > 0 || safeTotals.paymentAmount > 0)) {
      return {
        receiptCount: safeTotals.receiptCount || 0,
        receiptAmount: safeTotals.receiptAmount || 0,
        paymentCount: safeTotals.paymentCount || 0,
        paymentAmount: safeTotals.paymentAmount || 0,
        netAmount: safeTotals.netAmount || 0,
      };
    }

    // Local fallback: compute from ALL loaded bonds
    const allBonds = allBondsData || [];
    const receiptBonds = allBonds.filter(b => b.type === 'receipt');
    const paymentBonds = allBonds.filter(b => b.type === 'payment');
    const receiptAmount = receiptBonds.reduce((s, b) => s + (b.base_amount || b.amount || 0), 0);
    const paymentAmount = paymentBonds.reduce((s, b) => s + (b.base_amount || b.amount || 0), 0);
    return {
      receiptCount: receiptBonds.length,
      receiptAmount,
      paymentCount: paymentBonds.length,
      paymentAmount,
      netAmount: receiptAmount - paymentAmount,
    };
  }, [serverAnalytics, allBondsData]);

  return { totals, analytics };
}
