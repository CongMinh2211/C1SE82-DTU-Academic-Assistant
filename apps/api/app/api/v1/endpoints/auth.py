"""Public registration and login endpoints."""

from fastapi import APIRouter, Depends, Request, Response

from app.schemas.users import RegisteredUser, UserLogin, UserRegistration
from app.services.users import (
    SessionRepository,
    UserRepository,
    get_session_repository,
    get_user_repository,
    login_user,
    register_student,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisteredUser, status_code=201)
def register(
    payload: UserRegistration,
    repository: UserRepository = Depends(get_user_repository),
) -> RegisteredUser:
    return register_student(repository, payload)


@router.post("/login", response_model=RegisteredUser)
def login(
    payload: UserLogin,
    request: Request,
    response: Response,
    user_repository: UserRepository = Depends(get_user_repository),
    session_repository: SessionRepository = Depends(get_session_repository),
) -> RegisteredUser:
    return login_user(
        user_repository,
        session_repository,
        payload,
        request=request,
        response=response,
    )
