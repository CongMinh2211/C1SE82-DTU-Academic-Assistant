"""Authentication routes. TODO (Tài): confirm DTU/demo identity and access rules."""

from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])
