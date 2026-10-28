"""Lọc bằng chứng trước khi đưa cho bước tạo câu trả lời.

Repository pgvector do Tài triển khai sẽ trả về các đoạn kèm trạng thái duyệt,
phiên bản và điểm tương đồng. Bộ lọc này không tự coi tài liệu là đáng tin:
trạng thái duyệt phải đến từ CSDL và quy trình quản trị tài liệu.
"""

from dataclasses import dataclass
from datetime import date
from math import isfinite
from typing import Iterable


@dataclass(frozen=True)
class EvidenceCandidate:
    chunk_id: str
    document_version_id: str
    title: str
    excerpt: str
    similarity: float
    approved: bool
    active: bool = True
    page: int | None = None
    section: str | None = None
    effective_date: date | None = None


def select_evidence(
    candidates: Iterable[EvidenceCandidate],
    *,
    minimum_similarity: float,
    today: date | None = None,
    limit: int = 2,
) -> list[EvidenceCandidate]:
    """Chỉ giữ đoạn đã duyệt, còn hiệu lực và đạt ngưỡng truy xuất."""
    if not 0 <= minimum_similarity <= 1:
        raise ValueError("minimum_similarity must be between 0 and 1")
    if limit < 1:
        raise ValueError("limit must be positive")
    today = today or date.today()
    # Lọc trước khi xếp hạng: điểm cao không được phép vượt qua điều kiện duyệt.
    # effective_date trong tương lai là chưa có hiệu lực; không suy đoán ngày
    # hết hiệu lực khi nguồn dữ liệu chưa cung cấp trường đó.
    eligible = (
        item for item in candidates
        if item.approved
        and item.active
        and item.chunk_id.strip()
        and item.document_version_id.strip()
        and item.title.strip()
        and item.excerpt.strip()
        and isfinite(item.similarity)
        and item.similarity >= minimum_similarity
        and (item.effective_date is None or item.effective_date <= today)
    )
    result: list[EvidenceCandidate] = []
    seen: set[str] = set()
    # Một chunk có thể xuất hiện nhiều lần từ các chiến lược truy xuất.
    # Chỉ lấy bản có điểm cao nhất và giữ giới hạn ngắn cho phần trích dẫn.
    for item in sorted(eligible, key=lambda item: item.similarity, reverse=True):
        if item.chunk_id not in seen:
            result.append(item)
            seen.add(item.chunk_id)
        if len(result) == limit:
            break
    return result
