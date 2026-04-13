import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, parseISO } from 'date-fns';

export type DateRangePreset = 'last7days' | 'last30days' | 'lastMonth' | 'last3months' | 'last6months' | 'ytd' | 'last12months';

export interface DateRange {
  from: string; // ISO 8601 date string: YYYY-MM-DD
  to: string;
}

/**
 * Returns a DateRange for a named preset relative to today.
 */
export function getPresetDateRange(preset: DateRangePreset): DateRange {
  const today = new Date();

  switch (preset) {
    case 'last7days':
      return { from: formatDate(subDays(today, 7)), to: formatDate(today) };
    case 'last30days':
      return { from: formatDate(subDays(today, 30)), to: formatDate(today) };
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1);
      return { from: formatDate(startOfMonth(lastMonth)), to: formatDate(endOfMonth(lastMonth)) };
    }
    case 'last3months':
      return { from: formatDate(subMonths(today, 3)), to: formatDate(today) };
    case 'last6months':
      return { from: formatDate(subMonths(today, 6)), to: formatDate(today) };
    case 'ytd':
      return { from: formatDate(startOfYear(today)), to: formatDate(today) };
    case 'last12months':
      return { from: formatDate(subMonths(today, 12)), to: formatDate(today) };
    default:
      return { from: formatDate(subDays(today, 30)), to: formatDate(today) };
  }
}

/**
 * Format a Date object to YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse an ISO date string to a Date object.
 */
export function parseDate(dateStr: string): Date {
  return parseISO(dateStr);
}

/**
 * Returns the number of days between two date strings.
 */
export function daysBetween(from: string, to: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / msPerDay));
}

/**
 * Returns true if a date string is a valid ISO date.
 */
export function isValidDate(dateStr: string): boolean {
  const parsed = parseISO(dateStr);
  return !isNaN(parsed.getTime());
}

/**
 * Get billing period label (e.g. "March 2025") from a date string.
 */
export function getBillingPeriodLabel(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM yyyy');
}
