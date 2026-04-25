import clsx from "clsx";
import { Home } from "lucide-react";
import type { Household } from "@/types";

interface HouseholdCardProps {
  household: Household;
  isSelected: boolean;
  onClick: () => void;
}

export default function HouseholdCard({
  household,
  isSelected,
  onClick,
}: HouseholdCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full rounded-[var(--radius-md)] border p-4 text-left transition-all duration-200 cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-surface hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isSelected
              ? "bg-primary text-white"
              : "bg-surface-subtle text-primary",
          )}
        >
          <Home className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {household.name}
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Created {new Date(household.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </button>
  );
}
