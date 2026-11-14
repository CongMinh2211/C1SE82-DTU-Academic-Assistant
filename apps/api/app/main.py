from contextlib import asynccontextmanager
import os
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

from app.api.v1.router import api_router
from app.core.errors import install_error_handlers
from app.services.auth_storage import SQLAuthRepository


@asynccontextmanager
async def lifespan(app: FastAPI):
    user_repository = getattr(app.state, "user_repository", None)
    session_repository = getattr(app.state, "session_repository", None)
    storage = None

    try:
        if (user_repository is None) != (session_repository is None):
            raise RuntimeError(
                "Configure both user_repository and session_repository together."
            )
        if user_repository is None:
            storage = SQLAuthRepository.from_environment()
            storage.initialize()
            app.state.user_repository = storage
            app.state.session_repository = storage

        yield
    finally:
        if storage is not None:
            if getattr(app.state, "user_repository", None) is storage:
                app.state.user_repository = None
            if getattr(app.state, "session_repository", None) is storage:
                app.state.session_repository = None
            storage.close()


app = FastAPI(
    title="DTU Academic Assistant API",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("WEB_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_request_id(
    request: Request, call_next: RequestResponseEndpoint
) -> Response:
    request_id = uuid4().hex
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


install_error_handlers(app)
app.include_router(api_router, prefix="/api/v1")
