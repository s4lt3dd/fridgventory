"""Tests for pantry item endpoints."""

from datetime import date, timedelta

import pytest
from httpx import AsyncClient

from app.models.household import Household
from app.models.item import PantryItem


@pytest.mark.asyncio
async def test_add_item(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_household: Household,
) -> None:
    response = await client.post(
        f"/api/v1/households/{test_household.id}/items",
        headers=auth_headers,
        json={
            "name": "Bananas",
            "category": "produce",
            "quantity": 6,
            "unit": "pieces",
            "expiry_date": str(date.today() + timedelta(days=3)),
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Bananas"
    assert data["category"] == "produce"
    assert data["urgency"] == "this_week"


@pytest.mark.asyncio
async def test_list_items_grouped(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_household: Household,
    test_item: PantryItem,
) -> None:
    response = await client.get(
        f"/api/v1/households/{test_household.id}/items",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "expired" in data
    assert "today" in data
    assert "this_week" in data
    assert "fresh" in data
    total = len(data["expired"]) + len(data["today"]) + len(data["this_week"]) + len(data["fresh"])
    assert total >= 1


@pytest.mark.asyncio
async def test_update_item(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_household: Household,
    test_item: PantryItem,
) -> None:
    response = await client.patch(
        f"/api/v1/households/{test_household.id}/items/{test_item.id}",
        headers=auth_headers,
        json={"quantity": 3.0, "notes": "Updated quantity"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["quantity"] == 3.0
    assert data["notes"] == "Updated quantity"


@pytest.mark.asyncio
async def test_delete_item(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_household: Household,
    test_item: PantryItem,
) -> None:
    response = await client.delete(
        f"/api/v1/households/{test_household.id}/items/{test_item.id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Verify soft-deleted (should not appear in list)
    list_resp = await client.get(
        f"/api/v1/households/{test_household.id}/items",
        headers=auth_headers,
    )
    data = list_resp.json()
    all_ids = [
        item["id"]
        for group in ["expired", "today", "this_week", "fresh"]
        for item in data[group]
    ]
    assert str(test_item.id) not in all_ids


@pytest.mark.asyncio
async def test_idempotent_add_increments_quantity(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_household: Household,
    test_item: PantryItem,
) -> None:
    # Add same item name again
    response = await client.post(
        f"/api/v1/households/{test_household.id}/items",
        headers=auth_headers,
        json={
            "name": "Test Milk",  # Same name as test_item
            "category": "dairy",
            "quantity": 2,
            "unit": "litres",
            "expiry_date": str(date.today() + timedelta(days=5)),
        },
    )
    assert response.status_code == 201
    data = response.json()
    # Original was 1.0 + new 2 = 3.0
    assert data["quantity"] == 3.0
