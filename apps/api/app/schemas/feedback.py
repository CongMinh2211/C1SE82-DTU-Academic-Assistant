"""Feedback request and response models."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FeedbackStatus(str, Enum):
    PENDING = "pending"
    RESOLVED = "resolved"


class FeedbackCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    message_id: UUID | None = None
    rating: int = Field(strict=True, ge=1, le=5)
    category: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=5, max_length=3000)


class FeedbackResolve(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    resolution: str = Field(min_length=5, max_length=2000)


class FeedbackRecord(BaseModel):
    id: UUID
    user_id: str
    message_id: UUID | None = None
    rating: int
    category: str
    content: str
    status: FeedbackStatus
    created_at: datetime
    resolution: str | None = None
    resolved_by: str | None = None
    resolved_at: datetime | None = None


class FeedbackList(BaseModel):
    items: list[FeedbackRecord]
    page: int
    page_size: int
    total: int
