/**
 * Lightweight form validation helpers used across auth and item forms.
 * Keep rules conservative — the backend is the source of truth.
 */

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length > 0 && v.includes('@') && v.indexOf('@') < v.length - 1;
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8;
}

/**
 * Returns true when the YYYY-MM-DD date string is today or later.
 * Empty strings are treated as invalid.
 */
export function isNotPastDate(value: string): boolean {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}

export function isPositiveQuantity(value: string | number): boolean {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0;
}
