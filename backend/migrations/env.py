"""Alembic migration environment configuration."""

import asyncio
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# Ensure app package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Import all models so they are registered on Base.metadata
import app.models  # noqa: F401
from app.config import settings
from app.database import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Resolve sqlalchemy.url via the app's Settings (handles DATABASE_URL or
# DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD assembly identically to runtime).
# Must run before any get_main_option/get_section call, otherwise configparser
# tries to interpolate the literal `%(DATABASE_URL)s` placeholder in alembic.ini
# and raises InterpolationMissingOptionError.
assert settings.database_url is not None  # validator guarantees this
async_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")
# configparser's BasicInterpolation reads `%` as the start of a `%(name)s`
# token, so any percent-encoded chars in the password (e.g. `%3C`) blow up
# at get_section() time. Escape `%` → `%%` so they pass through literally.
config.set_main_option("sqlalchemy.url", async_url.replace("%", "%%"))


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:  # type: ignore[no-untyped-def]
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    configuration = config.get_section(config.config_ini_section, {})
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
