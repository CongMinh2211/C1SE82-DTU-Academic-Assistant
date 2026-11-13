"""Public account registration endpoint."""

from fastapi import APIRouter, Depends

from app.schemas.users import RegisteredUser, UserRegistration
from app.services.users import (
    UserRepository,
    get_user_repository,
    register_student,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisteredUser, status_code=201)
def register(
    payload: UserRegistration,
    repository: UserRepository = Depends(get_user_repository),
) -> RegisteredUser:
    return register_student(repository, payload)
