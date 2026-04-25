import { useState } from "react";
import { Link } from "react-router-dom";
import { Refrigerator, Users, Plus, ChefHat, Clock } from "lucide-react";
import { useHouseholds } from "@/hooks/useHousehold";
import { useItems, useUpdateItem, useDeleteItem } from "@/hooks/useItems";
import { useRescueRecipes } from "@/hooks/useRecipes";
import ItemList from "@/components/items/ItemList";
import ItemForm from "@/components/items/ItemForm";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import type {
  PantryItem,
  ItemCreate,
  RescueRecipe,
  RescueRecipeDifficulty,
} from "@/types";
import { getUrgency, getDaysRemaining } from "@/utils/expiry";

function difficultyClass(d: RescueRecipeDifficulty): string {
  if (d === "easy") return "bg-expiry-safe/10 text-expiry-safe";
  if (d === "medium") return "bg-expiry-warning/10 text-expiry-warning";
  return "bg-expiry-danger/10 text-expiry-danger";
}

interface RescueRecipeCardProps {
  recipe: RescueRecipe;
  expiringNames: Set<string>;
}

function RescueRecipeCard({ recipe, expiringNames }: RescueRecipeCardProps) {
  return (
    <div className="rounded-2xl bg-surface shadow-md p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <h3 className="font-display text-2xl leading-tight text-primary">
        {recipe.name}
      </h3>
      <p className="text-sm text-text-muted line-clamp-3">
        {recipe.description}
      </p>
      {recipe.uses_items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.uses_items.map((name) => {
            const matches = expiringNames.has(name);
            const pillClass = matches
              ? "bg-expiry-danger/10 text-expiry-danger"
              : "bg-surface-subtle text-text-muted";
            return (
              <span
                key={name}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pillClass}`}
              >
                {name}
              </span>
            );
          })}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
          <Clock className="h-3.5 w-3.5" />
          {recipe.estimated_time_minutes} min
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${difficultyClass(recipe.difficulty)}`}
        >
          {recipe.difficulty}
        </span>
      </div>
    </div>
  );
}

function RescueSkeletonCard() {
  return (
    <div className="rounded-2xl bg-surface shadow-md p-5 animate-pulse flex flex-col gap-3">
      <div className="h-6 w-2/3 rounded-md bg-surface-subtle" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded-md bg-surface-subtle" />
        <div className="h-3 w-5/6 rounded-md bg-surface-subtle" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 w-16 rounded-full bg-surface-subtle" />
        <div className="h-5 w-20 rounded-full bg-surface-subtle" />
        <div className="h-5 w-14 rounded-full bg-surface-subtle" />
      </div>
      <div className="mt-auto flex items-center justify-between pt-2">
        <div className="h-4 w-12 rounded-md bg-surface-subtle" />
        <div className="h-5 w-16 rounded-full bg-surface-subtle" />
      </div>
    </div>
  );
}

interface StatCardProps {
  value: number;
  label: string;
  tone?: "default" | "danger" | "warning" | "safe";
}

function StatCard({ value, label, tone = "default" }: StatCardProps) {
  const toneClass =
    tone === "danger"
      ? "text-[color:var(--color-expiry-danger)]"
      : tone === "warning"
        ? "text-[color:var(--color-expiry-warning)]"
        : tone === "safe"
          ? "text-[color:var(--color-expiry-safe)]"
          : "text-text-primary";
  return (
    <Card className="!p-4 text-center">
      <p className={`font-display text-5xl leading-none ${toneClass}`}>
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </p>
    </Card>
  );
}

export default function DashboardPage() {
  const {
    data: households,
    isLoading: householdsLoading,
    isError: householdsError,
    refetch: refetchHouseholds,
  } = useHouseholds();
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>("");
  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [editFormError, setEditFormError] = useState("");

  const householdId = selectedHouseholdId || households?.[0]?.id || "";
  const {
    grouped,
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useItems(householdId);
  const updateItem = useUpdateItem(householdId);
  const deleteItem = useDeleteItem(householdId);

  // Derive expiring-soon items upfront so the hook call order is stable.
  const allItemsEarly: PantryItem[] = Object.values(grouped).flat();
  const expiringSoonItems = allItemsEarly.filter(
    (it) => getDaysRemaining(it.expiry_date) <= 3,
  );
  const expiringSoonCount = expiringSoonItems.length;
  const expiringNames = new Set(expiringSoonItems.map((it) => it.name));
  const rescue = useRescueRecipes(householdId, expiringSoonCount >= 3);

  if (householdsLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (householdsError) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="Couldn't load your households"
        description="Something went wrong fetching your households. Check your connection and try again."
        action={
          <Button onClick={() => void refetchHouseholds()}>Try again</Button>
        }
      />
    );
  }

  if (!households || households.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="Welcome to FridgeCheck"
        description="Create a household or join one with an invite link to start tracking what's in your fridge."
        action={
          <Link to="/app/households">
            <Button>Set up a household</Button>
          </Link>
        }
      />
    );
  }

  const allItems: PantryItem[] = allItemsEarly;
  const totalItems = allItems.length;

  // Count by new 3-tier urgency using expiry date (today/tomorrow = danger).
  let dangerCount = 0;
  let warningCount = 0;
  let safeCount = 0;
  for (const it of allItems) {
    const u = getUrgency(it.expiry_date);
    if (u === "danger") dangerCount++;
    else if (u === "warning") warningCount++;
    else safeCount++;
  }

  const handleEditSubmit = (data: ItemCreate) => {
    if (editItem) {
      setEditFormError("");
      updateItem.mutate(
        { itemId: editItem.id, data },
        {
          onSuccess: () => {
            setEditItem(null);
            setEditFormError("");
          },
          onError: () =>
            setEditFormError("Couldn't save changes. Please try again."),
        },
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl sm:text-5xl leading-none text-text-primary">
            Your fridge
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {totalItems === 0
              ? "Nothing tracked yet — let's fix that."
              : `Tracking ${totalItems} ${totalItems === 1 ? "item" : "items"}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {households.length > 1 && (
            <select
              value={householdId}
              onChange={(e) => setSelectedHouseholdId(e.target.value)}
              aria-label="Household"
              className="h-10 max-w-[180px] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm font-semibold text-text-primary transition-all duration-150 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 cursor-pointer"
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
          <Link to="/app/add-item" className="hidden md:inline-flex">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        <StatCard value={totalItems} label="Items" />
        <StatCard value={dangerCount} label="Today / Tomorrow" tone="danger" />
        <StatCard value={warningCount} label="In 2-4 days" tone="warning" />
        <div className="hidden sm:block">
          <StatCard value={safeCount} label="5+ days" tone="safe" />
        </div>
      </div>

      {/* Rescue Recipes */}
      {expiringSoonCount >= 3 && (
        <section aria-labelledby="rescue-recipes-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ChefHat className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="rescue-recipes-heading"
                className="font-display text-3xl leading-none text-text-primary"
              >
                Rescue Recipes
              </h2>
              <p className="text-sm text-text-muted">
                Use up what's about to expire
              </p>
            </div>
          </div>

          {rescue.isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <RescueSkeletonCard />
              <RescueSkeletonCard />
              <RescueSkeletonCard />
            </div>
          ) : rescue.isError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
            >
              <p className="text-sm font-semibold text-primary">
                Couldn't load recipes — try again
              </p>
              <Button size="sm" onClick={() => void rescue.refetch()}>
                Retry
              </Button>
            </div>
          ) : rescue.data && rescue.data.recipes.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rescue.data.recipes.map((r) => (
                <RescueRecipeCard
                  key={r.name}
                  recipe={r}
                  expiringNames={expiringNames}
                />
              ))}
            </div>
          ) : null}
        </section>
      )}

      {deleteItem.isError && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary"
        >
          Couldn't delete that item. Please try again.
        </div>
      )}

      {/* Item list */}
      {itemsLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : itemsError ? (
        <EmptyState
          icon={<Refrigerator className="h-10 w-10" />}
          title="Couldn't load your items"
          description="Something went wrong fetching the fridge contents."
          action={
            <Button onClick={() => void refetchItems()}>Try again</Button>
          }
        />
      ) : totalItems === 0 ? (
        <EmptyState
          icon={<Refrigerator className="h-10 w-10" />}
          title="Your fridge is empty"
          description="Add your first item and we'll remind you before it expires."
          action={
            <Link to="/app/add-item">
              <Button>Add your first item</Button>
            </Link>
          }
        />
      ) : (
        <ItemList
          grouped={grouped}
          onEdit={(item) => setEditItem(item)}
          onDelete={(id) => deleteItem.mutate(id)}
        />
      )}

      {/* Edit modal */}
      <Modal
        isOpen={editItem !== null}
        onClose={() => {
          setEditItem(null);
          setEditFormError("");
        }}
        title="Edit item"
      >
        {editItem && (
          <>
            {editFormError && (
              <div
                role="alert"
                className="mb-4 rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary"
              >
                {editFormError}
              </div>
            )}
            <ItemForm
              editItem={editItem}
              onSubmit={handleEditSubmit}
              onCancel={() => {
                setEditItem(null);
                setEditFormError("");
              }}
              loading={updateItem.isPending}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
