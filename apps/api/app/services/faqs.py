"""FAQ rules separated from the route and the database implementation."""

from datetime import UTC, datetime
from typing import Protocol, Sequence
from uuid import uuid4

from fastapi import Request

from app.core.auth import Principal
from app.core.errors import APIError
from app.schemas.faqs import FaqRecord, FaqStatus, FaqWrite


class FaqSourceNotFoundError(Exception):
    """Raised when the requested FAQ source does not exist."""


class FaqSourceNotPublishableError(Exception):
    """Raised when a source is not active and approved for publication."""


class FaqRepository(Protocol):
    """Database adapter contract; the approved schema remains owned by Tài."""

    def count_published(self, *, topic: str | None) -> int: ...

    def list_published(
        self, *, topic: str | None, offset: int, limit: int
    ) -> Sequence[FaqRecord]: ...

    def get_published(self, faq_id: str) -> FaqRecord | None: ...

    def get_any(self, faq_id: str) -> FaqRecord | None: ...

    def save(
        self, faq: FaqRecord, *, require_publishable_source: bool
    ) -> FaqRecord:
        """Validate source state and persist atomically.

        Raise FaqSourceNotFoundError for a missing source. When
        require_publishable_source is true, also raise
        FaqSourceNotPublishableError unless the source is active and approved.
        """
        ...

    def delete(self, faq_id: str) -> bool: ...


def get_faq_repository(request: Request) -> FaqRepository:
    repository = getattr(request.app.state, "faq_repository", None)
    if repository is None:
        raise APIError(
            503,
            "faq_storage_unavailable",
            "Kho FAQ chưa được cấu hình cho API này.",
        )
    return repository


def _save_faq(repository: FaqRepository, faq: FaqRecord) -> FaqRecord:
    if faq.status is FaqStatus.PUBLISHED and faq.source_id is None:
        raise APIError(
            422,
            "faq_source_required",
            "FAQ đã xuất bản phải có nguồn đang hoạt động.",
        )
    try:
        return repository.save(
            faq,
            require_publishable_source=faq.status is FaqStatus.PUBLISHED,
        )
    except FaqSourceNotFoundError as exc:
        raise APIError(
            422,
            "faq_source_not_found",
            "Nguồn của FAQ không tồn tại.",
        ) from exc
    except FaqSourceNotPublishableError as exc:
        raise APIError(
            409,
            "faq_source_not_publishable",
            "Nguồn phải đang hoạt động và được duyệt trước khi xuất bản FAQ.",
        ) from exc


def list_published_faqs(
    repository: FaqRepository,
    *,
    topic: str | None,
    page: int,
    page_size: int,
) -> dict[str, object]:
    offset = (page - 1) * page_size
    items = repository.list_published(topic=topic, offset=offset, limit=page_size)
    total = repository.count_published(topic=topic)
    return {
        "items": [item.model_dump() for item in items],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


def get_published_faq(repository: FaqRepository, faq_id: str) -> FaqRecord:
    faq = repository.get_published(faq_id)
    if faq is None:
        raise APIError(404, "faq_not_found", "Không tìm thấy FAQ đã xuất bản.")
    return faq


def create_faq(
    repository: FaqRepository,
    payload: FaqWrite,
    principal: Principal,
) -> FaqRecord:
    now = datetime.now(UTC)
    return _save_faq(
        repository,
        FaqRecord(
            id=str(uuid4()),
            question=payload.question,
            answer=payload.answer,
            topic=payload.topic,
            source_id=payload.source_id,
            status=payload.status,
            created_at=now,
            updated_at=now,
            updated_by=principal.id,
        ),
    )


def update_faq(
    repository: FaqRepository,
    faq_id: str,
    payload: FaqWrite,
    principal: Principal,
) -> FaqRecord:
    current = repository.get_any(faq_id)
    if current is None:
        raise APIError(404, "faq_not_found", "Không tìm thấy FAQ cần cập nhật.")

    updated = FaqRecord(
        id=current.id,
        question=payload.question,
        answer=payload.answer,
        topic=payload.topic,
        source_id=payload.source_id,
        status=payload.status,
        created_at=current.created_at,
        updated_at=datetime.now(UTC),
        updated_by=principal.id,
    )
    return _save_faq(repository, updated)


def delete_faq(repository: FaqRepository, faq_id: str) -> None:
    if not repository.delete(faq_id):
        raise APIError(404, "faq_not_found", "Không tìm thấy FAQ cần xóa.")
