import uuid
from datetime import date, timedelta

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import PantryItem
from app.repositories.item_repository import ItemRepository
from app.schemas.item import ItemCreate, ItemResponse, ItemUpdate

logger = structlog.get_logger()


def compute_urgency(expiry_date: date) -> str:
    today = date.today()
    delta = (expiry_date - today).days

    if delta < 0:
        return "expired"
    elif delta == 0:
        return "today"
    elif delta <= 7:
        return "this_week"
    else:
        return "fresh"


def _to_response(item: PantryItem) -> ItemResponse:
    return ItemResponse(
        id=item.id,
        household_id=item.household_id,
        name=item.name,
        category=item.category,
        quantity=item.quantity,
        unit=item.unit,
        added_date=item.added_date,
        expiry_date=item.expiry_date,
        added_by=item.added_by,
        deleted_at=item.deleted_at,
        notes=item.notes,
        created_at=item.created_at,
        updated_at=item.updated_at,
        urgency=compute_urgency(item.expiry_date),
    )


class ItemService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.item_repo = ItemRepository(db)

    async def get_household_items(self, household_id: uuid.UUID) -> list[ItemResponse]:
        items = await self.item_repo.get_by_household(household_id)
        responses = [_to_response(item) for item in items]
        # Sort: expired first, then by expiry_date ascending
        urgency_order = {"expired": 0, "today": 1, "this_week": 2, "fresh": 3}
        responses.sort(key=lambda r: (urgency_order.get(r.urgency, 99), r.expiry_date))
        return responses

    async def add_item(
        self,
        household_id: uuid.UUID,
        user_id: uuid.UUID,
        item_data: ItemCreate,
    ) -> ItemResponse:
        # Idempotency: if same-named item exists, increment quantity
        existing = await self.item_repo.find_duplicate(household_id, item_data.name)
        if existing:
            updated = await self.item_repo.update(
                existing.id, {"quantity": existing.quantity + item_data.quantity}
            )
            logger.info(
                "Item quantity incremented",
                item_id=str(existing.id),
                new_quantity=updated.quantity if updated else None,
            )
            return _to_response(updated or existing)

        item = await self.item_repo.create(
            household_id=household_id,
            name=item_data.name,
            category=item_data.category.value,
            quantity=item_data.quantity,
            unit=item_data.unit,
            added_date=date.today(),
            expiry_date=item_data.expiry_date,
            added_by=user_id,
            notes=item_data.notes,
        )
        logger.info("Item added", item_id=str(item.id), household_id=str(household_id))
        return _to_response(item)

    async def get_item(
        self, item_id: uuid.UUID, household_id: uuid.UUID
    ) -> ItemResponse | None:
        item = await self.item_repo.get_by_id(item_id)
        if not item or item.household_id != household_id:
            return None
        return _to_response(item)

    async def update_item(
        self,
        item_id: uuid.UUID,
        household_id: uuid.UUID,
        data: ItemUpdate,
    ) -> ItemResponse | None:
        item = await self.item_repo.get_by_id(item_id)
        if not item or item.household_id != household_id:
            return None

        update_dict: dict = {}
        if data.name is not None:
            update_dict["name"] = data.name
        if data.category is not None:
            update_dict["category"] = data.category.value
        if data.quantity is not None:
            update_dict["quantity"] = data.quantity
        if data.unit is not None:
            update_dict["unit"] = data.unit
        if data.expiry_date is not None:
            update_dict["expiry_date"] = data.expiry_date
        if data.notes is not None:
            update_dict["notes"] = data.notes

        updated = await self.item_repo.update(item_id, update_dict)
        if not updated:
            return None
        logger.info("Item updated", item_id=str(item_id))
        return _to_response(updated)

    async def delete_item(self, item_id: uuid.UUID, household_id: uuid.UUID) -> bool:
        item = await self.item_repo.get_by_id(item_id)
        if not item or item.household_id != household_id:
            return False
        result = await self.item_repo.soft_delete(item_id)
        if result:
            logger.info("Item soft-deleted", item_id=str(item_id))
        return result

    async def get_expiring_items(
        self, household_id: uuid.UUID, days: int = 3
    ) -> list[ItemResponse]:
        items = await self.item_repo.get_expiring_soon(household_id, days)
        responses = [_to_response(item) for item in items]
        responses.sort(key=lambda r: r.expiry_date)
        return responses
