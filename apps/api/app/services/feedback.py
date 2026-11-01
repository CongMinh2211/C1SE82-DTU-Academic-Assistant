"""Feedback business rules and persistence boundary."""

from datetime import UTC, datetime
from typing import Protocol, Sequence
from uuid import UUID, uuid4

from fastapi import Request

from app.core.auth import Principal
from app.core.errors import APIError
from app.schemas.feedback import FeedbackCreate, FeedbackRecord, FeedbackStatus


class FeedbackMessageNotOwnedError(Exception):
    """The message is absent, is not an assistant reply, or belongs to another user."""


class FeedbackRepository(Protocol):
    def create_for_owner(self, feedback: FeedbackRecord) -> FeedbackRecord:
        """Atomically verify any message is an assistant reply owned by user_id and insert.

        Raise FeedbackMessageNotOwnedError if the message is not eligible.
        """
        ...

    def get_for_owner(self, feedback_id: UUID, user_id: str) -> FeedbackRecord | None: ...

    def list_for_owner(
        self, *, user_id: str, offset: int, limit: int
    ) -> tuple[Sequence[FeedbackRecord], int]: ...

    def list_for_admin(
        self, *, offset: int, limit: int
    ) -> tuple[Sequence[FeedbackRecord], int]: ...

    def resolve_pending(
        self, *, feedback_id: UUID, resolution: str, admin_id: str, resolved_at: datetime
    ) -> FeedbackRecord | None:
        """Atomically resolve a pending record; return None if missing or already resolved."""
        ...


def get_feedback_repository(request: Request) -> FeedbackRepository:
    repository = getattr(request.app.state, "feedback_repository", None)
    if repository is None:
        raise APIError(503, "feedback_storage_unavailable", "Kho phản hồi chưa được cấu hình.")
    return repository


def submit(repository: FeedbackRepository, payload: FeedbackCreate, principal: Principal) -> FeedbackRecord:
    record = FeedbackRecord(
        id=uuid4(), user_id=principal.id, message_id=payload.message_id,
        rating=payload.rating, category=payload.category, content=payload.content,
        status=FeedbackStatus.PENDING, created_at=datetime.now(UTC),
    )
    try:
        return repository.create_for_owner(record)
    except FeedbackMessageNotOwnedError as exc:
        raise APIError(404, "message_not_found", "Không tìm thấy câu trả lời.") from exc


def get_own(repository: FeedbackRepository, feedback_id: UUID, principal: Principal) -> FeedbackRecord:
    record = repository.get_for_owner(feedback_id, principal.id)
    if record is None:
        raise APIError(404, "feedback_not_found", "Không tìm thấy phản hồi.")
    return record


def resolve(repository: FeedbackRepository, feedback_id: UUID, resolution: str, principal: Principal) -> FeedbackRecord:
    record = repository.resolve_pending(
        feedback_id=feedback_id, resolution=resolution, admin_id=principal.id,
        resolved_at=datetime.now(UTC),
    )
    if record is None:
        raise APIError(409, "feedback_not_pending", "Phản hồi không còn chờ xử lý.")
    return record
