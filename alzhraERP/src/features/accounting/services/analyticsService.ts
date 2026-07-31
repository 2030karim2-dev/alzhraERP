
import { reportsService } from '../../reports/service';

export const analyticsService = {
  /**
   * حساب المؤشرات المالية الرئيسية (Key Financial Ratios)
   */
  getFinancialHealth: async (companyId: string) => {
    const financials = await reportsService.getBalanceSheet(companyId);
    const { totalRevenues, totalExpenses, netProfit } = await reportsService.getProfitAndLoss(companyId);

    const currentAssets = financials.assets.reduce((s: number, a: any) => s + a.netBalance, 0);
    const currentLiabilities = Math.abs(financials.liabilities.reduce((s: number, l: any) => s + l.netBalance, 0));

    return {
      // نسبة السيولة: القدرة على سداد الالتزامات قصيرة الأجل (المثالي > 1.5)
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : currentAssets,
      // هامش الربح الصافي: كفاءة تحويل المبيعات لأرباح
      netMargin: totalRevenues > 0 ? (netProfit / totalRevenues) * 100 : 0,
      // معدل حرق السيولة (تقديري بناءً على المصاريف)
      burnRate: totalExpenses
    };
  }
};