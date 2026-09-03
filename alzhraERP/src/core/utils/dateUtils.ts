/**
 * Date utilities for local timezone handling without UTC shift.
 */

/**
 * Formats a Date object to YYYY-MM-DD using local calendar date parts,
 * preventing UTC day shifts in timezones ahead of UTC (such as GMT+3).
 */
export const formatLocalDate = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Returns the first day of the current year in local format YYYY-01-01.
 */
export const getLocalYearStart = (year: number = new Date().getFullYear()): string => {
  return `${year}-01-01`;
};
