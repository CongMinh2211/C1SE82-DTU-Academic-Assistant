"""Validated FAQ request and response models."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class FaqStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class FaqWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    question: str = Field(min_length=5, max_length=300)
    answer: str = Field(min_length=5, max_length=5000)
    topic: str = Field(min_length=1, max_length=80)
    source_id: str | None = Field(default=None, min_length=1, max_length=100)
    status: FaqStatus = FaqStatus.DRAFT


class FaqRecord(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    question: str
    answer: str
    topic: str
    source_id: str | None = None
    status: FaqStatus
    created_at: datetime
    updated_at: datetime
    updated_by: str | None = None


class FaqPublicResponse(BaseModel):
    id: str
    question: str
    answer: str
    topic: str
    source_id: str | None = None
    created_at: datetime
    updated_at: datetime


class FaqAdminResponse(FaqPublicResponse):
    status: FaqStatus
    updated_by: str | None = None


class FaqListResponse(BaseModel):
    items: list[FaqPublicResponse]
    page: int
    page_size: int
    total: int
