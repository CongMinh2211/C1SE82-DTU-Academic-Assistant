"""Kiểm tra cổng bằng chứng của API preview trên nhánh Minh.

Các test này chỉ bảo vệ phần scaffold đã có trên Git. Bộ kiểm thử tích hợp
PostgreSQL/pgvector của ứng dụng BE đầy đủ được lưu thành evidence riêng và
chỉ chạy lại sau khi source BE được đưa lên Git theo đúng phạm vi của nhóm.
"""

from math import inf, nan

import pytest

from app.rag.grounding import EvidenceCandidate, select_evidence
from app.services.chat_support import answer_from_evidence


def candidate(chunk_id: str, **changes: object) -> EvidenceCandidate:
    fields = {
        "chunk_id": chunk_id,
        "document_version_id": "version-approved",
        "title": "Quy định học vụ DTU",
        "excerpt": "Điều kiện học vụ được ghi trong tài liệu đã duyệt.",
        "similarity": 0.85,
        "approved": True,
        "active": True,
    }
    fields.update(changes)
    return EvidenceCandidate(**fields)


@pytest.mark.parametrize("score", [nan, inf, -inf])
def test_non_finite_score_never_becomes_a_citation(score: float) -> None:
    # Điểm lỗi từ tầng truy xuất không được biến thành trích dẫn đáng tin.
    answer = answer_from_evidence([candidate("bad", similarity=score)], minimum_similarity=0.72)
    assert answer.fallback is True
    assert answer.citations == []


def test_duplicate_chunk_keeps_best_score_once() -> None:
    # Truy xuất nhiều chiến lược có thể trả về cùng chunk; chỉ trích dẫn một lần.
    selected = select_evidence(
        [candidate("same", similarity=0.79), candidate("same", similarity=0.91)],
        minimum_similarity=0.72,
    )
    assert len(selected) == 1
    assert selected[0].similarity == 0.91


def test_unapproved_result_cannot_displace_approved_result() -> None:
    selected = select_evidence(
        [candidate("draft", approved=False, similarity=0.99), candidate("approved")],
        minimum_similarity=0.72,
    )
    assert [item.chunk_id for item in selected] == ["approved"]
