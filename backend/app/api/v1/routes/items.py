"""Pantry item routes."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user, require_household_member
from app.database import get_db
from app.models.user import User
from app.schemas.item import ItemCreate, ItemResponse, ItemsGroupedResponse, ItemUpdate
from app.services.item_service import ItemService, compute_urgency

router = APIRouter(prefix="/households/{household_id}/items", tags=["items"])


@router.get("", response_model=ItemsGroupedResponse)
async def list_items(
    household_id: uuid.UUID,
    _member=Depends(require_household_member),
    db: AsyncSession = Depends(get_db),
) -> ItemsGroupedResponse:
    item_service = ItemService(db)
    items = await item_service.get_household_items(household_id)
    grouped = ItemsGroupedResponse()
    for item in items:
        if item.urgency == "expired":
            grouped.expired.append(item)
        elif item.urgency == "today":
            grouped.today.append(item)
        elif item.urgency == "this_week":
            grouped.this_week.append(item)
        else:
            grouped.fresh.append(item)
    return grouped


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    household_id: uuid.UUID,
    body: ItemCreate,
    current_user: User = Depends(get_current_user),
    _member=Depends(require_household_member),
    db: AsyncSession = Depends(get_db),
) -> ItemResponse:
    item_service = ItemService(db)
    return await item_service.add_item(household_id, current_user.id, body)


@router.get("/expiring", response_model=list[ItemResponse])
async def expiring_items(
    household_id: uuid.UUID,
    days: int = 3,
    _member=Depends(require_household_member),
    db: AsyncSession = Depends(get_db),
) -> list[ItemResponse]:
    item_service = ItemService(db)
    return await item_service.get_expiring_items(household_id, days)


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    household_id: uuid.UUID,
    item_id: uuid.UUID,
    _member=Depends(require_household_member),
    db: AsyncSession = Depends(get_db),
) -> ItemResponse:
    item_service = ItemService(db)
    item = await item_service.get_item(item_id, household_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    household_id: uuid.UUID,
    item_id: uuid.UUID,
    body: ItemUpdate,
    _member=Depends(require_household_member),
    db: AsyncSession = Depends(get_db),
) -> ItemResponse:
    item_service = ItemService(db)
    updated = await item_service.update_item(item_id, household_id, body)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return updated


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    household_id: uuid.UUID,
    item_id: uuid.UUID,
    _member=Depends(require_household_member),
    db: AsyncSession = Depends(get_db),
) -> None:
    item_service = ItemService(db)
    deleted = await item_service.delete_item(item_id, household_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
