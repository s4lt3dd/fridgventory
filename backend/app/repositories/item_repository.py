import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import PantryItem


class ItemRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, item_id: uuid.UUID) -> PantryItem | None:
        result = await self.db.execute(
            select(PantryItem).where(
                PantryItem.id == item_id,
                PantryItem.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_household(
        self,
        household_id: uuid.UUID,
        include_deleted: bool = False,
    ) -> list[PantryItem]:
        query = select(PantryItem).where(PantryItem.household_id == household_id)
        if not include_deleted:
            query = query.where(PantryItem.deleted_at.is_(None))
        query = query.order_by(PantryItem.expiry_date.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_expiring_soon(
        self,
        household_id: uuid.UUID,
        days: int,
    ) -> list[PantryItem]:
        today = date.today()
        threshold = today + timedelta(days=days)
        result = await self.db.execute(
            select(PantryItem)
            .where(
                and_(
                    PantryItem.household_id == household_id,
                    PantryItem.expiry_date <= threshold,
                    PantryItem.deleted_at.is_(None),
                )
            )
            .order_by(PantryItem.expiry_date.asc())
        )
        return list(result.scalars().all())

    async def get_all_expiring(self, threshold_days: int) -> list[PantryItem]:
        """For background worker: fetch all items expiring within threshold_days."""
        today = date.today()
        threshold = today + timedelta(days=threshold_days)
        result = await self.db.execute(
            select(PantryItem)
            .where(
                and_(
                    PantryItem.expiry_date <= threshold,
                    PantryItem.deleted_at.is_(None),
                )
            )
            .order_by(PantryItem.expiry_date.asc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        household_id: uuid.UUID,
        name: str,
        category: str,
        quantity: float,
        unit: str,
        added_date: date,
        expiry_date: date,
        added_by: uuid.UUID | None,
        notes: str | None = None,
    ) -> PantryItem:
        item = PantryItem(
            household_id=household_id,
            name=name,
            category=category,
            quantity=quantity,
            unit=unit,
            added_date=added_date,
            expiry_date=expiry_date,
            added_by=added_by,
            notes=notes,
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def update(self, item_id: uuid.UUID, data: dict) -> PantryItem | None:
        item = await self.get_by_id(item_id)
        if not item:
            return None
        for key, value in data.items():
            setattr(item, key, value)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def soft_delete(self, item_id: uuid.UUID) -> bool:
        item = await self.get_by_id(item_id)
        if not item:
            return False
        item.deleted_at = datetime.now(UTC)
        await self.db.commit()
        return True

    async def cleanup_old_deleted(self, days: int = 7) -> int:
        """Permanently delete items soft-deleted more than `days` ago. Returns count."""
        cutoff = datetime.now(UTC) - timedelta(days=days)
        result = await self.db.execute(
            select(PantryItem).where(
                and_(
                    PantryItem.deleted_at.isnot(None),
                    PantryItem.deleted_at <= cutoff,
                )
            )
        )
        items = list(result.scalars().all())
        count = len(items)
        for item in items:
            await self.db.delete(item)
        await self.db.commit()
        return count

    async def find_duplicate(self, household_id: uuid.UUID, name: str) -> PantryItem | None:
        """Find existing active item by household and name (case-insensitive)."""
        result = await self.db.execute(
            select(PantryItem).where(
                and_(
                    PantryItem.household_id == household_id,
                    func.lower(PantryItem.name) == name.lower(),
                    PantryItem.deleted_at.is_(None),
                )
            )
        )
        return result.scalar_one_or_none()
