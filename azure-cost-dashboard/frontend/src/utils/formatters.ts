/**
 * Formatting utilities for the frontend.
 * These wrap the same logic as the backend currencyFormatter for consistency.
 */

const DEFAULT_CURRENCY = 'USD';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$', JPY: '¥', INR: '₹',
};

export function formatCurrency(
  amount: number,
  currency = DEFAULT_CURRENCY,
  decimals = 2
): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 1_000_000)
    return `${sign}${symbol}${(absAmount / 1_000_000).toFixed(decimals)}M`;
  if (absAmount >= 1_000)
    return `${sign}${symbol}${(absAmount / 1_000).toFixed(decimals)}K`;
  return `${sign}${symbol}${absAmount.toFixed(decimals)}`;
}

export function formatCompactCurrency(amount: number, currency = DEFAULT_CURRENCY): string {
  return formatCurrency(amount, currency, 1);
}

export function formatPercentage(value: number | undefined, decimals = 1): string {
  if (value === undefined || value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatDelta(delta: number | undefined, currency = DEFAULT_CURRENCY): string {
  if (delta === undefined || delta === null) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatCurrency(delta, currency)}`;
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
