from fastapi import APIRouter

from app.api.v1.endpoints.faqs import router as faq_router

api_router = APIRouter()
api_router.include_router(faq_router)
