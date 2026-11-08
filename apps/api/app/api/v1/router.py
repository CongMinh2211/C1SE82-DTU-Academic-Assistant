from fastapi import APIRouter

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.chat import router as chat_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(chat_router)

# Chỉ đưa thêm router tính năng khi đã có kiểm tra đầu vào, phân quyền và test.
