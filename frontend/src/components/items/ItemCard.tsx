import { Pencil, Trash2 } from "lucide-react";
import type { PantryItem } from "@/types";
import Badge from "@/components/ui/Badge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import {
  getUrgency,
  getDaysRemaining,
  formatDaysRemaining,
  getExpiryProgress,
} from "@/utils/expiry";

interface ItemCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}

const progressColor: Record<"safe" | "warning" | "danger", string> = {
  safe: "bg-expiry-safe",
  warning: "bg-expiry-warning",
  danger: "bg-expiry-danger",
};

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const urgency = getUrgency(item.expiry_date);
  const days = getDaysRemaining(item.expiry_date);
  const progress = getExpiryProgress(item.added_date, item.expiry_date);

  return (
    <div className="hover-lift flex items-center gap-3 rounded-[var(--radius-md)] border border-border/40 bg-surface p-3 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-primary">
        <CategoryIcon category={item.category} size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {item.name}
          </h3>
          <Badge urgency={urgency} expiryDate={item.expiry_date} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
          <span className="font-medium">
            {item.quantity} {item.unit}
          </span>
          <span>{formatDaysRemaining(days)}</span>
        </div>
        {item.notes && (
          <p className="mt-1 truncate text-xs text-text-muted/80">
            {item.notes}
          </p>
        )}
        {/* Shelf-life progress */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/50">
          <div
            className={`h-full ${progressColor[urgency]} transition-all duration-300`}
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.name}`}
          className="rounded-full p-2 text-text-muted transition-colors duration-150 hover:bg-surface-subtle hover:text-primary cursor-pointer focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          aria-label={`Delete ${item.name}`}
          className="rounded-full p-2 text-text-muted transition-colors duration-150 hover:bg-primary/10 hover:text-primary cursor-pointer focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
