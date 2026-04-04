import uuid
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field

COMMON_UNITS = [
    "pieces",
    "kg",
    "g",
    "lb",
    "oz",
    "litres",
    "ml",
    "cups",
    "tbsp",
    "tsp",
    "packs",
    "cans",
    "bottles",
    "boxes",
    "bags",
    "bunches",
    "loaves",
    "dozen",
]


class ItemCategory(str, Enum):
    produce = "produce"
    dairy = "dairy"
    meat = "meat"
    seafood = "seafood"
    bakery = "bakery"
    frozen = "frozen"
    canned = "canned"
    dry_goods = "dry_goods"
    beverages = "beverages"
    condiments = "condiments"
    snacks = "snacks"
    other = "other"


class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: ItemCategory = ItemCategory.other
    quantity: float = Field(default=1.0, gt=0)
    unit: str = Field(default="pieces", max_length=50)
    expiry_date: date
    notes: str | None = Field(None, max_length=1000)


class ItemUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    category: ItemCategory | None = None
    quantity: float | None = Field(None, gt=0)
    unit: str | None = Field(None, max_length=50)
    expiry_date: date | None = None
    notes: str | None = None


class ItemResponse(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    name: str
    category: str
    quantity: float
    unit: str
    added_date: date
    expiry_date: date
    added_by: uuid.UUID | None
    deleted_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    urgency: str  # "expired" | "today" | "this_week" | "fresh"

    model_config = {"from_attributes": True}


class ItemsGroupedResponse(BaseModel):
    expired: list[ItemResponse] = []
    today: list[ItemResponse] = []
    this_week: list[ItemResponse] = []
    fresh: list[ItemResponse] = []
