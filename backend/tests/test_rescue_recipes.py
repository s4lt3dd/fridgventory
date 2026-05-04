"""Tests for the rescue-recipes service."""

import json
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.household import Household
from app.models.item import PantryItem
from app.models.user import User
from app.services import rescue_recipe_service

_VALID_RECIPE_JSON = json.dumps(
    {
        "recipes": [
            {
                "name": "Quick Saute",
                "description": "Saute milk, spinach, and yogurt together",
                "uses_items": ["Milk", "Spinach", "Yogurt"],
                "estimated_time_minutes": 10,
                "difficulty": "easy",
            },
            {
                "name": "Smoothie",
                "description": "Blend milk and yogurt with spinach",
                "uses_items": ["Milk", "Yogurt", "Spinach"],
                "estimated_time_minutes": 5,
                "difficulty": "easy",
            },
            {
                "name": "Creamed Spinach",
                "description": "Spinach simmered with milk and yogurt",
                "uses_items": ["Spinach", "Milk", "Yogurt"],
                "estimated_time_minutes": 15,
                "difficulty": "medium",
            },
        ]
    }
)


async def _seed_three_expiring_items(
    db_session: AsyncSession, household: Household, user: User
) -> None:
    today = date.today()
    items = [
        ("Milk", "dairy"),
        ("Spinach", "produce"),
        ("Yogurt", "dairy"),
    ]
    for name, category in items:
        db_session.add(
            PantryItem(
                household_id=household.id,
                name=name,
                category=category,
                quantity=1.0,
                unit="unit",
                added_date=today,
                expiry_date=today + timedelta(days=1),
                added_by=user.id,
            )
        )
    await db_session.commit()


@pytest.mark.asyncio
async def test_suggest_rescue_recipes_uses_configured_model(
    db_session: AsyncSession,
    test_user: User,
    test_household: Household,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The service must pass settings.anthropic_model through to messages.create."""
    await _seed_three_expiring_items(db_session, test_household, test_user)

    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(settings, "anthropic_model", "claude-test-model-99")

    text_block = MagicMock()
    text_block.text = _VALID_RECIPE_JSON
    fake_msg = MagicMock()
    fake_msg.content = [text_block]

    create_mock = AsyncMock(return_value=fake_msg)

    class FakeAnthropic:
        def __init__(self, *, api_key: str) -> None:
            self.messages = MagicMock()
            self.messages.create = create_mock

    monkeypatch.setattr("anthropic.AsyncAnthropic", FakeAnthropic)

    result = await rescue_recipe_service.suggest_rescue_recipes(
        db_session, test_household.id, test_user.id
    )

    assert len(result.recipes) == 3
    create_mock.assert_called_once()
    assert create_mock.call_args.kwargs["model"] == "claude-test-model-99"


@pytest.mark.asyncio
async def test_suggest_rescue_recipes_defaults_to_settings_value(
    db_session: AsyncSession,
    test_user: User,
    test_household: Household,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A bare default settings.anthropic_model must reach the Anthropic client."""
    await _seed_three_expiring_items(db_session, test_household, test_user)

    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")

    text_block = MagicMock()
    text_block.text = _VALID_RECIPE_JSON
    fake_msg = MagicMock()
    fake_msg.content = [text_block]

    create_mock = AsyncMock(return_value=fake_msg)

    class FakeAnthropic:
        def __init__(self, *, api_key: str) -> None:
            self.messages = MagicMock()
            self.messages.create = create_mock

    monkeypatch.setattr("anthropic.AsyncAnthropic", FakeAnthropic)

    await rescue_recipe_service.suggest_rescue_recipes(
        db_session, test_household.id, test_user.id
    )

    create_mock.assert_called_once()
    assert create_mock.call_args.kwargs["model"] == settings.anthropic_model
