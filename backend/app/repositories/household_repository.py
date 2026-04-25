import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.household import Household, HouseholdMember


def _generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


class HouseholdRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, household_id: uuid.UUID) -> Household | None:
        result = await self.db.execute(
            select(Household)
            .where(Household.id == household_id)
            .options(selectinload(Household.members).selectinload(HouseholdMember.user))
        )
        return result.scalar_one_or_none()

    async def get_by_invite_token(self, token: str) -> Household | None:
        result = await self.db.execute(
            select(Household)
            .where(Household.invite_token == token)
            .options(selectinload(Household.members).selectinload(HouseholdMember.user))
        )
        return result.scalar_one_or_none()

    async def get_user_households(self, user_id: uuid.UUID) -> list[Household]:
        result = await self.db.execute(
            select(Household)
            .join(HouseholdMember, Household.id == HouseholdMember.household_id)
            .where(HouseholdMember.user_id == user_id)
            .options(selectinload(Household.members).selectinload(HouseholdMember.user))
            .order_by(Household.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, name: str, owner_id: uuid.UUID) -> Household:
        household = Household(
            name=name,
            invite_token=_generate_invite_token(),
        )
        self.db.add(household)
        await self.db.flush()  # Get the household ID before creating membership

        owner_membership = HouseholdMember(
            household_id=household.id,
            user_id=owner_id,
            role="owner",
        )
        self.db.add(owner_membership)
        await self.db.commit()
        await self.db.refresh(household)

        # Reload with relationships
        return await self.get_by_id(household.id)  # type: ignore[return-value]

    async def add_member(
        self,
        household_id: uuid.UUID,
        user_id: uuid.UUID,
        role: str = "member",
    ) -> HouseholdMember:
        member = HouseholdMember(
            household_id=household_id,
            user_id=user_id,
            role=role,
        )
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        return member

    async def get_member(
        self, household_id: uuid.UUID, user_id: uuid.UUID
    ) -> HouseholdMember | None:
        result = await self.db.execute(
            select(HouseholdMember).where(
                HouseholdMember.household_id == household_id,
                HouseholdMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_members(self, household_id: uuid.UUID) -> list[HouseholdMember]:
        result = await self.db.execute(
            select(HouseholdMember)
            .where(HouseholdMember.household_id == household_id)
            .options(selectinload(HouseholdMember.user))
            .order_by(HouseholdMember.joined_at.asc())
        )
        return list(result.scalars().all())

    async def regenerate_invite_token(self, household_id: uuid.UUID) -> str:
        household = await self.get_by_id(household_id)
        if not household:
            raise ValueError(f"Household {household_id} not found")
        new_token = _generate_invite_token()
        household.invite_token = new_token
        await self.db.commit()
        return new_token
