"""Account rules, Argon2id credential checks and session persistence boundary."""

import hashlib
import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Protocol
from uuid import UUID, uuid4

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Request, Response

from app.core.errors import APIError
from app.schemas.users import RegisteredUser, UserCredentials, UserLogin, UserRegistration


SESSION_COOKIE_NAME = "dtu_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7


class UserEmailAlreadyExistsError(Exception):
    """Raised when the normalized email is already registered."""


class UserRepository(Protocol):
    def create_user(
        self, *, user: RegisteredUser, password_hash: str
    ) -> RegisteredUser:
        """Atomically insert a user and hash, enforcing unique normalized email.

        Persist only the encoded Argon2id hash, never the submitted password.
        Raise UserEmailAlreadyExistsError when another registration already owns
        the normalized email.
        """
        ...

    def get_credentials_by_email(self, email: str) -> UserCredentials | None:
        """Return credentials for the normalized email, or None when absent."""
        ...

    def get_user_by_id(self, user_id: UUID) -> RegisteredUser | None:
        """Return an active public account, or None if absent or disabled."""
        ...


class SessionRepository(Protocol):
    def create_session(
        self,
        *,
        token_hash: str,
        user_id: UUID,
        created_at: datetime,
        expires_at: datetime,
    ) -> None:
        """Persist a session using only the one-way hash of its opaque token."""
        ...

    def get_user_id_for_token_hash(
        self, *, token_hash: str, now: datetime
    ) -> UUID | None:
        """Return the owner only for an unexpired, non-revoked session."""
        ...


_PASSWORD_HASHER = PasswordHasher()
_DUMMY_PASSWORD_HASH = _PASSWORD_HASHER.hash(secrets.token_urlsafe(32))


def get_user_repository(request: Request) -> UserRepository:
    repository = getattr(request.app.state, "user_repository", None)
    if repository is None:
        raise APIError(
            503,
            "user_storage_unavailable",
            "Kho tài khoản chưa được cấu hình cho API này.",
        )
    return repository


def get_session_repository(request: Request) -> SessionRepository:
    repository = getattr(request.app.state, "session_repository", None)
    if repository is None:
        raise APIError(
            503,
            "session_storage_unavailable",
            "Kho phiên đăng nhập chưa được cấu hình cho API này.",
        )
    return repository


def register_student(
    repository: UserRepository, payload: UserRegistration
) -> RegisteredUser:
    user = RegisteredUser(
        id=uuid4(),
        email=str(payload.email).casefold(),
        name=payload.name,
        role="student",
        created_at=datetime.now(UTC),
    )
    password_hash = _PASSWORD_HASHER.hash(payload.password)
    try:
        return repository.create_user(user=user, password_hash=password_hash)
    except UserEmailAlreadyExistsError as exc:
        raise APIError(
            409,
            "email_already_registered",
            "Email này đã được đăng ký.",
        ) from exc


def login_user(
    user_repository: UserRepository,
    session_repository: SessionRepository,
    payload: UserLogin,
    *,
    request: Request,
    response: Response,
) -> RegisteredUser:
    email = str(payload.email).casefold()
    credentials = user_repository.get_credentials_by_email(email)
    encoded_hash = credentials.password_hash if credentials else _DUMMY_PASSWORD_HASH
    try:
        password_matches = _PASSWORD_HASHER.verify(encoded_hash, payload.password)
    except VerificationError:
        password_matches = False

    if credentials is None or not password_matches:
        raise APIError(
            401,
            "invalid_credentials",
            "Email hoặc mật khẩu chưa đúng.",
        )

    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=SESSION_MAX_AGE_SECONDS)
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    session_repository.create_session(
        token_hash=token_hash,
        user_id=credentials.user.id,
        created_at=now,
        expires_at=expires_at,
    )

    secure_setting = os.getenv("SESSION_COOKIE_SECURE")
    secure_cookie = (
        secure_setting.lower() in {"1", "true", "yes"}
        if secure_setting is not None
        else request.url.scheme == "https"
    )
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE_SECONDS,
        expires=SESSION_MAX_AGE_SECONDS,
        path="/api/v1",
        secure=secure_cookie,
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"
    return credentials.user
