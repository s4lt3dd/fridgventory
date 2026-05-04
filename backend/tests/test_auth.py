"""Tests for authentication endpoints."""

import bcrypt
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@example.com",
            "username": "newuser",
            "password": "securepass123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user: User) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": test_user.email,
            "username": "another",
            "password": "securepass123",
        },
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "testpassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user: User) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "somepassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient, test_user: User) -> None:
    # Login first
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "testpassword123"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    # Refresh
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["refresh_token"] != refresh_token  # Token rotated


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403  # No credentials


@pytest.mark.asyncio
async def test_protected_endpoint_with_token(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_legacy_bcrypt_hash_still_verifies(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Users created under the previous passlib[bcrypt] regime have $2b$ hashes
    in the database. After the swap to pwdlib (argon2id-default), those legacy
    hashes must still authenticate via the BcryptHasher fallback."""
    plaintext = "legacy-password-123"
    legacy_hash = bcrypt.hashpw(plaintext.encode(), bcrypt.gensalt()).decode()
    assert legacy_hash.startswith("$2b$"), "expected a real bcrypt $2b$ hash"

    user = User(
        email="legacy@example.com",
        username="legacyuser",
        hashed_password=legacy_hash,
    )
    db_session.add(user)
    await db_session.commit()

    # Direct service-level check.
    assert AuthService.verify_password(plaintext, legacy_hash) is True
    assert AuthService.verify_password("wrong", legacy_hash) is False

    # End-to-end check via the login route — proves legacy users can still log in.
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "legacy@example.com", "password": plaintext},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


def test_new_hashes_use_argon2id() -> None:
    """New password hashes minted by AuthService should be argon2id, not bcrypt."""
    new_hash = AuthService.hash_password("any-password")
    assert new_hash.startswith("$argon2id$"), f"expected argon2id, got: {new_hash[:20]}"
    assert AuthService.verify_password("any-password", new_hash) is True
