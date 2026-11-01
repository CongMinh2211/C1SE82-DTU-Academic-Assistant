from datetime import UTC, datetime
from uuid import uuid4

import asyncio
import httpx

from app.main import app
from app.schemas.feedback import FeedbackStatus
from app.services.feedback import FeedbackMessageNotOwnedError


class MemoryRepository:
    def __init__(self):
        self.items = {}
        self.message_owner = {}

    def create_for_owner(self, feedback):
        if feedback.message_id and self.message_owner.get(feedback.message_id) != feedback.user_id:
            raise FeedbackMessageNotOwnedError()
        self.items[feedback.id] = feedback
        return feedback

    def get_for_owner(self, feedback_id, user_id):
        item = self.items.get(feedback_id)
        return item if item and item.user_id == user_id else None

    def list_for_owner(self, *, user_id, offset, limit):
        items = [x for x in self.items.values() if x.user_id == user_id]
        return items[offset:offset + limit], len(items)

    def list_for_admin(self, *, offset, limit):
        items = list(self.items.values())
        return items[offset:offset + limit], len(items)

    def resolve_pending(self, *, feedback_id, resolution, admin_id, resolved_at):
        item = self.items.get(feedback_id)
        if not item or item.status != FeedbackStatus.PENDING:
            return None
        item = item.model_copy(update={"status": FeedbackStatus.RESOLVED, "resolution": resolution,
                                       "resolved_by": admin_id, "resolved_at": resolved_at})
        self.items[feedback_id] = item
        return item


async def exercise_feedback():
    repo = MemoryRepository()
    owner_message, other_message = uuid4(), uuid4()
    repo.message_owner = {owner_message: "alice", other_message: "bob"}
    app.state.feedback_repository = repo
    app.state.principal_provider = lambda request: {"id": "alice", "role": "student"}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        payload = {"message_id": str(owner_message), "rating": 5, "category": "answer", "content": "Helpful answer"}
        try:
            assert (await client.post("/api/v1/feedback", json={**payload, "message_id": str(other_message)})).status_code == 404
            assert (await client.post("/api/v1/feedback", json={**payload, "rating": 6})).status_code == 422
            assert (await client.post("/api/v1/feedback", json={**payload, "rating": True})).status_code == 422
            created = await client.post("/api/v1/feedback", json=payload)
            assert created.status_code == 201
            feedback_id = created.json()["id"]
            assert (await client.get("/api/v1/feedback")).json()["total"] == 1
            assert (await client.get("/api/v1/feedback/" + feedback_id)).status_code == 200
            assert (await client.get("/api/v1/admin/feedback")).status_code == 403
            app.state.principal_provider = lambda request: {"id": "bob", "role": "student"}
            assert (await client.get("/api/v1/feedback/" + feedback_id)).status_code == 404
            assert (await client.get("/api/v1/feedback")).json()["total"] == 0
            app.state.principal_provider = lambda request: {"id": "admin", "role": "admin"}
            assert (await client.get("/api/v1/admin/feedback")).json()["total"] == 1
            response = await client.patch("/api/v1/admin/feedback/" + feedback_id, json={"resolution": "Reviewed and resolved"})
            assert response.status_code == 200
            assert response.json()["status"] == "resolved"
            assert (await client.patch("/api/v1/admin/feedback/" + feedback_id, json={"resolution": "Reviewed again"})).status_code == 409
        finally:
            del app.state.feedback_repository
            del app.state.principal_provider


async def exercise_missing_adapters():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        payload = {"rating": 4, "category": "answer", "content": "Useful feedback"}
        assert (await client.post("/api/v1/feedback", json=payload)).status_code == 503
        app.state.principal_provider = lambda request: {"id": "alice", "role": "student"}
        try:
            assert (await client.post("/api/v1/feedback", json=payload)).status_code == 503
        finally:
            del app.state.principal_provider


def test_feedback_ownership_validation_and_admin_review():
    asyncio.run(exercise_feedback())


def test_feedback_fails_closed_without_adapters():
    asyncio.run(exercise_missing_adapters())
