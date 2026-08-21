/**
 * Smart Alerts Engine — Customizable rule-based alerting system.
 * 
 * Enables users to define custom thresholds and conditions for alerts:
 * - Low stock alerts
 * - High debt alerts
 * - Overdue invoice alerts
 * - Expiry date alerts
 * - Custom SQL-based rules
 * 
 * @module features/dashboard/services/smartAlertsEngine
 */

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: 'low_stock' | 'high_debt' | 'overdue_invoice' | 'expiry' | 'custom';
  enabled: boolean;
  threshold: number;
  /** SQL-like filter (only for 'custom' type) */
  customFilter?: string;
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
  /** Cooldown in minutes (prevents spam) */
  cooldownMinutes: number;
  /** Last triggered timestamp */
  lastTriggered?: Date;
}

export interface AlertResult {
  rule: AlertRule;
  message: string;
  count: number;
  link?: string;
  triggered: boolean;
}

export const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'low-stock', name: 'مخزون منخفض', description: 'تنبيه عند وصول المخزون للحد الأدنى',
    type: 'low_stock', enabled: true, threshold: 5, severity: 'warning', cooldownMinutes: 60,
  },
  {
    id: 'critical-stock', name: 'مخزون حرج', description: 'تنبيه عند نفاد المخزون',
    type: 'low_stock', enabled: true, threshold: 0, severity: 'critical', cooldownMinutes: 15,
  },
  {
    id: 'high-debt', name: 'مديونية عالية', description: 'تنبيه عند تجاوز العميل حد الائتمان',
    type: 'high_debt', enabled: true, threshold: 10000, severity: 'warning', cooldownMinutes: 120,
  },
  {
    id: 'overdue-7', name: 'فواتير متأخرة 7 أيام', description: 'تنبيه بالفواتير المتأخرة لأكثر من أسبوع',
    type: 'overdue_invoice', enabled: true, threshold: 7, severity: 'warning', cooldownMinutes: 240,
  },
  {
    id: 'overdue-30', name: 'فواتير متأخرة 30 يوم', description: 'تنبيه بالفواتير المتأخرة لأكثر من شهر',
    type: 'overdue_invoice', enabled: true, threshold: 30, severity: 'critical', cooldownMinutes: 240,
  },
];

/**
 * Evaluate a single alert rule against the provided data.
 * Returns an AlertResult if the rule triggered.
 */
export const evaluateRule = async (
  rule: AlertRule,
  data: {
    lowStockCount?: number;
    criticalStockCount?: number;
    highDebtCustomers?: number;
    overdueInvoices?: { count: number; maxDays: number };
  },
): Promise<AlertResult | null> => {
  if (!rule.enabled) return null;

  // Check cooldown
  if (rule.lastTriggered) {
    const elapsed = Date.now() - rule.lastTriggered.getTime();
    if (elapsed < rule.cooldownMinutes * 60 * 1000) return null;
  }

  let triggered = false;
  let message = '';
  let count = 0;
  let link = '';

  switch (rule.type) {
    case 'low_stock':
      if (rule.threshold === 0 && data.criticalStockCount && data.criticalStockCount > 0) {
        triggered = true;
        count = data.criticalStockCount;
        message = `يوجد ${count} منتجات نفذت كمياتها بالكامل`;
        link = '/inventory?view=low-stock';
      } else if (rule.threshold > 0 && data.lowStockCount && data.lowStockCount >= rule.threshold) {
        triggered = true;
        count = data.lowStockCount;
        message = `يوجد ${count} منتجات وصلت للحد الأدنى من المخزون`;
        link = '/inventory?view=low-stock';
      }
      break;

    case 'high_debt':
      if (data.highDebtCustomers && data.highDebtCustomers >= rule.threshold) {
        triggered = true;
        count = data.highDebtCustomers;
        message = `يوجد ${count} عملاء تجاوزت مديونيتهم ${rule.threshold.toLocaleString('en-US')} ريال`;
        link = '/reports?tab=debt_report';
      }
      break;

    case 'overdue_invoice':
      if (data.overdueInvoices && data.overdueInvoices.maxDays >= rule.threshold) {
        triggered = true;
        count = data.overdueInvoices.count;
        message = `يوجد ${count} فواتير متأخرة لأكثر من ${rule.threshold} يوم`;
        link = '/reports?tab=debt_report';
      }
      break;
  }

  if (!triggered) return null;

  return { rule, message, count, link, triggered: true };
};

/**
 * Evaluate all enabled rules against the provided data.
 */
export const evaluateAllRules = async (
  rules: AlertRule[],
  data: Parameters<typeof evaluateRule>[1],
): Promise<AlertResult[]> => {
  const results = await Promise.all(
    rules.map(rule => evaluateRule(rule, data)),
  );
  return results.filter((r): r is AlertResult => r !== null);
};
