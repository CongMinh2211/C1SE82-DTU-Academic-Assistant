"""Student FAQ reads and administrator FAQ CRUD routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from app.core.auth import Principal, require_admin
from app.core.errors import APIError
from app.schemas.faqs import (
    FaqAdminResponse,
    FaqListResponse,
    FaqPublicResponse,
    FaqWrite,
)
from app.services.faqs import (
    FaqRepository,
    create_faq,
    delete_faq,
    get_faq_repository,
    get_published_faq,
    list_published_faqs,
    update_faq,
)

router = APIRouter(prefix="/faqs", tags=["faqs"])


@router.get("", response_model=FaqListResponse)
def list_faqs(
    topic: Annotated[str | None, Query(min_length=1, max_length=80)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    repository: FaqRepository = Depends(get_faq_repository),
) -> dict[str, object]:
    normalized_topic = topic.strip() if topic else None
    if topic is not None and not normalized_topic:
        raise APIError(422, "validation_error", "Chủ đề FAQ không được để trống.")
    return list_published_faqs(
        repository,
        topic=normalized_topic,
        page=page,
        page_size=page_size,
    )


@router.get("/{faq_id}", response_model=FaqPublicResponse)
def get_faq(
    faq_id: UUID,
    repository: FaqRepository = Depends(get_faq_repository),
) -> FaqPublicResponse:
    faq = get_published_faq(repository, str(faq_id))
    return FaqPublicResponse.model_validate(faq.model_dump())


@router.post("", response_model=FaqAdminResponse, status_code=201)
def create_faq_route(
    payload: FaqWrite,
    principal: Principal = Depends(require_admin),
    repository: FaqRepository = Depends(get_faq_repository),
) -> FaqAdminResponse:
    faq = create_faq(repository, payload, principal)
    return FaqAdminResponse.model_validate(faq.model_dump())


@router.put("/{faq_id}", response_model=FaqAdminResponse)
def update_faq_route(
    faq_id: UUID,
    payload: FaqWrite,
    principal: Principal = Depends(require_admin),
    repository: FaqRepository = Depends(get_faq_repository),
) -> FaqAdminResponse:
    faq = update_faq(repository, str(faq_id), payload, principal)
    return FaqAdminResponse.model_validate(faq.model_dump())


@router.delete("/{faq_id}", status_code=204)
def delete_faq_route(
    faq_id: UUID,
    _principal: Principal = Depends(require_admin),
    repository: FaqRepository = Depends(get_faq_repository),
) -> Response:
    delete_faq(repository, str(faq_id))
    return Response(status_code=204)
