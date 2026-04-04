"""Recipe suggestion routes."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_household_member
from app.database import get_db
from app.schemas.recipe import RecipeSuggestion
from app.services.item_service import ItemService
from app.services.recipe_service import RecipeService

router = APIRouter(prefix="/households/{household_id}/recipes", tags=["recipes"])


@router.get("", response_model=list[RecipeSuggestion])
async def get_recipe_suggestions(
    household_id: uuid.UUID,
    _member=Depends(require_household_member),
    db: AsyncSession = Depends(get_db),
) -> list[RecipeSuggestion]:
    item_service = ItemService(db)
    expiring = await item_service.get_expiring_items(household_id, days=3)

    recipe_service = RecipeService()
    return await recipe_service.get_suggestions(expiring)
