"""Rescue recipe service — AI-generated recipe suggestions for expiring items."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import date
from typing import Any

import structlog
from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.repositories.household_repository import HouseholdRepository
from app.repositories.item_repository import ItemRepository
from app.schemas.recipe import RescueRecipeResponse

logger = structlog.get_logger()

SYSTEM_PROMPT = (
    "You are a resourceful kitchen assistant that helps households use up food "
    "before it spoils. Given a list of pantry items about to expire, propose 3 "
    "to 5 simple rescue recipes.\n\n"
    "Return ONLY a JSON object with this exact shape (no prose, no markdown, "
    "no code fences):\n"
    '{"recipes": [\n'
    '  {"name": string, "description": string, "uses_items": [string], '
    '"estimated_time_minutes": integer, "difficulty": "easy" | "medium" | "hard"}\n'
    "]}\n\n"
    "Rules:\n"
    "- Return between 3 and 5 recipes.\n"
    "- Every string in `uses_items` MUST be an exact, case-sensitive match of an "
    "item name provided by the user. Do not invent or rename items.\n"
    "- Each recipe should use at least two of the provided items.\n"
    "- Keep descriptions under 200 characters and action-oriented.\n"
    "- `estimated_time_minutes` is a positive integer (total prep + cook time)."
)

CACHE_TTL_SECONDS = 10 * 60


def _hash_item_ids(item_ids: list[uuid.UUID]) -> str:
    joined = ",".join(sorted(str(i) for i in item_ids))
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()[:16]


def _build_user_prompt(items: list[dict[str, Any]]) -> str:
    lines = ["Items expiring soon in our household:"]
    for it in items:
        days = it["days_until_expiry"]
        when = (
            "expired"
            if days < 0
            else "today"
            if days == 0
            else "tomorrow"
            if days == 1
            else f"in {days} days"
        )
        lines.append(f"- {it['name']} ({it['quantity']} {it['unit']}) — expires {when}")
    lines.append("\nSuggest 3-5 rescue recipes as JSON per the schema in the system prompt.")
    return "\n".join(lines)


async def suggest_rescue_recipes(
    db: AsyncSession,
    household_id: uuid.UUID,
    user_id: uuid.UUID,
    redis: Any | None = None,
) -> RescueRecipeResponse:
    # 1. Membership check
    household_repo = HouseholdRepository(db)
    member = await household_repo.get_member(household_id, user_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this household",
        )

    # 2. Config check
    api_key = settings.anthropic_api_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recipe suggestions are not configured",
        )

    # 3. Fetch expiring items (within 3 days, not soft-deleted)
    item_repo = ItemRepository(db)
    items = await item_repo.get_expiring_soon(household_id, days=3)
    if len(items) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough expiring items for rescue recipes (need 3+)",
        )

    today = date.today()
    item_dicts = [
        {
            "id": it.id,
            "name": it.name,
            "quantity": it.quantity,
            "unit": it.unit,
            "days_until_expiry": (it.expiry_date - today).days,
        }
        for it in items
    ]

    # 4. Cache lookup
    cache_key = f"rescue_recipes:{household_id}:{_hash_item_ids([i['id'] for i in item_dicts])}"
    if redis is not None:
        try:
            cached = await redis.get(cache_key)
            if cached:
                try:
                    return RescueRecipeResponse.model_validate_json(cached)
                except ValidationError:
                    logger.warning("rescue_recipes.cache_invalid", key=cache_key)
        except Exception:
            logger.warning("rescue_recipes.cache_read_failed", key=cache_key)

    # 5. Call Anthropic
    user_prompt = _build_user_prompt(item_dicts)

    try:
        from anthropic import APIError, AsyncAnthropic  # type: ignore

        client = AsyncAnthropic(api_key=api_key)
        msg = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except APIError:
        logger.exception("rescue_recipes.anthropic_api_error")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Recipe service returned invalid response",
        )
    except Exception:
        logger.exception("rescue_recipes.unexpected_error")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Recipe service returned invalid response",
        )

    # 6. Parse & validate
    try:
        text_block = msg.content[0]
        raw_text = getattr(text_block, "text", None)
        if not raw_text:
            raise ValueError("Empty response text")
        # Strip any accidental markdown code fences
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            # remove optional language tag on the first line
            if "\n" in cleaned:
                cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0].strip() if cleaned.endswith("```") else cleaned
        parsed: Any = json.loads(cleaned)
        result = RescueRecipeResponse.model_validate(parsed)
    except (ValidationError, ValueError, json.JSONDecodeError):
        logger.exception("rescue_recipes.parse_failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Recipe service returned invalid response",
        )

    # 7. Cache write (best-effort)
    if redis is not None:
        try:
            await redis.set(
                cache_key,
                result.model_dump_json(),
                ex=CACHE_TTL_SECONDS,
            )
        except Exception:
            logger.warning("rescue_recipes.cache_write_failed", key=cache_key)

    return result
