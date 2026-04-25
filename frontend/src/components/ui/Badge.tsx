import clsx from "clsx";
import type { UrgencyLevel } from "@/types";
import { daysUntilExpiry } from "@/utils/date";

export type BadgeUrgency = "safe" | "warning" | "danger";

interface BadgeProps {
  /** New 3-tier urgency, or legacy UrgencyLevel. */
  urgency: BadgeUrgency | UrgencyLevel;
  /** Optional expiry date to compute a more specific label ("Today!"/"Tomorrow"). */
  expiryDate?: string;
  className?: string;
  children?: React.ReactNode;
}

const styles: Record<BadgeUrgency, string> = {
  safe: "bg-[color:var(--color-expiry-safe)]/10 text-[color:var(--color-expiry-safe)]",
  warning:
    "bg-[color:var(--color-expiry-warning)]/10 text-[color:var(--color-expiry-warning)]",
  danger:
    "bg-[color:var(--color-expiry-danger)]/10 text-[color:var(--color-expiry-danger)]",
};

function normaliseUrgency(u: BadgeProps["urgency"]): BadgeUrgency {
  if (u === "safe" || u === "warning" || u === "danger") return u;
  if (u === "fresh") return "safe";
  if (u === "this_week") return "warning";
  return "danger"; // today, expired
}

function defaultLabel(u: BadgeUrgency, expiryDate?: string): string {
  if (expiryDate) {
    const days = daysUntilExpiry(expiryDate);
    if (days < 0) return "Expired";
    if (days === 0) return "Today!";
    if (days === 1) return "Tomorrow";
  }
  if (u === "safe") return "Fresh";
  if (u === "warning") return "Use soon";
  return "Urgent";
}

export default function Badge({
  urgency,
  expiryDate,
  className,
  children,
}: BadgeProps) {
  const u = normaliseUrgency(urgency);
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        styles[u],
        className,
      )}
    >
      {children ?? defaultLabel(u, expiryDate)}
    </span>
  );
}
