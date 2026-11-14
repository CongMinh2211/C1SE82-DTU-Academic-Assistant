"""Resolve authenticated principals from the shared provider or session store."""

import hashlib
import inspect
from collections.abc import Awaitable, Callable, Mapping
from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.errors import APIError
from app.services.users import (
    SESSION_COOKIE_NAME,
    get_session_repository,
    get_user_repository,
)


class Principal(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    id: str = Field(min_length=1, max_length=100)
    role: str = Field(min_length=1, max_length=40)


PrincipalValue = Principal | Mapping[str, Any] | None
PrincipalProvider = Callable[[Request], PrincipalValue | Awaitable[PrincipalValue]]


def _session_principal(request: Request) -> Mapping[str, Any] | None:
    session_repository = get_session_repository(request)
    user_repository = get_user_repository(request)
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    user_id = session_repository.get_user_id_for_token_hash(
        token_hash=token_hash,
        now=datetime.now(UTC),
    )
    if user_id is None:
        return None
    user = user_repository.get_user_by_id(user_id)
    if user is None:
        return None
    return {"id": str(user.id), "role": user.role}


async def get_current_principal(request: Request) -> Principal:
    """Resolve identity through an installed provider or persisted login session."""
    provider: PrincipalProvider | None = getattr(
        request.app.state, "principal_provider", None
    )
    if callable(provider):
        value = provider(request)
        if inspect.isawaitable(value):
            value = await value
    else:
        value = _session_principal(request)

    if value is None:
        raise APIError(401, "unauthorized", "Vui lòng đăng nhập để tiếp tục.")
    try:
        return Principal.model_validate(value)
    except ValidationError as exc:
        raise APIError(
            401,
            "unauthorized",
            "Thông tin đăng nhập không hợp lệ.",
        ) from exc


async def require_admin(
    principal: Principal = Depends(get_current_principal),
) -> Principal:
    if principal.role != "admin":
        raise APIError(
            403,
            "forbidden",
            "Chỉ quản trị viên mới có thể quản lý FAQ.",
        )
    return principal
