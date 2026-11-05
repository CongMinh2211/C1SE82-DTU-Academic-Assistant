from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.faqs import FaqRecord, FaqStatus
from app.services.faqs import FaqSourceNotFoundError, FaqSourceNotPublishableError


class MemoryFaqRepository:
    """Contract test double for FAQ routes; no external database is used."""

    def __init__(self):
        self.items = {}
        self.sources = {
            "active-source": (True, True),
            "inactive-source": (False, True),
            "unapproved-source": (True, False),
        }

    def _is_public(self, faq):
        if faq.status is not FaqStatus.PUBLISHED or faq.source_id is None:
            return False
        return self.sources.get(faq.source_id) == (True, True)

    def _public_items(self, topic):
        return [
            faq for faq in self.items.values()
            if self._is_public(faq) and (topic is None or faq.topic == topic)
        ]

    def count_published(self, *, topic):
        return len(self._public_items(topic))

    def list_published(self, *, topic, offset, limit):
        return self._public_items(topic)[offset:offset + limit]

    def get_published(self, faq_id):
        faq = self.items.get(faq_id)
        return faq if faq is not None and self._is_public(faq) else None

    def get_any(self, faq_id):
        return self.items.get(faq_id)

    def save(self, faq, *, require_publishable_source):
        if faq.source_id is not None and faq.source_id not in self.sources:
            raise FaqSourceNotFoundError()
        if require_publishable_source and self.sources.get(faq.source_id) != (True, True):
            raise FaqSourceNotPublishableError()
        self.items[faq.id] = faq
        return faq

    def delete(self, faq_id):
        return self.items.pop(faq_id, None) is not None

    def seed(self, *, question, topic="Tuition", status=FaqStatus.PUBLISHED,
             source_id="active-source"):
        now = datetime.now(UTC)
        faq = FaqRecord(
            id=str(uuid4()), question=question, answer="Approved test answer.",
            topic=topic, source_id=source_id, status=status,
            created_at=now, updated_at=now, updated_by="admin-1",
        )
        self.items[faq.id] = faq
        return faq


@pytest.fixture
def api(monkeypatch):
    repository = MemoryFaqRepository()
    monkeypatch.setattr(app.state, "faq_repository", repository, raising=False)
    monkeypatch.setattr(
        app.state,
        "principal_provider",
        lambda request: {"id": "student-1", "role": "student"},
        raising=False,
    )
    with TestClient(app) as client:
        yield client, repository


def admin(monkeypatch):
    monkeypatch.setattr(
        app.state,
        "principal_provider",
        lambda request: {"id": "admin-1", "role": "admin"},
        raising=False,
    )


def payload(**overrides):
    value = {
        "question": "How do I register?",
        "answer": "Follow the registration steps.",
        "topic": "Tuition",
        "status": "draft",
    }
    value.update(overrides)
    return value


def assert_request_id(response):
    body = response.json()
    request_id = response.headers["X-Request-ID"]
    assert request_id
    assert body["error"]["request_id"] == request_id


def test_public_list_filters_published_faqs_and_paginates(api):
    client, repository = api
    first = repository.seed(question="Tuition due date")
    repository.seed(question="Tuition payment method")
    repository.seed(question="Draft question", status=FaqStatus.DRAFT)
    repository.seed(question="Inactive source", source_id="inactive-source")
    repository.seed(question="Different topic", topic="Grades")

    response = client.get("/api/v1/faqs?topic=%20Tuition%20&page=1&page_size=1")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["page_size"] == 1
    assert [item["id"] for item in body["items"]] == [first.id]

    next_page = client.get("/api/v1/faqs?topic=Tuition&page=2&page_size=1")
    assert next_page.status_code == 200
    assert next_page.json()["total"] == 2
    assert next_page.json()["items"][0]["id"] != first.id


def test_public_get_hides_draft_and_unknown_faqs(api):
    client, repository = api
    published = repository.seed(question="Published FAQ")
    draft = repository.seed(question="Draft FAQ", status=FaqStatus.DRAFT)

    assert client.get(f"/api/v1/faqs/{published.id}").status_code == 200
    assert client.get(f"/api/v1/faqs/{draft.id}").status_code == 404
    missing = client.get(f"/api/v1/faqs/{uuid4()}")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "faq_not_found"
    assert_request_id(missing)


