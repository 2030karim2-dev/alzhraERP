/** صف أعمار الديون لكل جهة — يُعرض في الجدول. */
export interface AgingPartyRow {
  id: string;
  name: string;
  type: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  total: number;
  oldestDate: string;
}

export interface AgingBuckets {
  current: number;
  days30: number;
  days60: number;
  days90: number;
}

export interface AgingChartItem {
  name: string;
  value: number;
}

export interface DebtAgingData {
  agingBuckets: AgingBuckets;
  partiesList: AgingPartyRow[];
  totalOutstanding: number;
  criticalCount: number;
  chartData: AgingChartItem[];
}

export const AGING_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
export const AGING_LABELS = ['حالية (0-30)', 'متأخرة (31-60)', 'متأخرة (61-90)', 'حرجة (90+)'];
