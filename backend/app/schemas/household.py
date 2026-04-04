import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class HouseholdCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class HouseholdMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    household_id: uuid.UUID
    role: str
    joined_at: datetime
    username: str | None = None
    email: str | None = None

    model_config = {"from_attributes": True}


class HouseholdResponse(BaseModel):
    id: uuid.UUID
    name: str
    invite_token: str
    created_at: datetime
    updated_at: datetime
    members: list[HouseholdMemberResponse] = []

    model_config = {"from_attributes": True}


class InviteResponse(BaseModel):
    invite_link: str
    invite_token: str


class JoinHouseholdRequest(BaseModel):
    invite_token: str
