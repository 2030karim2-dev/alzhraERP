import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GLOBAL_CURRENCY_SYMBOL = 'ر.س';

// Re-export from canonical source to maintain backward compatibility
export {
  formatCurrency,
  formatNumber,
  CURRENCY_SYMBOLS,
  toBaseCurrency,
  sumInBaseCurrency,
  convertToBaseCurrency,
  convertFromBaseCurrency
} from './utils/currencyUtils';

export function formatNumberDisplay(value: number): string {
  // Format non-currency numbers to English digits
  return new Intl.NumberFormat('en-US').format(value);
}