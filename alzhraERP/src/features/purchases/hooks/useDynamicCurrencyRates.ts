import { useMemo } from 'react';
import { useCurrencies } from '../../settings/hooks';
import { asRateCode, asRateValue } from '../services/quotationComparison';

/**
 * يبني خريطة أسعار صرف المنشأة (رمز العملة ← معامل نحو عملة الأساس)
 * من إعدادات العملات، مع تجاهل كل صف غير صالح وأول صف لكل عملة.
 */
export function useDynamicCurrencyRates(): Map<string, number> {
  const { rates } = useCurrencies();

  return useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(rates.data)) {
      for (const row of rates.data) {
        const code = asRateCode(row.currency_code);
        const rate = asRateValue(row.rate_to_base);
        if (code !== '' && !map.has(code) && rate > 0) {
          map.set(code, rate);
        }
      }
    }
    return map;
  }, [rates.data]);
}
