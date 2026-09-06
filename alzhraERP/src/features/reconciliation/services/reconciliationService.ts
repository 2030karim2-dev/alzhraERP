import type { CashDenominationCounts, DailyDrawerSummary } from '../types';

export const STANDARD_DENOMINATIONS = [
  { value: 500, label: '500 ر.س' },
  { value: 200, label: '200 ر.س' },
  { value: 100, label: '100 ر.س' },
  { value: 50, label: '50 ر.س' },
  { value: 20, label: '20 ر.س' },
  { value: 10, label: '10 ر.س' },
  { value: 5, label: '5 ر.س' },
  { value: 1, label: '1 ر.س' },
  { value: 0.5, label: 'نصف ريال' },
] as const;

export const DEFAULT_TOLERANCE_SAR = 10;

export const reconciliationService = {
  /**
   * حساب إجمالي النقدية من الفئات المعدودة
   */
  calculateDenominationsTotal: (counts: CashDenominationCounts): number => {
    let total = 0;
    for (const [denomStr, count] of Object.entries(counts)) {
      const denom = parseFloat(denomStr);
      const qty = Number(count) || 0;
      if (!isNaN(denom) && qty > 0) {
        total += denom * qty;
      }
    }
    return Math.round(total * 100) / 100;
  },

  /**
   * حساب الفارق بين الفعلي والمتوقع مع فحص حد التسامح
   */
  calculateVariance: (
    actual: number,
    expected: number,
    tolerance = DEFAULT_TOLERANCE_SAR
  ): {
    variance: number;
    status: 'balanced' | 'surplus' | 'shortage';
    isWithinTolerance: boolean;
  } => {
    const variance = Math.round((Number(actual || 0) - Number(expected || 0)) * 100) / 100;
    const absVariance = Math.abs(variance);
    const isWithinTolerance = absVariance <= tolerance;

    if (absVariance === 0) {
      return { variance: 0, status: 'balanced', isWithinTolerance: true };
    }
    if (variance > 0) {
      return { variance, status: 'surplus', isWithinTolerance };
    }
    return { variance, status: 'shortage', isWithinTolerance };
  },

  /**
   * صياغة رسالة الواتساب اليومية المنسقة للمالك
   */
  formatWhatsAppSummary: (
    summary: DailyDrawerSummary,
    actualCash: number,
    actualCard: number,
    floatRetained: number,
    cashToOwner: number,
    shopName = 'المحل'
  ): string => {
    const cashVariance = Math.round((actualCash - summary.expected_cash_in_drawer) * 100) / 100;
    const cardVariance = Math.round((actualCard - summary.expected_card_terminal) * 100) / 100;

    let cashVarianceText = 'متطابق تماماً ✓ (0.00)';
    if (cashVariance > 0) {
      cashVarianceText = `زيادة +${cashVariance.toFixed(2)} ر.س ⚠️`;
    } else if (cashVariance < 0) {
      cashVarianceText = `عجز ${cashVariance.toFixed(2)} ر.س ❌`;
    }

    const employeeLines = (summary.employee_breakdown || [])
      .map(
        emp =>
          ` • ${emp.employee_name}: ${emp.total_sales.toFixed(2)} ر.س (${emp.invoice_count} فاتورة)`
      )
      .join('\n');

    return [
      `📊 *إقفال يومية ${shopName}*`,
      `📅 *التاريخ:* ${summary.date}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👥 *مبيعات الموظفين:*`,
      employeeLines || ' • لا توجد مبيعات مسجلة اليوم',
      `--------------------`,
      `💰 *إجمالي مبيعات اليوم:* ${summary.total_sales.toFixed(2)} ر.س`,
      `💳 *عمليات الشبكة (مدى):* ${summary.card_sales.toFixed(2)} ر.س ${Math.abs(cardVariance) === 0 ? '[مطابق ✓]' : `[فارق: ${cardVariance.toFixed(2)}]`}`,
      `💵 *كاش المبيعات:* ${summary.cash_sales.toFixed(2)} ر.س`,
      summary.transfer_sales > 0
        ? `🏦 *مبيعات تحويل بنكي:* ${summary.transfer_sales.toFixed(2)} ر.س`
        : null,
      summary.credit_sales && summary.credit_sales > 0
        ? `📋 *مبيعات آجلة (ذمم):* ${summary.credit_sales.toFixed(2)} ر.س`
        : null,
      summary.cash_receipts && summary.cash_receipts > 0
        ? `📥 *سندات قبض نقدية:* +${summary.cash_receipts.toFixed(2)} ر.س`
        : null,
      summary.cash_disbursements && summary.cash_disbursements > 0
        ? `📤 *سندات صرف نقدية:* -${summary.cash_disbursements.toFixed(2)} ر.س`
        : null,
      summary.returns_cash > 0 ? `↩️ *مرتجع نقدي:* -${summary.returns_cash.toFixed(2)} ر.س` : null,
      summary.petty_expenses_cash > 0
        ? `☕ *مصروفات من الدرج:* -${summary.petty_expenses_cash.toFixed(2)} ر.س`
        : null,
      summary.opening_float > 0
        ? `🪙 *عهدة الفكة الافتتاحية:* +${summary.opening_float.toFixed(2)} ر.س`
        : null,
      `--------------------`,
      `🎯 *الكاش المطلوب في الدرج:* ${summary.expected_cash_in_drawer.toFixed(2)} ر.س`,
      `📥 *الكاش الفعلي الموجود:* ${actualCash.toFixed(2)} ر.س`,
      `⚖️ *حالة الدرج:* ${cashVarianceText}`,
      `--------------------`,
      `🔒 *المتبقي بالدرج لبكرة (فكة):* ${floatRetained.toFixed(2)} ر.س`,
      `💼 *الصافي المسلم للمالك:* ${cashToOwner.toFixed(2)} ر.س`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `تم الإقفال بنجاح عبر نظام الزهراء Smart ERP`,
    ]
      .filter(Boolean)
      .join('\n');
  },
};
