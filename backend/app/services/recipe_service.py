import httpx
import structlog

from app.config import settings
from app.schemas.item import ItemResponse
from app.schemas.recipe import RecipeSuggestion

logger = structlog.get_logger()

# Fallback suggestions when the API is unavailable
_FALLBACK_RECIPES: list[RecipeSuggestion] = [
    RecipeSuggestion(
        id="fallback-1",
        name="Simple Stir Fry",
        thumbnail_url=None,
        matched_ingredients=[],
        category="Main",
        area="Any",
    ),
    RecipeSuggestion(
        id="fallback-2",
        name="Vegetable Soup",
        thumbnail_url=None,
        matched_ingredients=[],
        category="Soup",
        area="Any",
    ),
    RecipeSuggestion(
        id="fallback-3",
        name="Omelette",
        thumbnail_url=None,
        matched_ingredients=[],
        category="Breakfast",
        area="Any",
    ),
]


class RecipeService:
    def __init__(self) -> None:
        self.api_url = settings.recipe_api_url

    async def get_suggestions(
        self, expiring_items: list[ItemResponse]
    ) -> list[RecipeSuggestion]:
        if not expiring_items:
            return self._get_fallback_suggestions([])

        # Take up to 5 expiring items as ingredient hints
        ingredient_names = [item.name for item in expiring_items[:5]]

        all_suggestions: list[RecipeSuggestion] = []
        seen_ids: set[str] = set()

        async with httpx.AsyncClient(timeout=5.0) as client:
            for ingredient in ingredient_names:
                try:
                    recipes = await self._fetch_from_api(client, ingredient)
                    for recipe in recipes:
                        if recipe["idMeal"] not in seen_ids:
                            seen_ids.add(recipe["idMeal"])
                            suggestion = self._map_meal_to_suggestion(recipe, ingredient)
                            all_suggestions.append(suggestion)
                except Exception as exc:
                    logger.warning(
                        "Recipe API fetch failed",
                        ingredient=ingredient,
                        error=str(exc),
                    )

        if not all_suggestions:
            logger.info("No recipes found from API, using fallback suggestions")
            return self._get_fallback_suggestions(expiring_items)

        # Sort by number of matched ingredients (desc) and return top 10
        all_suggestions.sort(key=lambda s: len(s.matched_ingredients), reverse=True)
        return all_suggestions[:10]

    async def _fetch_from_api(
        self, client: httpx.AsyncClient, ingredient: str
    ) -> list[dict]:
        url = f"{self.api_url}/filter.php"
        response = await client.get(url, params={"i": ingredient})
        response.raise_for_status()
        data = response.json()
        meals = data.get("meals") or []
        return meals  # type: ignore[return-value]

    def _map_meal_to_suggestion(
        self, meal: dict, matched_ingredient: str
    ) -> RecipeSuggestion:
        return RecipeSuggestion(
            id=meal.get("idMeal", ""),
            name=meal.get("strMeal", "Unknown"),
            thumbnail_url=meal.get("strMealThumb"),
            matched_ingredients=[matched_ingredient],
            source_url=f"https://www.themealdb.com/meal/{meal.get('idMeal', '')}",
            category=meal.get("strCategory"),
            area=meal.get("strArea"),
        )

    def _get_fallback_suggestions(
        self, items: list[ItemResponse]
    ) -> list[RecipeSuggestion]:
        # Enrich fallback suggestions with matched ingredient names if possible
        ingredient_names = [item.name for item in items]
        suggestions = list(_FALLBACK_RECIPES)
        for suggestion in suggestions:
            suggestion.matched_ingredients = ingredient_names[:2]
        return suggestions
