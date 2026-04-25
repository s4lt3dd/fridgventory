import { useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import type { UrgencyLevel, PantryItem } from "@/types";
import ItemCard from "./ItemCard";

interface UrgencyGroupProps {
  urgency: UrgencyLevel;
  items: PantryItem[];
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}

const CONFIG: Record<
  UrgencyLevel,
  { title: string; tone: "danger" | "warning" | "safe" }
> = {
  expired: { title: "Expired", tone: "danger" },
  today: { title: "Use today or tomorrow", tone: "danger" },
  this_week: { title: "Use this week", tone: "warning" },
  fresh: { title: "Fresh", tone: "safe" },
};

const toneStyles = {
  danger: "text-[color:var(--color-expiry-danger)]",
  warning: "text-[color:var(--color-expiry-warning)]",
  safe: "text-[color:var(--color-expiry-safe)]",
};

const toneDot = {
  danger: "bg-[color:var(--color-expiry-danger)]",
  warning: "bg-[color:var(--color-expiry-warning)]",
  safe: "bg-[color:var(--color-expiry-safe)]",
};

export default function UrgencyGroup({
  urgency,
  items,
  onEdit,
  onDelete,
}: UrgencyGroupProps) {
  // Collapse "Fresh" by default when there are lots of items.
  const initialCollapsed = urgency === "fresh" && items.length > 10;
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const config = CONFIG[urgency];

  if (items.length === 0) return null;

  return (
    <section className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-2 transition-colors duration-150 hover:bg-surface cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span
            className={clsx("h-2.5 w-2.5 rounded-full", toneDot[config.tone])}
          />
          <h2
            className={clsx("font-display text-2xl", toneStyles[config.tone])}
          >
            {config.title}
          </h2>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-text-muted shadow-sm">
            {items.length}
          </span>
        </div>
        <ChevronDown
          className={clsx(
            "h-5 w-5 text-text-muted transition-transform duration-200",
            collapsed && "-rotate-90",
          )}
        />
      </button>
      {!collapsed && (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
