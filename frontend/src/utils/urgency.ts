import { UrgencyLevel, PantryItem, GroupedItems } from "@/types";
import { daysUntilExpiry } from "./date";

export function computeUrgency(expiryDate: string): UrgencyLevel {
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) return "expired";
  if (days === 0) return "today";
  if (days <= 7) return "this_week";
  return "fresh";
}

export function groupItemsByUrgency(items: PantryItem[]): GroupedItems {
  const groups: GroupedItems = {
    expired: [],
    today: [],
    this_week: [],
    fresh: [],
  };

  for (const item of items) {
    const urgency = item.urgency ?? computeUrgency(item.expiry_date);
    groups[urgency].push(item);
  }

  return groups;
}

export const urgencyConfig: Record<
  UrgencyLevel,
  {
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    order: number;
  }
> = {
  expired: {
    label: "Expired",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-200",
    order: 0,
  },
  today: {
    label: "Expiring Today",
    color: "orange",
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
    borderColor: "border-orange-200",
    order: 1,
  },
  this_week: {
    label: "Expiring This Week",
    color: "yellow",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-200",
    order: 2,
  },
  fresh: {
    label: "Fresh",
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-200",
    order: 3,
  },
};

/** Sorted urgency levels from most urgent to least */
export const URGENCY_ORDER: UrgencyLevel[] = [
  "expired",
  "today",
  "this_week",
  "fresh",
];
