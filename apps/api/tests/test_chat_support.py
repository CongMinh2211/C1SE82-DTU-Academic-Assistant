from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.api.v1.endpoints.chat import get_candidate_provider
from app.main import app
from app.rag.grounding import EvidenceCandidate, select_evidence


def candidate(**changes: object) -> EvidenceCandidate:
    fields = dict(
        chunk_id="chunk-1",
        document_version_id="version-1",
        title="Quy định học vụ đã duyệt",
        excerpt="Đoạn trích nguyên văn để sinh viên đối chiếu.",
        similarity=0.86,
        approved=True,
        page=12,
        section="Mục 4.2",
    )
    fields.update(changes)
    return EvidenceCandidate(**fields)


def test_evidence_gate_rejects_unapproved_inactive_and_future_versions() -> None:
    # Điểm tương đồng rất cao vẫn không được vượt trạng thái duyệt/hiệu lực.
    items = [
        candidate(chunk_id="draft", approved=False, similarity=0.99),
        candidate(chunk_id="old", active=False, similarity=0.98),
        candidate(chunk_id="future", effective_date=date.today() + timedelta(days=1)),
        candidate(chunk_id="weak", similarity=0.2),
        candidate(),
        candidate(chunk_id="chunk-1", similarity=0.82),
    ]
    assert [item.chunk_id for item in select_evidence(items, minimum_similarity=0.72)] == [
        "chunk-1"
    ]


def test_chat_is_off_by_default(monkeypatch) -> None:
    monkeypatch.delenv("ENABLE_CHAT_PREVIEW", raising=False)
    response = TestClient(app).post("/api/v1/chat/ask", json={"question": "Học phí ở đâu?"})
    assert response.status_code == 503


def test_chat_falls_back_without_approved_evidence(monkeypatch) -> None:
    monkeypatch.setenv("ENABLE_CHAT_PREVIEW", "true")
    response = TestClient(app).post("/api/v1/chat/ask", json={"question": "Học phí ở đâu?"})
    assert response.status_code == 200
    assert response.json()["fallback"] is True
    assert response.json()["citations"] == []


def test_chat_only_displays_approved_excerpt_with_version(monkeypatch) -> None:
    # Provider giả mô phỏng kết quả pgvector để test ranh giới giữa truy xuất
    # và trả lời, không cần kết nối CSDL thật trong unit test.
    class Provider:
        def search(self, question: str, *, limit: int) -> list[EvidenceCandidate]:
            assert question == "Điều kiện học phần?"
            assert limit == 5
            return [
                candidate(chunk_id="unapproved", approved=False, excerpt="Nội dung sai"),
                candidate(),
            ]

    monkeypatch.setenv("ENABLE_CHAT_PREVIEW", "true")
    app.dependency_overrides[get_candidate_provider] = Provider
    try:
        response = TestClient(app).post(
            "/api/v1/chat/ask", json={"question": "  Điều kiện   học phần?  "}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert body["fallback"] is False
    assert "Nội dung sai" not in body["answer"]
    assert body["citations"][0]["document_version_id"] == "version-1"
    assert body["citations"][0]["page"] == 12


def test_chat_rejects_blank_question(monkeypatch) -> None:
    monkeypatch.setenv("ENABLE_CHAT_PREVIEW", "true")
    response = TestClient(app).post("/api/v1/chat/ask", json={"question": "     "})
    assert response.status_code == 422
