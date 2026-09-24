import type { DatePreset } from '@/core/types/invoiceSearch';

export type AccountFilterType = 'all' | 'expense' | 'employee' | 'rent' | 'cash';

export interface LedgerMetrics {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingForeignBalance: number | undefined;
  count: number;
}

export const DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'today', label: 'اليوم' },
  { id: 'this_week', label: 'آخر 7 أيام' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر الماضي' },
  { id: 'custom', label: 'مخصص' },
];
