"""Admin dashboard and audit routes. TODO (Tài): role checks."""

from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])
