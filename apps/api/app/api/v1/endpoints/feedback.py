"""Authenticated feedback submission, ownership checks and admin review."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.auth import Principal, get_current_principal
from app.core.errors import APIError
from app.schemas.feedback import FeedbackCreate, FeedbackList, FeedbackRecord, FeedbackResolve
from app.services.feedback import FeedbackRepository, get_feedback_repository, get_own, resolve, submit

router = APIRouter(tags=["feedback"])


def feedback_admin(principal: Principal = Depends(get_current_principal)) -> Principal:
    if principal.role != "admin":
        raise APIError(403, "forbidden", "Chỉ quản trị viên mới có thể xử lý phản hồi.")
    return principal


@router.post("/feedback", response_model=FeedbackRecord, status_code=201)
def submit_feedback(
    payload: FeedbackCreate,
    principal: Principal = Depends(get_current_principal),
    repository: FeedbackRepository = Depends(get_feedback_repository),
) -> FeedbackRecord:
    return submit(repository, payload, principal)


@router.get("/feedback", response_model=FeedbackList)
def list_own_feedback(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    principal: Principal = Depends(get_current_principal),
    repository: FeedbackRepository = Depends(get_feedback_repository),
) -> FeedbackList:
    items, total = repository.list_for_owner(
        user_id=principal.id, offset=(page - 1) * page_size, limit=page_size
    )
    return FeedbackList(items=list(items), page=page, page_size=page_size, total=total)


@router.get("/feedback/{feedback_id}", response_model=FeedbackRecord)
def get_own_feedback(
    feedback_id: UUID,
    principal: Principal = Depends(get_current_principal),
    repository: FeedbackRepository = Depends(get_feedback_repository),
) -> FeedbackRecord:
    return get_own(repository, feedback_id, principal)


@router.get("/admin/feedback", response_model=FeedbackList)
def list_admin_feedback(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    _principal: Principal = Depends(feedback_admin),
    repository: FeedbackRepository = Depends(get_feedback_repository),
) -> FeedbackList:
    items, total = repository.list_for_admin(offset=(page - 1) * page_size, limit=page_size)
    return FeedbackList(items=list(items), page=page, page_size=page_size, total=total)


@router.patch("/admin/feedback/{feedback_id}", response_model=FeedbackRecord)
def resolve_feedback(
    feedback_id: UUID,
    payload: FeedbackResolve,
    principal: Principal = Depends(feedback_admin),
    repository: FeedbackRepository = Depends(get_feedback_repository),
) -> FeedbackRecord:
    return resolve(repository, feedback_id, payload.resolution, principal)
