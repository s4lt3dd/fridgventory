"""Recipe suggestion routes."""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user, require_household_member
from app.database import get_db
from app.models.user import User
from app.schemas.recipe import (
    RecipeSuggestion,
    RescueRecipeRequest,
    RescueRecipeResponse,
)
from app.services import rescue_recipe_service
from app.services.item_service import ItemService
from app.services.recipe_service import RecipeService

router = APIRouter()

household_router = APIRouter(prefix="/households/{household_id}/recipes", tags=["recipes"])


@household_router.get("", response_model=list[RecipeSuggestion])
async def get_recipe_suggestions(
    household_id: uuid.UUID,
    _member=Depends(require_household_member),
    db: AsyncSession = Depends(get_db),
) -> list[RecipeSuggestion]:
    item_service = ItemService(db)
    expiring = await item_service.get_expiring_items(household_id, days=3)

    recipe_service = RecipeService()
    return await recipe_service.get_suggestions(expiring)


rescue_router = APIRouter(prefix="/recipes", tags=["recipes"])


@rescue_router.post("/rescue", response_model=RescueRecipeResponse)
async def suggest_rescue_recipes(
    payload: RescueRecipeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RescueRecipeResponse:
    redis = getattr(request.app.state, "redis", None)
    return await rescue_recipe_service.suggest_rescue_recipes(
        db=db,
        household_id=payload.household_id,
        user_id=current_user.id,
        redis=redis,
    )


# Re-export a combined router so main.py can mount both
router.include_router(household_router)
router.include_router(rescue_router)
