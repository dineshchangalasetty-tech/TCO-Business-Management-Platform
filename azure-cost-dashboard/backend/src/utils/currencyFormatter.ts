/**
 * Currency and number formatting utilities for consistent display across the application.
 */

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'JPY' | 'INR';

/**
 * Format a numeric cost value as a localized currency string.
 * @param amount - The numeric amount
 * @param currency - ISO 4217 currency code (default: USD)
 * @param locale - BCP 47 locale string (default: en-US)
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a large number with K/M/B suffix for compact display in KPI cards.
 * e.g. 1234567 → "$1.23M"
 */
export function formatCompactCurrency(amount: number, currency: SupportedCurrency = 'USD'): string {
  const symbol = getCurrencySymbol(currency);

  if (Math.abs(amount) >= 1_000_000_000) {
    return `${symbol}${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Format a percentage value with a + sign for positive deltas.
 */
export function formatPercentage(value: number, includeSign = false): string {
  const formatted = `${Math.abs(value).toFixed(1)}%`;
  if (includeSign) {
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}

/**
 * Format a delta (change) value with sign and currency symbol.
 */
export function formatDelta(delta: number, currency: SupportedCurrency = 'USD'): string {
  const sign = delta >= 0 ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(delta), currency)}`;
}

/**
 * Round to a specified number of decimal places.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Returns the currency symbol for a given ISO 4217 code.
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  const symbols: Record<SupportedCurrency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
    JPY: '¥',
    INR: '₹',
  };
  return symbols[currency] ?? '$';
}

/**
 * Calculate percentage change between two values.
 * Returns null if previous value is zero.
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return roundTo(((current - previous) / previous) * 100, 1);
}
