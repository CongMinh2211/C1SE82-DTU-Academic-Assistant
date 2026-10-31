"""Fail-closed authorization hook for the shared authentication adapter."""

import inspect
from collections.abc import Awaitable, Callable, Mapping
from typing import Any

from fastapi import Depends, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.errors import APIError


class Principal(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    id: str = Field(min_length=1, max_length=100)
    role: str = Field(min_length=1, max_length=40)


PrincipalValue = Principal | Mapping[str, Any] | None
PrincipalProvider = Callable[[Request], PrincipalValue | Awaitable[PrincipalValue]]


async def get_current_principal(request: Request) -> Principal:
    """Resolve identity through the provider installed by the auth owner."""
    provider: PrincipalProvider | None = getattr(
        request.app.state, "principal_provider", None
    )
    if not callable(provider):
        raise APIError(
            503,
            "authorization_unavailable",
            "Xác thực chưa được cấu hình cho API này.",
        )

    value = provider(request)
    if inspect.isawaitable(value):
        value = await value
    if value is None:
        raise APIError(401, "unauthorized", "Vui lòng đăng nhập để tiếp tục.")
    try:
        return Principal.model_validate(value)
    except ValidationError as exc:
        raise APIError(
            401, "unauthorized", "Thông tin đăng nhập không hợp lệ."
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
