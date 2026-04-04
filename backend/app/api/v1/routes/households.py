"""Household routes."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.household import (
    HouseholdCreate,
    HouseholdMemberResponse,
    HouseholdResponse,
    InviteResponse,
    JoinHouseholdRequest,
)
from app.services.household_service import HouseholdError, HouseholdService

router = APIRouter(prefix="/households", tags=["households"])


@router.post("", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
async def create_household(
    body: HouseholdCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HouseholdResponse:
    service = HouseholdService(db)
    return await service.create_household(current_user.id, body.name)


@router.get("", response_model=list[HouseholdResponse])
async def list_households(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[HouseholdResponse]:
    service = HouseholdService(db)
    return await service.get_user_households(current_user.id)


@router.get("/{household_id}", response_model=HouseholdResponse)
async def get_household(
    household_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HouseholdResponse:
    service = HouseholdService(db)
    try:
        return await service.get_household(household_id, current_user.id)
    except HouseholdError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{household_id}/invite", response_model=InviteResponse)
async def get_invite_link(
    household_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InviteResponse:
    service = HouseholdService(db)
    try:
        base_url = str(request.base_url).rstrip("/")
        invite_link = await service.get_invite_link(household_id, current_user.id, base_url)
        household = await service.get_household(household_id, current_user.id)
        return InviteResponse(invite_link=invite_link, invite_token=household.invite_token)
    except HouseholdError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{household_id}/invite/regenerate", response_model=InviteResponse)
async def regenerate_invite(
    household_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InviteResponse:
    service = HouseholdService(db)
    try:
        new_token = await service.regenerate_invite(household_id, current_user.id)
        base_url = str(request.base_url).rstrip("/")
        invite_link = f"{base_url}/join?token={new_token}"
        return InviteResponse(invite_link=invite_link, invite_token=new_token)
    except HouseholdError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/join", response_model=HouseholdResponse)
async def join_household(
    body: JoinHouseholdRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HouseholdResponse:
    service = HouseholdService(db)
    try:
        return await service.join_household(current_user.id, body.invite_token)
    except HouseholdError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{household_id}/members", response_model=list[HouseholdMemberResponse])
async def get_members(
    household_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[HouseholdMemberResponse]:
    service = HouseholdService(db)
    try:
        return await service.get_members(household_id, current_user.id)
    except HouseholdError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