def test_student_cannot_create_update_or_delete_faqs(api):
    client, repository = api
    existing = repository.seed(question="Published FAQ")

    create = client.post("/api/v1/faqs", json=payload())
    update = client.put(f"/api/v1/faqs/{existing.id}", json=payload())
    delete = client.delete(f"/api/v1/faqs/{existing.id}")

    assert [create.status_code, update.status_code, delete.status_code] == [403, 403, 403]
    for response in (create, update, delete):
        assert response.json()["error"]["code"] == "forbidden"
        assert_request_id(response)


def test_admin_can_create_draft_and_publish_only_with_active_approved_source(api, monkeypatch):
    client, _ = api
    admin(monkeypatch)

    draft = client.post("/api/v1/faqs", json=payload(
        question="  How do I register?  ",
        answer="  Follow the registration steps.  ",
        topic="  Tuition  ",
    ))
    assert draft.status_code == 201
    assert draft.json()["status"] == "draft"
    assert draft.json()["question"] == "How do I register?"
    assert draft.json()["topic"] == "Tuition"

    missing_source = client.post("/api/v1/faqs", json=payload(status="published"))
    assert missing_source.status_code == 422
    assert missing_source.json()["error"]["code"] == "faq_source_required"

    unknown_source = client.post("/api/v1/faqs", json=payload(
        status="published", source_id="missing-source",
    ))
    assert unknown_source.status_code == 422
    assert unknown_source.json()["error"]["code"] == "faq_source_not_found"

    inactive_source = client.post("/api/v1/faqs", json=payload(
        status="published", source_id="inactive-source",
    ))
    assert inactive_source.status_code == 409
    assert inactive_source.json()["error"]["code"] == "faq_source_not_publishable"

    published = client.post("/api/v1/faqs", json=payload(
        status="published", source_id="active-source",
    ))
    assert published.status_code == 201
    assert published.json()["status"] == "published"
    assert published.json()["source_id"] == "active-source"


def test_admin_update_and_delete_are_scoped_to_existing_faqs(api, monkeypatch):
    client, repository = api
    admin(monkeypatch)
    existing = repository.seed(question="Draft FAQ", status=FaqStatus.DRAFT)

    updated = client.put(
        f"/api/v1/faqs/{existing.id}",
        json=payload(question="Updated question", topic="Grades"),
    )
    assert updated.status_code == 200
    assert updated.json()["id"] == existing.id
    assert updated.json()["question"] == "Updated question"

    missing_id = str(uuid4())
    missing_update = client.put(f"/api/v1/faqs/{missing_id}", json=payload())
    missing_delete = client.delete(f"/api/v1/faqs/{missing_id}")
    assert missing_update.status_code == 404
    assert missing_delete.status_code == 404

    deleted = client.delete(f"/api/v1/faqs/{existing.id}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/faqs/{existing.id}").status_code == 404


def test_validation_and_request_id_error_envelope(api, monkeypatch):
    client, _ = api
    admin(monkeypatch)

    extra_field = client.post("/api/v1/faqs", json=payload(unexpected="rejected"))
    assert extra_field.status_code == 422
    assert extra_field.json()["error"]["code"] == "validation_error"
    assert any(
        detail["field"].endswith("unexpected")
        for detail in extra_field.json()["error"]["details"]
    )
    assert_request_id(extra_field)

    invalid_page = client.get("/api/v1/faqs?page=0&page_size=101")
    assert invalid_page.status_code == 422
    assert invalid_page.json()["error"]["code"] == "validation_error"
    assert_request_id(invalid_page)


def test_faq_routes_fail_closed_without_repository(api, monkeypatch):
    client, _ = api
    monkeypatch.setattr(app.state, "faq_repository", None, raising=False)

    response = client.get("/api/v1/faqs")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "faq_storage_unavailable"
    assert_request_id(response)


def test_admin_route_fails_closed_without_auth_provider(api, monkeypatch):
    client, _ = api
    monkeypatch.setattr(app.state, "principal_provider", None, raising=False)

    response = client.post("/api/v1/faqs", json=payload())

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "authorization_unavailable"
    assert_request_id(response)
