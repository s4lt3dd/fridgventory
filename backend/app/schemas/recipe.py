import uuid
from typing import Literal

from pydantic import BaseModel, Field


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


class RescueRecipe(BaseModel):
    name: str
    description: str
    uses_items: list[str] = Field(default_factory=list)
    estimated_time_minutes: int
    difficulty: Literal["easy", "medium", "hard"]


class RescueRecipeResponse(BaseModel):
    recipes: list[RescueRecipe]


class RescueRecipeRequest(BaseModel):
    household_id: uuid.UUID
