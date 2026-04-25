"""Tests for household endpoints."""

import pytest
from httpx import AsyncClient

from app.models.household import Household


@pytest.mark.asyncio
async def test_create_household(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    response = await client.post(
        "/api/v1/households",
        headers=auth_headers,
        json={"name": "My Kitchen"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Kitchen"
    assert data["invite_token"]
    assert len(data["members"]) == 1
    assert data["members"][0]["role"] == "owner"


@pytest.mark.asyncio
async def test_list_households(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_household: Household,
) -> None:
    response = await client.get("/api/v1/households", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(h["id"] == str(test_household.id) for h in data)


@pytest.mark.asyncio
async def test_join_household_via_invite(
    client: AsyncClient,
    test_household: Household,
) -> None:
    # Register a second user
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "friend@example.com",
            "username": "friend",
            "password": "friendpass123",
        },
    )
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Join the household
    response = await client.post(
        "/api/v1/households/join",
        headers=headers,
        json={"invite_token": test_household.invite_token},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["members"]) == 2


@pytest.mark.asyncio
async def test_get_members(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_household: Household,
) -> None:
    response = await client.get(
        f"/api/v1/households/{test_household.id}/members",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["role"] == "owner"
