// Fix: ExchangeRate is defined in the settings feature, correcting the relative import path
// import { ExchangeRate } from '../../settings/types';

export const currencyService = {
  /**
   * حساب فرق العملة عند السداد
   * Realized Gain/Loss Calculation
   */
  calculateRealizedGainLoss: (originalAmount: number, oldRate: number, currentRate: number): number => {
    const originalValueBase = originalAmount / oldRate;
    const currentValueBase = originalAmount / currentRate;
    return currentValueBase - originalValueBase;
  },

  /**
   * تقييم كافة الحسابات بالعملة الأجنبية
   */
  revaluateAccounts: (accounts: any[], latestRates: Record<string, number>) => {
    return accounts.map(acc => {
      const rate = latestRates[acc.currency_code] || 1;
      const baseBalance = acc.balance / rate;
      return {
        ...acc,
        unrealizedValue: baseBalance,
        diff: baseBalance - acc.reported_base_balance
      };
    });
  }
};
