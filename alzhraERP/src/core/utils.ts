import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ensureLatinDigits } from './utils/currencyUtils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GLOBAL_CURRENCY_SYMBOL = 'ر.س';

// Re-export from canonical source to maintain backward compatibility
export {
  formatCurrency,
  formatNumber,
  ensureLatinDigits,
  CURRENCY_SYMBOLS,
  toBaseCurrency,
  sumInBaseCurrency,
  convertToBaseCurrency,
  convertFromBaseCurrency,
  convertCurrency,
  parseCurrency,
  parseNumberFlexible,
} from './utils/currencyUtils';

export function formatNumberDisplay(value: number): string {
  // Format non-currency numbers to English digits
  return ensureLatinDigits(new Intl.NumberFormat('en-US').format(value));
}

export { formatLocalDate, getLocalYearStart } from './utils/dateUtils';
export { netUnitPrices } from './utils/invoiceDiscount';
export {
  normalizeArabic,
  normalizeArabicDigits,
  normalizeSearch,
  matchesArabicSearch,
  filterByArabicSearch,
} from './utils/search';
