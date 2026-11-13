"""Student registration rules and the account persistence boundary."""

from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from argon2 import PasswordHasher
from fastapi import Request

from app.core.errors import APIError
from app.schemas.users import RegisteredUser, UserRegistration


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


_PASSWORD_HASHER = PasswordHasher()


def get_user_repository(request: Request) -> UserRepository:
    repository = getattr(request.app.state, "user_repository", None)
    if repository is None:
        raise APIError(
            503,
            "user_storage_unavailable",
            "Kho tài khoản chưa được cấu hình cho API này.",
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
