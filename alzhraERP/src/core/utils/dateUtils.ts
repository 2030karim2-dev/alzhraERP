/**
 * Date utilities for local timezone handling without UTC shift.
 */

/**
 * Formats a Date object to YYYY-MM-DD using local calendar date parts,
 * preventing UTC day shifts in timezones ahead of UTC (such as GMT+3).
 */
export const formatLocalDate = (date?: Date | string | number | null): string => {
  if (!date) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Returns the first day of the current year in local format YYYY-01-01.
 */
export const getLocalYearStart = (year: number = new Date().getFullYear()): string => {
  return `${year}-01-01`;
};

/**
 * Computes start and end dates for a given DatePreset in local timezone.
 */
export const getDateRangeForPreset = (
  preset: 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'custom'
): { from?: string; to?: string } => {
  const now = new Date();
  const todayStr = formatLocalDate(now);

  if (preset === 'all' || preset === 'custom') {
    return {};
  }
  if (preset === 'today') {
    return { from: todayStr, to: todayStr };
  }
  if (preset === 'this_week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    return { from: formatLocalDate(d), to: todayStr };
  }
  if (preset === 'this_month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: formatLocalDate(d), to: todayStr };
  }
  if (preset === 'last_month') {
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: formatLocalDate(startLastMonth), to: formatLocalDate(endLastMonth) };
  }
  if (preset === 'last_3_months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return { from: formatLocalDate(d), to: todayStr };
  }
  return {};
};
