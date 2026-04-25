"""pytest fixtures for FridgeCheck backend tests."""

import asyncio
import os
from collections.abc import AsyncGenerator
from datetime import date, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Set test env vars before importing app
os.environ.setdefault(
    "DATABASE_URL", "postgresql://fridgecheck:fridgecheck_test@localhost:5432/fridgecheck_test"
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_testing_only")
os.environ.setdefault("ENVIRONMENT", "testing")

from app.database import Base, get_db
from app.main import app
from app.models import Household, HouseholdMember, PantryItem, User
from app.services.auth_service import AuthService

TEST_DATABASE_URL = (
    os.environ["DATABASE_URL"]
    .replace("postgresql://", "postgresql+asyncpg://")
    .replace("postgres://", "postgresql+asyncpg://")
)

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    hashed = AuthService.hash_password("testpassword123")
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=hashed,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict[str, str]:
    token = AuthService.create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def test_household(db_session: AsyncSession, test_user: User) -> Household:
    import secrets

    household = Household(name="Test Household", invite_token=secrets.token_urlsafe(32))
    db_session.add(household)
    await db_session.flush()

    member = HouseholdMember(household_id=household.id, user_id=test_user.id, role="owner")
    db_session.add(member)
    await db_session.commit()
    await db_session.refresh(household)
    return household


@pytest_asyncio.fixture
async def test_item(
    db_session: AsyncSession, test_household: Household, test_user: User
) -> PantryItem:
    item = PantryItem(
        household_id=test_household.id,
        name="Test Milk",
        category="dairy",
        quantity=1.0,
        unit="litres",
        added_date=date.today(),
        expiry_date=date.today() + timedelta(days=5),
        added_by=test_user.id,
    )
    db_session.add(item)
    await db_session.commit()
    await db_session.refresh(item)
    return item
