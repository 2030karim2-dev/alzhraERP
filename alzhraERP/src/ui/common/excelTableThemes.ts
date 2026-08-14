/**
 * ExcelTable theme tokens.
 * Extracted from ExcelTable.tsx to keep the main component focused on
 * composition/state management rather than static style maps.
 */
export type ExcelTableColorTheme = 'blue' | 'green' | 'orange' | 'indigo';

export interface ExcelTableTheme {
  accent: string;
  border: string;
  text: string;
  sub: string;
  hover: string;
  glow: string;
  focusRing: string;
}

export const EXCEL_TABLE_THEMES: Record<ExcelTableColorTheme, ExcelTableTheme> = {
  blue: {
    accent: 'bg-blue-600',
    border: 'border-blue-200',
    text: 'text-blue-600',
    sub: 'bg-blue-50/50',
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
    glow: 'shadow-[0_0_12px_rgba(37,99,235,0.4)]',
    focusRing: 'ring-blue-500/50',
  },
  green: {
    accent: 'bg-emerald-600',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    sub: 'bg-emerald-50/50',
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
    focusRing: 'ring-emerald-500/50',
  },
  orange: {
    accent: 'bg-orange-600',
    border: 'border-orange-200',
    text: 'text-orange-600',
    sub: 'bg-orange-50/50',
    hover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20',
    glow: 'shadow-[0_0_12px_rgba(234,88,12,0.4)]',
    focusRing: 'ring-orange-500/50',
  },
  indigo: {
    accent: 'bg-indigo-600',
    border: 'border-indigo-200',
    text: 'text-indigo-600',
    sub: 'bg-indigo-50/50',
    hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
    glow: 'shadow-[0_0_12px_rgba(79,70,229,0.4)]',
    focusRing: 'ring-indigo-500/50',
  },
};
