from pydantic import BaseModel


class RecipeResponse(BaseModel):
    id: str
    name: str
    category: str | None = None
    area: str | None = None
    instructions: str | None = None
    thumbnail_url: str | None = None
    source_url: str | None = None
    ingredients: list[str] = []


class RecipeSuggestion(BaseModel):
    id: str
    name: str
    thumbnail_url: str | None = None
    matched_ingredients: list[str] = []
    source_url: str | None = None
    category: str | None = None
    area: str | None = None
