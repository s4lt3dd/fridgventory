import uuid
from datetime import UTC, datetime, timedelta

import structlog
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse

logger = structlog.get_logger()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthError(Exception):
    """Raised for authentication/authorisation failures."""


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)

    # ------------------------------------------------------------------
    # Password helpers
    # ------------------------------------------------------------------

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    # ------------------------------------------------------------------
    # Token helpers
    # ------------------------------------------------------------------

    @staticmethod
    def create_access_token(user_id: uuid.UUID) -> str:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
        payload = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.now(UTC),
            "type": "access",
        }
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    @staticmethod
    def create_refresh_token() -> str:
        """Refresh token is a random UUID4 — stored in DB, not a JWT."""
        return str(uuid.uuid4())

    @staticmethod
    def decode_access_token(token: str) -> dict | None:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            if payload.get("type") != "access":
                return None
            return payload  # type: ignore[return-value]
        except JWTError:
            return None

    # ------------------------------------------------------------------
    # Auth flows
    # ------------------------------------------------------------------

    async def register(
        self,
        email: str,
        username: str,
        password: str,
    ) -> tuple[User, str, str]:
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise AuthError("Email already registered")

        existing_username = await self.user_repo.get_by_username(username)
        if existing_username:
            raise AuthError("Username already taken")

        hashed = self.hash_password(password)
        user = await self.user_repo.create(email=email, username=username, hashed_password=hashed)

        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token()

        expires_at = datetime.now(UTC) + timedelta(
            days=settings.refresh_token_expire_days
        )
        await self.user_repo.store_refresh_token(user.id, refresh_token, expires_at)

        logger.info("User registered", user_id=str(user.id), email=email)
        return user, access_token, refresh_token

    async def login(
        self,
        email: str,
        password: str,
    ) -> tuple[User, str, str]:
        user = await self.user_repo.get_by_email(email)
        if not user or not self.verify_password(password, user.hashed_password):
            raise AuthError("Invalid email or password")

        if not user.is_active:
            raise AuthError("Account is disabled")

        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token()

        expires_at = datetime.now(UTC) + timedelta(
            days=settings.refresh_token_expire_days
        )
        await self.user_repo.store_refresh_token(user.id, refresh_token, expires_at)

        logger.info("User logged in", user_id=str(user.id))
        return user, access_token, refresh_token

    async def refresh_tokens(self, refresh_token: str) -> tuple[str, str]:
        token_record = await self.user_repo.get_refresh_token(refresh_token)

        if not token_record:
            raise AuthError("Invalid refresh token")

        if token_record.revoked_at is not None:
            raise AuthError("Refresh token has been revoked")

        if token_record.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
            raise AuthError("Refresh token has expired")

        # Rotate: revoke old, issue new pair
        await self.user_repo.revoke_refresh_token(refresh_token)

        new_access_token = self.create_access_token(token_record.user_id)
        new_refresh_token = self.create_refresh_token()

        expires_at = datetime.now(UTC) + timedelta(
            days=settings.refresh_token_expire_days
        )
        await self.user_repo.store_refresh_token(
            token_record.user_id, new_refresh_token, expires_at
        )

        return new_access_token, new_refresh_token

    async def logout(self, refresh_token: str) -> None:
        await self.user_repo.revoke_refresh_token(refresh_token)
        logger.info("User logged out")

    async def get_user_from_token(self, token: str) -> User | None:
        payload = self.decode_access_token(token)
        if not payload:
            return None
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            return None
        return await self.user_repo.get_by_id(user_id)

    def build_token_response(self, access_token: str, refresh_token: str) -> TokenResponse:
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )
