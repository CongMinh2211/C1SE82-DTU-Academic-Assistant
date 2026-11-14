"""SQLAlchemy account and session storage for SQLite or PostgreSQL."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime
import os
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    create_engine,
    event,
    insert,
    select,
    update,
)
from sqlalchemy.engine import Engine, URL, make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool

from app.schemas.users import RegisteredUser, UserCredentials
from app.services.users import (
    SessionRepository,
    UserEmailAlreadyExistsError,
    UserRepository,
)


metadata = MetaData()

users = Table(
    "auth_users",
    metadata,
    Column("id", String(36), primary_key=True),
    Column("email", String(254), nullable=False),
    Column("name", String(100), nullable=False),
    Column("role", String(40), nullable=False),
    Column("password_hash", Text, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("is_active", Boolean, nullable=False, default=True),
    UniqueConstraint("email", name="uq_auth_users_email"),
)

sessions = Table(
    "auth_sessions",
    metadata,
    Column("token_hash", String(64), primary_key=True),
    Column(
        "user_id",
        String(36),
        ForeignKey("auth_users.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("revoked_at", DateTime(timezone=True), nullable=True),
)
Index("ix_auth_sessions_user_expiry", sessions.c.user_id, sessions.c.expires_at)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _public_user(row: Mapping[str, Any]) -> RegisteredUser:
    return RegisteredUser(
        id=UUID(row["id"]),
        email=row["email"],
        name=row["name"],
        role=row["role"],
        created_at=_as_utc(row["created_at"]),
    )


class SQLAuthRepository(UserRepository, SessionRepository):
    """Implements the user and session protocols using one SQLAlchemy engine."""

    def __init__(self, engine: Engine) -> None:
        self.engine = engine

        if engine.dialect.name == "sqlite":
            @event.listens_for(engine, "connect")
            def _enable_foreign_keys(connection, _record) -> None:
                cursor = connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()

    @classmethod
    def from_environment(cls) -> SQLAuthRepository:
        configured_url = os.getenv("AUTH_DATABASE_URL")
        if configured_url:
            url = make_url(configured_url)
        else:
            api_root = Path(__file__).resolve().parents[2]
            database_path = api_root / "data" / "auth.sqlite3"
            database_path.parent.mkdir(parents=True, exist_ok=True)
            url = URL.create("sqlite", database=str(database_path))

        if url.get_backend_name() == "postgresql":
            url = url.set(drivername="postgresql+psycopg")
        elif url.get_backend_name() == "sqlite":
            database = url.database
            if (
                database
                and database != ":memory:"
                and not database.startswith("file:")
            ):
                Path(database).expanduser().resolve().parent.mkdir(
                    parents=True, exist_ok=True
                )
        else:
            raise ValueError(
                "AUTH_DATABASE_URL must use SQLite or PostgreSQL."
            )

        engine_options = {"pool_pre_ping": True}
        if (
            url.get_backend_name() == "sqlite"
            and url.database in {None, "", ":memory:"}
        ):
            engine_options.update(
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        return cls(create_engine(url, **engine_options))

    def initialize(self) -> None:
        metadata.create_all(self.engine)

    def close(self) -> None:
        self.engine.dispose()

    def create_user(
        self, *, user: RegisteredUser, password_hash: str
    ) -> RegisteredUser:
        email = str(user.email).casefold()
        values = {
            "id": str(user.id),
            "email": email,
            "name": user.name,
            "role": user.role,
            "password_hash": password_hash,
            "created_at": _as_utc(user.created_at),
            "is_active": True,
        }
        try:
            with self.engine.begin() as connection:
                connection.execute(insert(users).values(**values))
        except IntegrityError as exc:
            with self.engine.connect() as connection:
                existing_email = connection.execute(
                    select(users.c.id).where(users.c.email == email)
                ).first()
            if existing_email is not None:
                raise UserEmailAlreadyExistsError() from exc
            raise
        return user.model_copy(update={"email": email})

    def get_credentials_by_email(self, email: str) -> UserCredentials | None:
        with self.engine.connect() as connection:
            row = connection.execute(
                select(users).where(
                    users.c.email == email.casefold(),
                    users.c.is_active.is_(True),
                )
            ).mappings().first()
        if row is None:
            return None
        return UserCredentials(
            user=_public_user(row),
            password_hash=row["password_hash"],
        )

    def get_user_by_id(self, user_id: UUID) -> RegisteredUser | None:
        with self.engine.connect() as connection:
            row = connection.execute(
                select(users).where(
                    users.c.id == str(user_id),
                    users.c.is_active.is_(True),
                )
            ).mappings().first()
        return _public_user(row) if row is not None else None

    def create_session(
        self,
        *,
        token_hash: str,
        user_id: UUID,
        created_at: datetime,
        expires_at: datetime,
    ) -> None:
        with self.engine.begin() as connection:
            connection.execute(
                insert(sessions).values(
                    token_hash=token_hash,
                    user_id=str(user_id),
                    created_at=_as_utc(created_at),
                    expires_at=_as_utc(expires_at),
                    revoked_at=None,
                )
            )

    def get_user_id_for_token_hash(
        self, *, token_hash: str, now: datetime
    ) -> UUID | None:
        with self.engine.connect() as connection:
            row = connection.execute(
                select(sessions.c.user_id, sessions.c.expires_at).where(
                    sessions.c.token_hash == token_hash,
                    sessions.c.revoked_at.is_(None),
                )
            ).mappings().first()
        if row is None or _as_utc(row["expires_at"]) <= _as_utc(now):
            return None
        return UUID(row["user_id"])

    def revoke_session(self, *, token_hash: str, revoked_at: datetime) -> None:
        with self.engine.begin() as connection:
            connection.execute(
                update(sessions)
                .where(
                    sessions.c.token_hash == token_hash,
                    sessions.c.revoked_at.is_(None),
                )
                .values(revoked_at=_as_utc(revoked_at))
            )
