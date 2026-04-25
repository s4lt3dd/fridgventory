import { daysUntilExpiry } from "./date";
import { parseISO, differenceInCalendarDays, startOfDay } from "date-fns";

export type Urgency = "safe" | "warning" | "danger";

/**
 * Bucket expiry date into 3-tier urgency:
 * - past or today/tomorrow = danger
 * - 2–4 days = warning
 * - 5+ days = safe
 */
export function getUrgency(expiryDate: string): Urgency {
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) return "danger";
  if (days <= 1) return "danger";
  if (days <= 4) return "warning";
  return "safe";
}

/** Days remaining until expiry (negative = past). */
export function getDaysRemaining(expiryDate: string): number {
  return daysUntilExpiry(expiryDate);
}

/** Human-friendly label for a days-remaining value. */
export function formatDaysRemaining(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    if (abs === 1) return "Expired yesterday";
    return `Expired ${abs} days ago`;
  }
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "In 1 week";
  if (days < 30) return `In ${Math.round(days / 7)} weeks`;
  if (days < 60) return "In 1 month";
  return `In ${Math.round(days / 30)} months`;
}

/**
 * Progress through the shelf life, 0–100.
 * 0 = just added, 100 = at/past expiry.
 */
export function getExpiryProgress(
  addedDate: string,
  expiryDate: string,
): number {
  const added = startOfDay(parseISO(addedDate));
  const expiry = startOfDay(parseISO(expiryDate));
  const today = startOfDay(new Date());
  const total = differenceInCalendarDays(expiry, added);
  if (total <= 0) return 100;
  const elapsed = differenceInCalendarDays(today, added);
  const pct = (elapsed / total) * 100;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}
