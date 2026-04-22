import { useState } from 'react';
import { ChefHat, ExternalLink } from 'lucide-react';
import { useHouseholds } from '@/hooks/useHousehold';
import { useExpiringItems } from '@/hooks/useItems';
import { useRecipeSuggestions } from '@/hooks/useRecipes';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { getUrgency } from '@/utils/expiry';

function RecipeSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius-lg)] bg-surface p-4 shadow-md">
      <div className="mb-3 h-40 w-full rounded-[var(--radius-md)] bg-surface-subtle" />
      <div className="h-4 w-3/4 rounded bg-surface-subtle" />
      <div className="mt-2 h-3 w-1/2 rounded bg-surface-subtle" />
      <div className="mt-3 flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-surface-subtle" />
        <div className="h-5 w-20 rounded-full bg-surface-subtle" />
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const {
    data: households,
    isError: householdsError,
    refetch: refetchHouseholds,
  } = useHouseholds();
  const [selectedId, setSelectedId] = useState('');
  const householdId = selectedId || households?.[0]?.id || '';

  const { data: expiringItems } = useExpiringItems(householdId);
  const {
    data: recipes,
    isLoading,
    isError,
    refetch: refetchRecipes,
  } = useRecipeSuggestions(householdId);

  if (householdsError) {
    return (
      <EmptyState
        icon={<ChefHat className="h-10 w-10" />}
        title="Couldn't load households"
        description="Something went wrong. Try again in a moment."
        action={<Button onClick={() => void refetchHouseholds()}>Try again</Button>}
      />
    );
  }

  if (!householdId) {
    return (
      <EmptyState
        icon={<ChefHat className="h-10 w-10" />}
        title="No household yet"
        description="Create a household to get recipe suggestions based on what's expiring."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-4xl sm:text-5xl leading-none text-text-primary">Recipe ideas</h1>
          <p className="mt-1 text-sm text-text-muted">Made with the things that need using up first.</p>
        </div>
        {households && households.length > 1 && (
          <select
            value={householdId}
            onChange={(e) => setSelectedId(e.target.value)}
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
      </div>

      {/* Expiring items chips */}
      {expiringItems && expiringItems.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Using up
          </p>
          <div className="flex flex-wrap gap-2">
            {expiringItems.map((item) => {
              const u = getUrgency(item.expiry_date);
              return (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm shadow-sm"
                >
                  <span className="font-semibold text-text-primary">{item.name}</span>
                  <Badge urgency={u} expiryDate={item.expiry_date} />
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Recipes */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RecipeSkeleton />
          <RecipeSkeleton />
          <RecipeSkeleton />
        </div>
      ) : isError ? (
        <Card className="text-center">
          <p className="mb-3 text-text-muted">Recipe suggestions unavailable right now.</p>
          <Button size="sm" variant="secondary" onClick={() => void refetchRecipes()}>
            Try again
          </Button>
        </Card>
      ) : !recipes || recipes.length === 0 ? (
        <EmptyState
          icon={<ChefHat className="h-10 w-10" />}
          title="Nothing on the hob"
          description="Add items with expiry dates and we'll suggest ways to use them before they spoil."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Card key={recipe.id} hover className="!p-0 overflow-hidden">
              {recipe.thumbnail_url && (
                <img
                  src={recipe.thumbnail_url}
                  alt={recipe.name}
                  className="h-40 w-full object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-text-primary">{recipe.name}</h3>
                {recipe.category && (
                  <p className="mt-0.5 text-xs text-text-muted">{recipe.category}</p>
                )}
                {recipe.matched_ingredients && recipe.matched_ingredients.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {recipe.matched_ingredients.map((ing: string) => (
                      <span
                        key={ing}
                        className="rounded-full bg-[color:var(--color-expiry-safe)]/10 px-2 py-0.5 text-xs font-semibold text-[color:var(--color-expiry-safe)]"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                )}
                {recipe.source_url && (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    View recipe
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
