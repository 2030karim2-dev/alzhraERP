import { describe, it, expect } from 'vitest';
import { calculateDashboardInsights } from './dashboardInsights';

// ── Trend Calculations ─────────────────────────────────

describe('calculateDashboardInsights', () => {
  it('returns zero trends for empty data', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0,
      paymentBonds: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalSupplierDebts: 0,
      salesChartData: [],
      lowStockProducts: [],
      overdueInvoices: [],
    });

    expect(result.salesTrend).toBe(0);
    expect(result.purchasesTrend).toBe(0);
    expect(result.expensesTrend).toBe(0);
  });

  it('calculates positive sales trend', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0,
      paymentBonds: 0,
      totalSales: 1000,
      totalPurchases: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalSupplierDebts: 0,
      salesChartData: [
        { sales: 100 }, { sales: 100 },  // older half
        { sales: 150 }, { sales: 150 },  // newer half
      ],
      lowStockProducts: [],
      overdueInvoices: [],
    });

    expect(result.salesTrend).toBeCloseTo(50, 1); // 50% increase
  });

  it('calculates negative sales trend', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0,
      paymentBonds: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalSupplierDebts: 0,
      salesChartData: [
        { sales: 200 }, { sales: 200 },
        { sales: 100 }, { sales: 100 },
      ],
      lowStockProducts: [],
      overdueInvoices: [],
    });

    expect(result.salesTrend).toBeLessThan(0);
  });

  it('uses "value" key when "sales" key is missing', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0,
      paymentBonds: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalSupplierDebts: 0,
      salesChartData: [
        { value: 100 }, { value: 100 },
        { value: 200 }, { value: 200 },
      ],
      lowStockProducts: [],
      overdueInvoices: [],
    });

    expect(result.salesTrend).toBeCloseTo(100, 0);
  });
});

// ── Alerts ─────────────────────────────────────────────

describe('Alerts', () => {
  it('generates low-stock alert', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], overdueInvoices: [],
      lowStockProducts: [{ id: '1', name: 'X' }],
    });
    expect(result.alerts.some(a => a.id === 'low-stock')).toBe(true);
  });

  it('generates overdue invoice alert', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [{ id: 'inv1' }],
    });
    expect(result.alerts.some(a => a.id === 'overdue-invoices')).toBe(true);
  });

  it('returns empty alerts when no issues', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [],
    });
    expect(result.alerts).toHaveLength(0);
  });
});

// ── Targets ────────────────────────────────────────────

describe('Targets', () => {
  it('calculates sales progress against an explicit target', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 50000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [], salesTarget: 100000,
    });
    expect(result.targets.salesProgress).toBe(50);
  });

  it('caps sales progress at 100%', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 200000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [], salesTarget: 100000,
    });
    expect(result.targets.salesProgress).toBe(100);
  });

  it('derives a dynamic target (sales × 1.2) when no explicit target is given', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 50000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [],
    });
    // target = 60000 → progress = 50000/60000*100 ≈ 83
    expect(result.targets.salesProgress).toBe(83);
    expect(result.salesTarget).toBe(60000);
  });

  it('returns zero progress when there are no sales', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [],
    });
    expect(result.targets.salesProgress).toBe(0);
  });
});

// ── Resilience against stale/partial persisted payloads ──────────────────────
//
// Regression: the dashboard API started returning `overdueInvoices` later than
// the (24h) persisted IndexedDB cache was written, so a stale cache could still
// hold a payload WITHOUT that field. `calculateDashboardInsights` is invoked
// from inside the `processedData` useMemo, so a missing field used to throw
// `Cannot read properties of undefined (reading 'length')` and take down the
// whole dashboard. It must degrade to empty arrays / zeros instead.

describe('Resilience to partial data', () => {
  it('does not crash when overdueInvoices is undefined', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [],
      // overdueInvoices deliberately omitted (stale cache shape)
    } as Parameters<typeof calculateDashboardInsights>[0]);

    expect(result.alerts.some(a => a.id === 'overdue-invoices')).toBe(false);
    expect(Number.isNaN(result.targets.salesProgress)).toBe(false);
  });

  it('does not crash when lowStockProducts is undefined', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], overdueInvoices: [],
      // lowStockProducts deliberately omitted
    } as Parameters<typeof calculateDashboardInsights>[0]);

    expect(result.alerts.some(a => a.id === 'low-stock')).toBe(false);
  });

  it('does not crash when salesChartData is undefined', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, lowStockProducts: [], overdueInvoices: [],
      // salesChartData deliberately omitted (it is optional in the signature)
    });

    expect(result.salesTrend).toBe(0);
  });

  it('does not crash when all dashboard fields are missing', () => {
    const result = calculateDashboardInsights({} as Parameters<typeof calculateDashboardInsights>[0]);

    expect(result.targets.salesProgress).toBe(0);
    expect(Number.isNaN(result.salesTrend)).toBe(false);
  });
});

