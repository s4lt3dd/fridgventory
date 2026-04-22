import {
  parseISO,
  differenceInCalendarDays,
  format,
  isValid,
  startOfDay,
} from 'date-fns';

/**
 * Returns the number of calendar days from today to the given expiry date.
 * Negative means already expired.
 */
export function daysUntilExpiry(expiryDate: string): number {
  const today = startOfDay(new Date());
  const expiry = startOfDay(parseISO(expiryDate));
  return differenceInCalendarDays(expiry, today);
}

/**
 * Formats an ISO date string to a human-readable date (e.g. "Apr 5, 2025").
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, 'MMM d, yyyy');
}

/**
 * Formats an ISO date string to a short date (e.g. "Apr 5").
 */
export function formatShortDate(dateString: string): string {
  if (!dateString) return '';
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, 'MMM d');
}

/**
 * Returns a human-readable label for how many days until/since expiry.
 */
export function expiryLabel(expiryDate: string): string {
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) {
    const abs = Math.abs(days);
    return abs === 1 ? 'Expired yesterday' : `Expired ${abs} days ago`;
  }
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

/**
 * Returns today's date in YYYY-MM-DD format (for date inputs).
 */
export function todayInputValue(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Returns a date N days from today in YYYY-MM-DD format.
 */
export function futureDateInputValue(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return format(d, 'yyyy-MM-dd');
}
