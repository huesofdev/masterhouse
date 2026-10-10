/**
 * Monetary utility functions to prevent IEEE-754 floating-point precision errors
 * across financial calculations, payment processing, and validation comparisons.
 */

/**
 * Rounds a number to 2 decimal places using standard financial rounding.
 */
export function roundMoney(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Checks if a monetary amount is effectively zero (within a 1-cent tolerance).
 */
export function isZeroMoney(amount: number): boolean {
  return Math.abs(roundMoney(amount)) <= 0.01;
}

/**
 * Compares two monetary amounts for equality within a 1-cent tolerance.
 */
export function moneyEquals(a: number, b: number): boolean {
  return Math.abs(roundMoney(a) - roundMoney(b)) <= 0.01;
}

/**
 * Format monetary amount with 2 decimal places and locale thousand separators.
 */
export function formatMoney(amount: number): string {
  return roundMoney(amount).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
