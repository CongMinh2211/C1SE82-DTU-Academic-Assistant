"""Consistent API errors without returning validation input or server details."""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class APIError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unavailable")


def _response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: Any | None = None,
) -> JSONResponse:
    request_id = _request_id(request)
    error: dict[str, Any] = {
        "code": code,
        "message": message,
        "request_id": request_id,
    }
    error["details"] = details if details is not None else []
    return JSONResponse(
        status_code=status_code,
        content={"error": error},
        headers={"X-Request-ID": request_id},
    )


def _validation_message(error_type: str) -> str:
    messages = {
        "extra_forbidden": "Trường này không được hỗ trợ.",
        "greater_than": "Giá trị nằm ngoài giới hạn cho phép.",
        "greater_than_equal": "Giá trị nhỏ hơn mức tối thiểu.",
        "int_parsing": "Giá trị phải là số nguyên.",
        "less_than_equal": "Giá trị vượt mức tối đa.",
        "missing": "Trường này là bắt buộc.",
        "string_too_long": "Giá trị vượt quá độ dài tối đa.",
        "string_too_short": "Giá trị ngắn hơn độ dài tối thiểu.",
    }
    return messages.get(error_type, "Giá trị không hợp lệ.")


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def handle_api_error(request: Request, exc: APIError) -> JSONResponse:
        return _response(
            request,
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            details=exc.details,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = [
            {
                "field": ".".join(str(part) for part in error["loc"]),
                "message": _validation_message(str(error["type"])),
            }
            for error in exc.errors()
        ]
        return _response(
            request,
            status_code=422,
            code="validation_error",
            message="Dữ liệu yêu cầu chưa hợp lệ.",
            details=details,
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        messages = {
            401: ("unauthorized", "Vui lòng đăng nhập để tiếp tục."),
            403: ("forbidden", "Bạn không có quyền thực hiện thao tác này."),
            404: ("not_found", "Không tìm thấy API yêu cầu."),
            405: ("method_not_allowed", "Phương thức yêu cầu không được hỗ trợ."),
        }
        if exc.status_code >= 500:
            code, message = ("internal_error", "Hệ thống chưa thể xử lý yêu cầu.")
        else:
            code, message = messages.get(
                exc.status_code, ("request_error", "Yêu cầu chưa thể xử lý.")
            )
        if exc.status_code < 500 and isinstance(exc.detail, str):
            message = exc.detail
        return _response(
            request,
            status_code=exc.status_code,
            code=code,
            message=message,
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled API error (request_id=%s)", _request_id(request))
        return _response(
            request,
            status_code=500,
            code="internal_error",
            message="Hệ thống chưa thể xử lý yêu cầu.",
        )
