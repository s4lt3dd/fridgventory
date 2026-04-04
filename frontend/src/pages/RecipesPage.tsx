import { useHouseholds } from '@/hooks/useHousehold';
import { useExpiringItems } from '@/hooks/useItems';
import { useRecipeSuggestions } from '@/hooks/useRecipes';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useState } from 'react';

export default function RecipesPage() {
  const { data: households } = useHouseholds();
  const [selectedId, setSelectedId] = useState('');
  const householdId = selectedId || households?.[0]?.id || '';

  const { data: expiringItems } = useExpiringItems(householdId);
  const { data: recipes, isLoading, isError } = useRecipeSuggestions(householdId);

  if (!householdId) {
    return (
      <div className="py-12 text-center text-gray-600">
        Create a household first to get recipe suggestions.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Recipe Suggestions</h1>
        <p className="mt-1 text-sm text-gray-600">Based on items expiring within 3 days</p>
      </div>

      {households && households.length > 1 && (
        <select
          value={householdId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mb-4 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {households.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      )}

      {/* Expiring items chips */}
      {expiringItems && expiringItems.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {expiringItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm"
            >
              <span className="font-medium text-orange-800">{item.name}</span>
              <Badge urgency={item.urgency} />
            </span>
          ))}
        </div>
      )}

      {/* Recipes */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : isError ? (
        <Card className="p-6 text-center">
          <p className="text-gray-600">Recipe suggestions unavailable — showing fallbacks</p>
        </Card>
      ) : !recipes || recipes.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-600">No items expiring soon. Add items with expiry dates to get suggestions.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="overflow-hidden">
              {recipe.thumbnail_url && (
                <img
                  src={recipe.thumbnail_url}
                  alt={recipe.name}
                  className="-mx-4 -mt-4 mb-3 h-40 w-[calc(100%+2rem)] object-cover"
                />
              )}
              <h3 className="text-sm font-semibold text-gray-900">{recipe.name}</h3>
              {recipe.category && (
                <p className="mt-1 text-xs text-gray-500">{recipe.category}</p>
              )}
              {recipe.matched_ingredients && recipe.matched_ingredients.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {recipe.matched_ingredients.map((ing) => (
                    <span
                      key={ing}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
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
                  className="mt-3 inline-block text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  View recipe
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
