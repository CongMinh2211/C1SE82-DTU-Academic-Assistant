"""Registration and login request models plus public user data."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _normalize_email(value: object) -> object:
    return value.strip().casefold() if isinstance(value, str) else value


class UserRegistration(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=100)
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return _normalize_email(value)


class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return _normalize_email(value)


class RegisteredUser(BaseModel):
    """Public account data; credential hashes are intentionally excluded."""

    id: UUID
    email: EmailStr
    name: str
    role: str = Field(min_length=1, max_length=40)
    created_at: datetime


class UserCredentials(BaseModel):
    """Internal repository result. Never serialize this model to an API response."""

    user: RegisteredUser
    password_hash: str = Field(min_length=1, repr=False)
