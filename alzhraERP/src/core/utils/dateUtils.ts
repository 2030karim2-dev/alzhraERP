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
