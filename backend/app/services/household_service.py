import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.household import Household, HouseholdMember
from app.repositories.household_repository import HouseholdRepository
from app.schemas.household import HouseholdMemberResponse, HouseholdResponse

logger = structlog.get_logger()


class HouseholdError(Exception):
    """Raised for household-related errors."""


def _member_to_response(member: HouseholdMember) -> HouseholdMemberResponse:
    username = None
    email = None
    if member.user:
        username = member.user.username
        email = member.user.email
    return HouseholdMemberResponse(
        id=member.id,
        user_id=member.user_id,
        household_id=member.household_id,
        role=member.role,
        joined_at=member.joined_at,
        username=username,
        email=email,
    )


def _household_to_response(household: Household) -> HouseholdResponse:
    members = [_member_to_response(m) for m in household.members]
    return HouseholdResponse(
        id=household.id,
        name=household.name,
        invite_token=household.invite_token,
        created_at=household.created_at,
        updated_at=household.updated_at,
        members=members,
    )


class HouseholdService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.household_repo = HouseholdRepository(db)

    async def create_household(
        self, user_id: uuid.UUID, name: str
    ) -> HouseholdResponse:
        household = await self.household_repo.create(name=name, owner_id=user_id)
        logger.info(
            "Household created",
            household_id=str(household.id),
            owner_id=str(user_id),
        )
        return _household_to_response(household)

    async def get_household(
        self, household_id: uuid.UUID, user_id: uuid.UUID
    ) -> HouseholdResponse:
        household = await self.household_repo.get_by_id(household_id)
        if not household:
            raise HouseholdError("Household not found")

        member = await self.household_repo.get_member(household_id, user_id)
        if not member:
            raise HouseholdError("You are not a member of this household")

        return _household_to_response(household)

    async def get_user_households(self, user_id: uuid.UUID) -> list[HouseholdResponse]:
        households = await self.household_repo.get_user_households(user_id)
        return [_household_to_response(h) for h in households]

    async def join_household(
        self, user_id: uuid.UUID, invite_token: str
    ) -> HouseholdResponse:
        household = await self.household_repo.get_by_invite_token(invite_token)
        if not household:
            raise HouseholdError("Invalid invite token")

        # Check if already a member
        existing = await self.household_repo.get_member(household.id, user_id)
        if existing:
            raise HouseholdError("You are already a member of this household")

        await self.household_repo.add_member(household.id, user_id, role="member")
        logger.info(
            "User joined household",
            user_id=str(user_id),
            household_id=str(household.id),
        )

        # Expire identity-map cache so the reload below sees the new member.
        # Without this, get_by_id returns the cached Household from
        # get_by_invite_token above (members already loaded, stale).
        self.db.expire_all()

        # Reload with updated members
        updated = await self.household_repo.get_by_id(household.id)
        return _household_to_response(updated)  # type: ignore[arg-type]

    async def get_invite_link(
        self,
        household_id: uuid.UUID,
        user_id: uuid.UUID,
        base_url: str,
    ) -> str:
        member = await self.household_repo.get_member(household_id, user_id)
        if not member:
            raise HouseholdError("You are not a member of this household")

        household = await self.household_repo.get_by_id(household_id)
        if not household:
            raise HouseholdError("Household not found")

        return f"{base_url.rstrip('/')}/join?token={household.invite_token}"

    async def regenerate_invite(
        self, household_id: uuid.UUID, user_id: uuid.UUID
    ) -> str:
        member = await self.household_repo.get_member(household_id, user_id)
        if not member:
            raise HouseholdError("You are not a member of this household")

        if member.role != "owner":
            raise HouseholdError("Only the household owner can regenerate the invite link")

        new_token = await self.household_repo.regenerate_invite_token(household_id)
        logger.info(
            "Invite token regenerated",
            household_id=str(household_id),
            user_id=str(user_id),
        )
        return new_token

    async def get_members(
        self, household_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[HouseholdMemberResponse]:
        member = await self.household_repo.get_member(household_id, user_id)
        if not member:
            raise HouseholdError("You are not a member of this household")

        members = await self.household_repo.get_members(household_id)
        return [_member_to_response(m) for m in members]
