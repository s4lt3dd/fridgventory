from typing import Self
from urllib.parse import quote

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "FridgeCheck API"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"

    # Database
    # Two ways to configure:
    #   1. Local dev / Compose: set DATABASE_URL directly (a full postgresql:// URL).
    #   2. AWS / RDS-managed master password: set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.
    #      The model validator below assembles DATABASE_URL from the components.
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    db_host: str | None = Field(default=None, alias="DB_HOST")
    db_port: int | None = Field(default=None, alias="DB_PORT")
    db_name: str | None = Field(default=None, alias="DB_NAME")
    db_user: str | None = Field(default=None, alias="DB_USER")
    db_password: str | None = Field(default=None, alias="DB_PASSWORD")

    # Redis
    redis_url: str = Field(..., alias="REDIS_URL")

    # JWT
    secret_key: str = Field(..., alias="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60

    # Expiry notifications (days before expiry)
    notification_thresholds: list[int] = [1, 3]

    # Recipe API
    recipe_api_url: str = "https://www.themealdb.com/api/json/v1/1"

    # Anthropic (rescue recipes)
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-sonnet-4-20250514", alias="ANTHROPIC_MODEL")

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    @model_validator(mode="after")
    def assemble_database_url(self) -> Self:
        if self.database_url:
            return self
        if (
            self.db_host is not None
            and self.db_port is not None
            and self.db_name is not None
            and self.db_user is not None
            and self.db_password is not None
        ):
            self.database_url = (
                f"postgresql://{quote(self.db_user, safe='')}:{quote(self.db_password, safe='')}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}"
            )
            return self
        raise ValueError(
            "Database not configured: set DATABASE_URL, "
            "or all of DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD"
        )


# pydantic-settings populates required fields from env vars at runtime; mypy can't see that.
settings = Settings()  # type: ignore[call-arg]
